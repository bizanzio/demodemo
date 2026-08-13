import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/minio";
import { generateSizeChartPNG } from "@/lib/size-guide-image";
import { SUPPORTED_LOCALES } from "@/app/config/resourceFields";

const UPSERT_RETRY_LIMIT = 3;
const UPSERT_RETRY_DELAY_MS = 120;
const SIZE_GUIDE_FETCH_TIMEOUT_MS = 20000;

// Cola en memoria para evitar tormentas de regeneración en operaciones masivas.
const pendingCategoryRegenerations = new Set();
let isRegenerationQueueRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecordChangedError(error) {
  const message = String(error?.message || "");
  return (
    message.includes("Record has changed since last read") ||
    message.includes("MysqlError { code: 1020")
  );
}

function queueCategoryForRegeneration(categoryId) {
  const numericId = Number(categoryId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return;
  }

  pendingCategoryRegenerations.add(numericId);
  void processRegenerationQueue();
}

async function processRegenerationQueue() {
  if (isRegenerationQueueRunning) return;
  isRegenerationQueueRunning = true;

  try {
    while (pendingCategoryRegenerations.size > 0) {
      const iterator = pendingCategoryRegenerations.values().next();
      const categoryId = iterator.value;
      pendingCategoryRegenerations.delete(categoryId);

      try {
        await regenerateChartsForCategory(categoryId);
      } catch (error) {
        console.error(
          `[ChartQueue] Error regenerando categoría ${categoryId}:`,
          error?.message || error
        );
      }
    }
  } finally {
    isRegenerationQueueRunning = false;
    // Si se añadieron nuevas categorías justo al cerrar, relanzar la cola.
    if (pendingCategoryRegenerations.size > 0) {
      void processRegenerationQueue();
    }
  }
}

export function enqueueChartRegenerationForCategory(categoryId) {
  queueCategoryForRegeneration(categoryId);
}

export function enqueueChartRegenerationForCategories(categoryIds = []) {
  for (const categoryId of categoryIds) {
    queueCategoryForRegeneration(categoryId);
  }
}

/**
 * Computa un hash SHA-256 determinista de los datos relevantes de la guía.
 * Se usa para detectar si los datos cambiaron y hay que regenerar la imagen.
 */
function computeDataHash(sizeGuideData) {
  const { columns, rows, sizeSystems, defaultSystem, supplier, gender, title, locale } =
    sizeGuideData;

  const payload = JSON.stringify({
    title,
    supplier,
    gender,
    defaultSystem,
    locale: locale || null,
    columns: columns?.map((c) => ({
      originalSize: c.originalSize,
      sizeId: c.sizeId,
    })),
    rows: rows?.map((r) => ({
      systemName: r.systemName,
      values: r.values?.map((v) => v.value),
    })),
    sizeSystems: sizeSystems?.map((s) => ({
      id: s.id,
      systemName: s.systemName,
    })),
  });

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Genera (o regenera) la imagen de la guía de tallas para una combinación dada.
 *
 * @param {Object} sizeGuideData - Respuesta completa del endpoint GET /api/size-guide
 * @param {Object} params - { referenceId, supplierId, genderId, locale }
 * @param {Object} options - { force: boolean } - Si true, regenera aunque el hash coincida
 * @returns {Promise<{ url: string, regenerated: boolean }>}
 */
export async function generateAndStoreSizeChart(
  sizeGuideData,
  { referenceId, supplierId = null, genderId = null, locale = null },
  { force = false } = {}
) {
  if (!sizeGuideData?.columns?.length || !sizeGuideData?.rows?.length) {
    return { url: null, regenerated: false, reason: "no_data" };
  }

  const safeSupplierId = supplierId || 0;
  const safeGenderId = genderId || 0;
  const safeLocale = locale || "";

  const dataHash = computeDataHash(sizeGuideData);

  const existing = await prisma.sizeGuideChart.findUnique({
    where: {
      referenceId_supplierId_genderId_locale: {
        referenceId,
        supplierId: safeSupplierId,
        genderId: safeGenderId,
        locale: safeLocale,
      },
    },
  });

  if (existing && existing.dataHash === dataHash && !force) {
    return { url: existing.url, regenerated: false, reason: "hash_match" };
  }

  const pngBuffer = await generateSizeChartPNG(sizeGuideData);
  const previousMinioKey = existing?.minioKey || null;

  const folder = `size-guides/${referenceId}/${supplierId ?? "all"}/${genderId ?? "all"}`;
  const { url, key: actualMinioKey } = await uploadFile(
    pngBuffer,
    `${locale || "default"}.png`,
    "image/png",
    folder
  );
  const minioKey = actualMinioKey;

  let lastError = null;
  for (let attempt = 1; attempt <= UPSERT_RETRY_LIMIT; attempt++) {
    try {
      await prisma.sizeGuideChart.upsert({
        where: {
          referenceId_supplierId_genderId_locale: {
            referenceId,
            supplierId: safeSupplierId,
            genderId: safeGenderId,
            locale: safeLocale,
          },
        },
        update: {
          url,
          minioKey,
          dataHash,
        },
        create: {
          referenceId,
          supplierId: safeSupplierId,
          genderId: safeGenderId,
          locale: safeLocale,
          url,
          minioKey,
          dataHash,
        },
      });

      if (previousMinioKey && previousMinioKey !== minioKey) {
        try {
          await deleteFile(previousMinioKey);
        } catch (err) {
          console.warn(
            "No se pudo eliminar imagen anterior de MinIO:",
            err.message
          );
        }
      }

      return { url, regenerated: true, reason: "generated" };
    } catch (error) {
      lastError = error;
      if (!isRecordChangedError(error) || attempt === UPSERT_RETRY_LIMIT) {
        break;
      }

      // Otro proceso actualizo la fila; esperamos y reintentamos.
      await sleep(UPSERT_RETRY_DELAY_MS * attempt);
    }
  }

  if (minioKey) {
    try {
      await deleteFile(minioKey);
    } catch (cleanupError) {
      console.warn(
        "No se pudo limpiar imagen nueva tras fallo en upsert:",
        cleanupError.message
      );
    }
  }

  throw lastError;
}

/**
 * Busca la URL de la imagen de guía de tallas para una combinación dada.
 * Cadena de fallback: locale solicitado → "" (legacy) → "es" (default).
 * @returns {Promise<string|null>}
 */
export async function getSizeChartUrl(
  referenceId,
  supplierId = null,
  genderId = null,
  locale = null
) {
  const sid = supplierId || 0;
  const gid = genderId || 0;
  const requested = locale || "";

  const findByLocale = (loc) =>
    prisma.sizeGuideChart.findUnique({
      where: {
        referenceId_supplierId_genderId_locale: {
          referenceId,
          supplierId: sid,
          genderId: gid,
          locale: loc,
        },
      },
      select: { url: true },
    });

  let chart = await findByLocale(requested);
  if (chart?.url) return chart.url;

  if (requested !== "") {
    chart = await findByLocale("");
    if (chart?.url) return chart.url;
  }

  if (requested !== "es") {
    chart = await findByLocale("es");
    if (chart?.url) return chart.url;
  }

  return null;
}

/**
 * Dado un categoryId, encuentra todas las combinaciones de IntCategory + supplier + gender
 * que deben regenerar su imagen de guía de tallas.
 *
 * @param {number} categoryId
 * @returns {Promise<Array<{ referenceId: string, supplierId: number|null, genderId: number|null }>>}
 */
export async function findAffectedCombinations(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      intCategories: { select: { referenceId: true } },
    },
  });

  if (!category) return [];

  return category.intCategories.map((intCat) => ({
    referenceId: intCat.referenceId,
    supplierId: category.supplierId,
    genderId: category.genderId,
  }));
}

/**
 * Regenera las imágenes de todas las combinaciones afectadas por un cambio
 * en una categoría dada, para todos los idiomas soportados.
 * Se usa como hook post-mutación en el CRUD.
 *
 * @param {number} categoryId
 * @param {string|null} locale - Si se indica, regenera solo ese locale; si null, regenera todos
 */
export async function regenerateChartsForCategory(
  categoryId,
  locale = null
) {
  const combinations = await findAffectedCombinations(categoryId);
  const locales = locale
    ? [locale]
    : SUPPORTED_LOCALES.map((l) => l.code);

  const results = [];
  for (const combo of combinations) {
    for (const loc of locales) {
      try {
        const sizeGuideData = await fetchSizeGuideData(
          combo.referenceId,
          combo.supplierId,
          combo.genderId,
          loc
        );

        if (sizeGuideData) {
          const result = await generateAndStoreSizeChart(sizeGuideData, {
            referenceId: combo.referenceId,
            supplierId: combo.supplierId,
            genderId: combo.genderId,
            locale: loc,
          });
          results.push({ ...combo, locale: loc, ...result });
        }
      } catch (err) {
        console.error(
          `Error regenerando chart para ${combo.referenceId}/${combo.supplierId}/${combo.genderId}/${loc}:`,
          err.message
        );
        results.push({ ...combo, locale: loc, error: err.message });
      }
    }
  }

  return results;
}

/**
 * Obtiene los datos de la guía de tallas usando la misma lógica que el endpoint.
 * Reutiliza la lógica interna llamando al API internamente (fetch local).
 */
async function fetchSizeGuideData(
  referenceId,
  supplierId,
  genderId,
  locale
) {
  const params = new URLSearchParams();
  params.set("referenceId", referenceId);
  if (supplierId) params.set("supplier", String(supplierId));
  if (genderId) params.set("gender", String(genderId));
  if (locale) params.set("locale", locale);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const apiKey = process.env.API_KEY || "";
  const apiSecret = process.env.API_SECRET || "";

  const url = `${baseUrl}/api/size-guide?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SIZE_GUIDE_FETCH_TIMEOUT_MS
  );

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Timeout de ${SIZE_GUIDE_FETCH_TIMEOUT_MS}ms al consultar /api/size-guide`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) return null;

  const data = await response.json();
  if (!data?.columns?.length || !data?.rows?.length) return null;

  return data;
}
