import { NextResponse } from "next/server";
import { generateAndStoreSizeChart } from "@/lib/size-guide-chart";
import { SUPPORTED_LOCALES } from "@/app/config/resourceFields";

/**
 * POST /api/size-guide/generate
 *
 * Genera (o regenera) la imagen PNG de la guía de tallas para una combinación
 * de parámetros dada. Si no se indica locale, genera para todos los idiomas.
 *
 * Body JSON:
 *   - referenceId: (string) requerido
 *   - supplier: (string|number) opcional
 *   - gender: (string|number) opcional
 *   - locale: (string) opcional — si no se indica, genera para todos los idiomas
 *   - force: (boolean) forzar regeneración aunque los datos no hayan cambiado
 *
 * Ejemplo:
 *   POST /api/size-guide/generate
 *   { "referenceId": "TOPS", "supplier": "Nike", "gender": "Mujer", "locale": "es" }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { referenceId, supplier, gender, locale, force = false } = body;

    if (!referenceId) {
      return NextResponse.json(
        { error: "El parámetro 'referenceId' es requerido" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const apiKey = process.env.API_KEY || "";
    const apiSecret = process.env.API_SECRET || "";

    const locales = locale
      ? [locale]
      : SUPPORTED_LOCALES.map((l) => l.code);

    const results = [];

    for (const loc of locales) {
      const params = new URLSearchParams();
      params.set("referenceId", referenceId);
      if (supplier) params.set("supplier", String(supplier));
      if (gender) params.set("gender", String(gender));
      params.set("locale", loc);

      const sizeGuideResponse = await fetch(
        `${baseUrl}/api/size-guide?${params.toString()}`,
        {
          headers: {
            "x-api-key": apiKey,
            "x-api-secret": apiSecret,
          },
        }
      );

      if (!sizeGuideResponse.ok) {
        const err = await sizeGuideResponse.json().catch(() => ({}));
        results.push({ locale: loc, status: "error", details: err });
        continue;
      }

      const sizeGuideData = await sizeGuideResponse.json();

      if (!sizeGuideData?.columns?.length || !sizeGuideData?.rows?.length) {
        results.push({ locale: loc, status: "skipped", reason: "no_data" });
        continue;
      }

      const result = await generateAndStoreSizeChart(
        sizeGuideData,
        {
          referenceId,
          supplierId: sizeGuideData.supplierId,
          genderId: sizeGuideData.genderId,
          locale: loc,
        },
        { force }
      );

      results.push({
        locale: loc,
        ...result,
        supplier: sizeGuideData.supplier,
        gender: sizeGuideData.gender,
      });
    }

    return NextResponse.json({
      success: true,
      referenceId,
      locales,
      results,
    });
  } catch (error) {
    console.error("Error en POST /api/size-guide/generate:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/size-guide/generate?referenceId=X&supplier=Y&gender=Z&locale=L
 *
 * Variante GET para disparar la generación vía query params (útil desde el navegador).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const body = {
    referenceId: searchParams.get("referenceId"),
    supplier: searchParams.get("supplier"),
    gender: searchParams.get("gender"),
    locale: searchParams.get("locale"),
    force: searchParams.get("force") === "true",
  };

  const fakeRequest = {
    json: async () => body,
  };

  return POST(fakeRequest);
}
