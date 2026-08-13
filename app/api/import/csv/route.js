import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { importarDesdeCSV } from "../../../../lib/csv-import";

// Tamaño máximo del archivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    // Verificar que el Content-Type sea multipart/form-data
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          message:
            "El Content-Type debe ser multipart/form-data para subir archivos",
        },
        { status: 400 }
      );
    }

    // Procesar la solicitud como FormData
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      return NextResponse.json(
        { message: "Error al procesar FormData: " + formError.message },
        { status: 400 }
      );
    }

    // Obtener parámetros
    const entidad = formData.get("entidad");
    const archivo = formData.get("archivo");
    const configStr = formData.get("config");

    // Validar parámetros
    if (!entidad) {
      return NextResponse.json(
        { message: 'El parámetro "entidad" es obligatorio' },
        { status: 400 }
      );
    }

    if (!archivo) {
      return NextResponse.json(
        { message: "El archivo CSV es obligatorio" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!archivo.name.endsWith(".csv")) {
      return NextResponse.json(
        { message: "El archivo debe tener extensión .csv" },
        { status: 400 }
      );
    }

    // Validar tamaño del archivo
    if (archivo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "El archivo excede el tamaño máximo permitido (10MB)" },
        { status: 400 }
      );
    }

    // Parsear configuración si existe
    let configuracion = null;
    if (configStr) {
      try {
        configuracion = JSON.parse(configStr);
      } catch (error) {
        return NextResponse.json(
          { message: "La configuración no es un JSON válido" },
          { status: 400 }
        );
      }
    }

    // Crear directorio temporal si no existe
    const tmpDir = join(process.cwd(), "tmp");
    if (!existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    // Guardar archivo temporalmente
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const filePath = join(tmpDir, `import-${Date.now()}-${archivo.name}`);
    await writeFile(filePath, buffer);

    // Importar datos
    const resultado = await importarDesdeCSV({
      entidad,
      archivo: filePath,
      configuracion,
      logToFile: true,
      logFile: join(tmpDir, "import-log.json"),
    });

    // Devolver resultados
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al procesar la importación:", error);
    return NextResponse.json(
      { message: `Error al procesar la importación: ${error.message}` },
      { status: 500 }
    );
  }
}

// Definir POST como método permitido
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
