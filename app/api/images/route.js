import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadFile, deleteFile, getKeyFromUrl } from "@/lib/minio";

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// Tamaño máximo: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * GET /api/images?categoryId=X
 * Obtiene todas las imágenes de una categoría
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId es requerido" },
        { status: 400 }
      );
    }

    const images = await prisma.categoryImage.findMany({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error en GET /api/images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/images
 * Sube una nueva imagen para una categoría
 * Body: FormData con 'file' y 'categoryId'
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const categoryId = formData.get("categoryId");
    const alt = formData.get("alt") || "";
    const order = parseInt(formData.get("order") || "0");

    // Validaciones
    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado ningún archivo" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de 5MB` },
        { status: 400 }
      );
    }

    // Convertir archivo a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a MinIO
    const { url, filename } = await uploadFile(
      buffer,
      file.name,
      file.type,
      `categories/${categoryId}`
    );

    // Guardar referencia en base de datos
    const image = await prisma.categoryImage.create({
      data: {
        categoryId: parseInt(categoryId),
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        order,
        alt,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/images?id=X
 * Elimina una imagen por su ID
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    // Buscar la imagen
    const image = await prisma.categoryImage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!image) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar de MinIO
    try {
      const key = getKeyFromUrl(image.url);
      await deleteFile(key);
    } catch (minioError) {
      console.warn("Error eliminando archivo de MinIO:", minioError);
      // Continuamos aunque falle la eliminación del archivo
    }

    // Eliminar de la base de datos
    await prisma.categoryImage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/images
 * Actualiza el orden o alt de una imagen
 * Body: { id, order?, alt? }
 */
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, order, alt } = data;

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    const updateData = {};
    if (order !== undefined) updateData.order = parseInt(order);
    if (alt !== undefined) updateData.alt = alt;

    const image = await prisma.categoryImage.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error en PUT /api/images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
