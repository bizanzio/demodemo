import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";

let fontDataCache = null;

function getFontData() {
  if (fontDataCache) return fontDataCache;

  const paths = [
    join(process.cwd(), "public", "fonts", "Inter-Regular.woff"),
    join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
    join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-400-normal.woff"),
  ];

  for (const p of paths) {
    try {
      fontDataCache = readFileSync(p);
      return fontDataCache;
    } catch {
      // next path
    }
  }
  return null;
}

let fontBoldCache = null;

function getFontBoldData() {
  if (fontBoldCache) return fontBoldCache;

  const paths = [
    join(process.cwd(), "public", "fonts", "Inter-Bold.woff"),
    join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"),
    join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff"),
  ];

  for (const p of paths) {
    try {
      fontBoldCache = readFileSync(p);
      return fontBoldCache;
    } catch {
      // next path
    }
  }
  return null;
}

const ORIGINAL_SIZE_LABELS = {
  es: "Talla original",
  ca: "Talla original",
  en: "Original size",
  it: "Taglia originale",
  fr: "Taille originale",
  de: "Originalgröße",
};

function getOriginalSizeLabel(locale) {
  return ORIGINAL_SIZE_LABELS[locale] || ORIGINAL_SIZE_LABELS.es;
}

/**
 * Construye el JSX (satori-compatible) para la tabla de guía de tallas.
 * Genera una tabla limpia que replica fielmente la grilla HTML de la ficha.
 */
function buildSizeGuideJSX(sizeGuideData) {
  const { columns, rows, locale } = sizeGuideData;

  const headerBg = "#1e293b";
  const headerText = "#ffffff";
  const borderColor = "#e5e7eb";

  const originalSizeLabel = getOriginalSizeLabel(locale);

  const tableRows = rows.map((row) => ({
    systemName: row.systemName,
    values: row.values.map((v) => v.value || "-"),
  }));

  const numSystems = tableRows.length;
  const firstColWidth = 140;
  const colWidth = Math.max(80, Math.min(130, 700 / Math.max(numSystems, 1)));

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: "#ffffff",
        fontFamily: "Inter, sans-serif",
      },
      children: [
        // Header row
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              backgroundColor: headerBg,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: `${firstColWidth}px`,
                    minWidth: `${firstColWidth}px`,
                    padding: "14px 20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: headerText,
                    display: "flex",
                    alignItems: "center",
                  },
                  children: originalSizeLabel,
                },
              },
              ...tableRows.map((row) => ({
                type: "div",
                props: {
                  style: {
                    width: `${colWidth}px`,
                    minWidth: `${colWidth}px`,
                    padding: "14px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: headerText,
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: row.systemName,
                },
              })),
            ],
          },
        },
        // Data rows
        ...columns.map((col, colIdx) => ({
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              borderBottom: `1px solid ${borderColor}`,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: `${firstColWidth}px`,
                    minWidth: `${firstColWidth}px`,
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                  },
                  children: col.originalSize,
                },
              },
              ...tableRows.map((row) => ({
                type: "div",
                props: {
                  style: {
                    width: `${colWidth}px`,
                    minWidth: `${colWidth}px`,
                    padding: "12px 12px",
                    fontSize: "14px",
                    color: "#374151",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: row.values[colIdx] || "-",
                },
              })),
            ],
          },
        })),
      ],
    },
  };
}

/**
 * Genera un buffer PNG de la guía de tallas.
 * @param {Object} sizeGuideData - Datos de la guía (mismo formato que GET /api/size-guide)
 * @returns {Promise<Buffer>} Buffer del PNG generado
 */
export async function generateSizeChartPNG(sizeGuideData) {
  const { columns, rows } = sizeGuideData;

  if (!columns?.length || !rows?.length) {
    throw new Error("No hay datos suficientes para generar la imagen");
  }

  const numSystems = rows.length;
  const firstColWidth = 140;
  const colWidth = Math.max(80, Math.min(130, 700 / Math.max(numSystems, 1)));
  const imgWidth = firstColWidth + numSystems * colWidth;
  const headerHeight = 46;
  const rowHeight = 44;
  const imgHeight = headerHeight + columns.length * rowHeight;

  const jsx = buildSizeGuideJSX(sizeGuideData);

  const fonts = [];
  const fontData = getFontData();
  const fontBoldData = getFontBoldData();

  if (fontData) {
    fonts.push({ name: "Inter", data: fontData, weight: 400, style: "normal" });
  }
  if (fontBoldData) {
    fonts.push({
      name: "Inter",
      data: fontBoldData,
      weight: 700,
      style: "normal",
    });
  }

  if (fonts.length === 0) {
    throw new Error(
      "No se encontraron fuentes Inter. Asegúrate de que existen en public/fonts/ o que @fontsource/inter está instalado."
    );
  }

  const svg = await satori(jsx, {
    width: imgWidth,
    height: imgHeight,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: imgWidth * 2 },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
