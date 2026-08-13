import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateAndStoreSizeChart } from "@/lib/size-guide-chart";
import { SUPPORTED_LOCALES } from "@/app/config/resourceFields";

const CONCURRENCY = 3;

async function processCombo(combo, { baseUrl, apiKey, apiSecret, force }) {
  const { locale } = combo;

  const params = new URLSearchParams();
  params.set("referenceId", combo.referenceId);
  if (combo.supplierId) params.set("supplier", String(combo.supplierId));
  if (combo.genderId) params.set("gender", String(combo.genderId));
  if (locale) params.set("locale", locale);

  const response = await fetch(
    `${baseUrl}/api/size-guide?${params.toString()}`,
    {
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
    }
  );

  if (!response.ok) {
    return { ...combo, status: "error", reason: `API returned ${response.status}` };
  }

  const sizeGuideData = await response.json();

  if (!sizeGuideData?.columns?.length || !sizeGuideData?.rows?.length) {
    return { ...combo, status: "skipped", reason: "no_data" };
  }

  const result = await generateAndStoreSizeChart(
    sizeGuideData,
    {
      referenceId: combo.referenceId,
      supplierId: sizeGuideData.supplierId,
      genderId: sizeGuideData.genderId,
      locale,
    },
    { force }
  );

  if (result.regenerated) {
    return { ...combo, status: "generated", url: result.url };
  }
  return { ...combo, status: "skipped", reason: result.reason, url: result.url };
}

/**
 * POST /api/size-guide/generate-all
 *
 * Genera imágenes para TODAS las combinaciones de guías de tallas existentes,
 * iterando sobre todos los idiomas soportados (SUPPORTED_LOCALES).
 * Procesa en batches paralelos de 3 para mayor velocidad.
 *
 * Body JSON (opcional):
 *   - force: (boolean) forzar regeneración aunque los datos no hayan cambiado
 *   - locale: (string) generar solo para un locale específico (si no se indica, genera para todos)
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { force = false, locale = null, limit = 0 } = body;

    const categories = await prisma.category.findMany({
      where: { sizes: { some: {} } },
      include: {
        supplier: true,
        gender: true,
        intCategories: { select: { referenceId: true } },
      },
    });

    const unique = new Map();
    for (const cat of categories) {
      for (const intCat of cat.intCategories) {
        const key = `${intCat.referenceId}|${cat.supplierId || 0}|${cat.genderId || 0}`;
        if (!unique.has(key)) {
          unique.set(key, {
            referenceId: intCat.referenceId,
            supplierId: cat.supplierId,
            genderId: cat.genderId,
            supplierName: cat.supplier?.name || null,
            genderName: cat.gender?.name || null,
          });
        }
      }
    }

    const allCombos = Array.from(unique.values());
    const baseCombos = limit > 0 ? allCombos.slice(0, limit) : allCombos;

    const locales = locale
      ? [locale]
      : SUPPORTED_LOCALES.map((l) => l.code);

    const combos = baseCombos.flatMap((combo) =>
      locales.map((loc) => ({ ...combo, locale: loc }))
    );

    const total = combos.length;

    console.log(
      `[generate-all] Iniciando generación de ${total} imágenes ` +
      `(${baseCombos.length} combos × ${locales.length} idiomas, force=${force})`
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const apiKey = process.env.API_KEY || "";
    const apiSecret = process.env.API_SECRET || "";
    const opts = { baseUrl, apiKey, apiSecret, force };

    const results = [];
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < total; i += CONCURRENCY) {
      const batch = combos.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((combo) => processCombo(combo, opts))
      );

      for (const settled of batchResults) {
        if (settled.status === "fulfilled") {
          const r = settled.value;
          results.push(r);
          if (r.status === "generated") generated++;
          else if (r.status === "skipped") skipped++;
          else errors++;
        } else {
          errors++;
          results.push({ status: "error", reason: settled.reason?.message || "Unknown" });
        }
      }

      console.log(
        `[generate-all] Progreso: ${Math.min(i + CONCURRENCY, total)}/${total} ` +
        `(${generated} generadas, ${skipped} sin cambios, ${errors} errores)`
      );
    }

    console.log(
      `[generate-all] Completado: ${generated} generadas, ${skipped} sin cambios, ${errors} errores`
    );

    return NextResponse.json({
      success: true,
      summary: {
        total,
        totalBaseCombos: allCombos.length,
        locales,
        generated,
        skipped,
        errors,
        force,
        limit: limit || "all",
        locale: locale || "all",
      },
      results,
    });
  } catch (error) {
    console.error("Error en POST /api/size-guide/generate-all:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
