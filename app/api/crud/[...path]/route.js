import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  enqueueChartRegenerationForCategory,
  enqueueChartRegenerationForCategories,
} from "@/lib/size-guide-chart";

/**
 * Dispara la regeneración de imágenes de guía de tallas afectadas por una mutación.
 * Se ejecuta en background (fire-and-forget) para no bloquear la respuesta del CRUD.
 */
function triggerChartRegeneration(modelName, entityId, data) {
  setImmediate(async () => {
    try {
      if (modelName === "size") {
        if (data?.categoryId) {
          enqueueChartRegenerationForCategory(data.categoryId);
        } else {
          const size = await prisma.size.findUnique({
            where: { id: entityId },
            select: { categoryId: true },
          });
          if (size?.categoryId) {
            enqueueChartRegenerationForCategory(size.categoryId);
          }
        }
      } else if (modelName === "category") {
        enqueueChartRegenerationForCategory(entityId);
      } else if (modelName === "sizeSystem") {
        const categories = await prisma.category.findMany({
          where: {
            OR: [
              { sizingSystems: { some: { id: entityId } } },
              { originSystemId: entityId },
            ],
          },
          select: { id: true },
        });
        enqueueChartRegenerationForCategories(categories.map((cat) => cat.id));
      }
    } catch (err) {
      console.error(
        `[ChartRegen] Error regenerando charts tras mutación de ${modelName}:`,
        err.message
      );
    }
  });
}

// Función para obtener el modelo según el path
function getModelFromPath(path) {
  const modelMap = {
    sizesystem: "sizeSystem",
    supplier: "supplier",
    gender: "gender",
    category: "category",
    size: "size",
    intcategory: "int_Category",
    productsizeexception: "productSizeException",
  };

  return modelMap[path.toLowerCase()] || null;
}

// Función para parsear errores de Prisma y devolver mensajes amigables
function parsePrismaError(error) {
  // Error de valor único duplicado
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const fields = error.meta?.target;
        const fieldNames = Array.isArray(fields) ? fields.join(", ") : fields;
        return {
          message: `Ya existe un registro con este valor. Campo(s) duplicado(s): ${fieldNames}`,
          code: "DUPLICATE_VALUE",
          fields: fields,
          status: 409,
        };
      }
      case "P2000": {
        // Value too long for column
        const column = error.meta?.column_name || error.meta?.column;
        return {
          message: `El valor proporcionado es demasiado largo para el campo "${column}". Por favor, reduce la longitud del texto.`,
          code: "VALUE_TOO_LONG",
          column: column,
          status: 400,
        };
      }
      case "P2003": {
        // Foreign key constraint failed
        const field = error.meta?.field_name || "desconocido";
        
        // Mensajes más descriptivos según el campo
        const fieldMessages = {
          categoryId: "Hay tallas (Size) o excepciones que usan esta categoría.",
          supplierId: "Hay categorías o tallas que usan este proveedor.",
          genderId: "Hay categorías que usan este género.",
          sizeSystemId: "Hay tallas o categorías que usan este sistema de tallas.",
          redirectCategoryId: "Hay excepciones que redirigen a esta categoría.",
        };
        
        const specificMessage = fieldMessages[field] || `Hay registros que dependen de este elemento (${field}).`;
        
        return {
          message: `No se puede eliminar: ${specificMessage} Elimina primero los registros dependientes.`,
          code: "FOREIGN_KEY_ERROR",
          field: field,
          status: 400,
        };
      }
      case "P2025": {
        // Record not found
        return {
          message: "El registro solicitado no existe o ya ha sido eliminado.",
          code: "NOT_FOUND",
          status: 404,
        };
      }
      case "P2014": {
        // Required relation violation
        const relation = error.meta?.relation_name;
        return {
          message: `No se puede eliminar porque tiene registros relacionados en "${relation}".`,
          code: "RELATION_VIOLATION",
          relation: relation,
          status: 400,
        };
      }
      default:
        return {
          message: `Error de base de datos (${error.code}): ${error.message}`,
          code: error.code,
          status: 500,
        };
    }
  }

  // Error de validación de Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    // Extraer mensaje más legible
    const message = error.message.split("\n").pop() || error.message;
    return {
      message: `Error de validación: ${message}`,
      code: "VALIDATION_ERROR",
      status: 400,
    };
  }

  // Error genérico
  return {
    message: error.message || "Error desconocido",
    code: "UNKNOWN_ERROR",
    status: 500,
  };
}

// Handlers CRUD
export async function GET(request, { params }) {
  try {
    // Obtener la ruta de params de manera segura
    const resolvedParams = await Promise.resolve(params);
    const pathParts = Array.isArray(resolvedParams?.path)
      ? resolvedParams.path
      : [];

    // Si no hay path, devolvemos error
    if (!pathParts.length) {
      return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
    }

    const modelName = getModelFromPath(pathParts[0]);

    if (!modelName || !prisma[modelName]) {
      return NextResponse.json(
        { error: "Modelo no encontrado" },
        { status: 404 }
      );
    }

    // Si hay un ID en la URL (pero no es "new")
    if (pathParts.length > 1 && pathParts[1] !== "new") {
      const id = parseInt(pathParts[1]);

      // Verificamos que id sea un número válido
      if (isNaN(id)) {
        return NextResponse.json({ error: "ID no válido" }, { status: 400 });
      }

      const item = await prisma[modelName].findUnique({
        where: { id: id },
        include: {
          // Adaptamos estas inclusiones según tus modelos
          ...(modelName === "supplier" && {}),
          ...(modelName === "category" && {
            gender: true,
            supplier: true,
            sizingSystems: true,
            intCategories: true,
            images: {
              orderBy: { order: "asc" },
            },
            sizes: {
              include: {
                sizeValues: {
                  include: {
                    sizeSystem: true,
                  },
                },
              },
            },
          }),
          ...(modelName === "size" && {
            supplier: true,
            category: true,
            sizeSystem: true,
            sizeValues: {
              include: {
                sizeSystem: true,
              },
            },
          }),
          ...(modelName === "sizeSystem" && {
            categories: true,
            sizeValues: true,
            translations: true,
          }),
          ...(modelName === "int_Category" && {
            categories: {
              include: {
                supplier: true,
                gender: true,
              },
            },
          }),
          ...(modelName === "productSizeException" && {
            redirectCategory: {
              include: {
                supplier: true,
                gender: true,
              },
            },
          }),
        },
      });

      if (!item) {
        return NextResponse.json(
          { error: "Elemento no encontrado" },
          { status: 404 }
        );
      }

      // Devolver en formato consistente incluso para un solo item
      return NextResponse.json({
        items: [item],
        pagination: {
          page: 1,
          pageSize: 1,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Obtener parámetros de filtrado, ordenamiento y paginación de la URL
    if (!request.url) {
      return NextResponse.json(
        { error: "URL de petición inválida" },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(request.url);

    // Parámetros de paginación
    const page = searchParams.has("page")
      ? parseInt(searchParams.get("page"), 10)
      : 1;
    const pageSize = searchParams.has("pageSize")
      ? parseInt(searchParams.get("pageSize"), 10)
      : 10;

    // Validar parámetros de paginación
    const validPage = page > 0 ? page : 1;
    const validPageSize = pageSize > 0 && pageSize <= 10000 ? pageSize : 10;

    // Calcular skip para paginación
    const skip = (validPage - 1) * validPageSize;

    // Construir where para filtros
    const filters = {};

    // Búsqueda global (parámetro "search")
    const searchTerm = searchParams.get("search");
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // Definir campos de búsqueda por modelo
      const searchFieldsMap = {
        sizeSystem: [{ systemName: { contains: searchLower } }],
        supplier: [{ name: { contains: searchLower } }],
        gender: [{ name: { contains: searchLower } }],
        category: [
          { name: { contains: searchLower } },
          { supplier: { name: { contains: searchLower } } },
          { gender: { name: { contains: searchLower } } },
        ],
        size: [
          { originalSize: { contains: searchLower } },
          { supplier: { name: { contains: searchLower } } },
          { category: { name: { contains: searchLower } } },
        ],
        int_Category: [
          { referenceId: { contains: searchLower } },
          { name: { contains: searchLower } },
        ],
        productSizeException: [
          { modelCodes: { contains: searchLower } },
          { notes: { contains: searchLower } },
          { redirectCategory: { name: { contains: searchLower } } },
        ],
      };

      const searchFields = searchFieldsMap[modelName];
      if (searchFields && searchFields.length > 0) {
        filters.OR = searchFields;
      }
    }

    // Procesamos filtros básicos para cada modelo
    if (modelName === "sizeSystem") {
      if (searchParams.has("systemName")) {
        filters.systemName = { contains: searchParams.get("systemName") };
      }
    } else if (modelName === "supplier") {
      if (searchParams.has("name")) {
        filters.name = { contains: searchParams.get("name") };
      }

      if (searchParams.has("originSystemId")) {
        filters.originSystemId = parseInt(searchParams.get("originSystemId"));
      }
    } else if (modelName === "gender") {
      if (searchParams.has("name")) {
        filters.name = { contains: searchParams.get("name") };
      }
    } else if (modelName === "category") {
      if (searchParams.has("name")) {
        filters.name = { contains: searchParams.get("name") };
      }

      if (searchParams.has("genderId")) {
        filters.genderId = parseInt(searchParams.get("genderId"));
      }

      if (searchParams.has("supplierId")) {
        filters.supplierId = parseInt(searchParams.get("supplierId"));
      }
    } else if (modelName === "size") {
      if (searchParams.has("originalSize")) {
        filters.originalSize = { contains: searchParams.get("originalSize") };
      }

      if (searchParams.has("supplierId")) {
        filters.supplierId = parseInt(searchParams.get("supplierId"));
      }

      if (searchParams.has("categoryId")) {
        filters.categoryId = parseInt(searchParams.get("categoryId"));
      }

      if (searchParams.has("sizeSystemId")) {
        filters.sizeSystemId = parseInt(searchParams.get("sizeSystemId"));
      }

      // Nuevo: filtrar por valor en cualquier sistema de tallaje
      if (searchParams.has("value") && searchParams.has("systemName")) {
        filters.sizeValues = {
          some: {
            value: { contains: searchParams.get("value") },
            sizeSystem: {
              systemName: searchParams.get("systemName"),
            },
          },
        };
      }
    } else if (modelName === "productSizeException") {
      if (searchParams.has("modelCodes")) {
        filters.modelCodes = { contains: searchParams.get("modelCodes") };
      }
      if (searchParams.has("redirectCategoryId")) {
        filters.redirectCategoryId = parseInt(searchParams.get("redirectCategoryId"));
      }
    }

    // Construir orderBy para ordenamiento (por defecto: más recientes primero)
    let orderBy = { id: "desc" };
    if (searchParams.has("sortBy") && searchParams.has("sortDir")) {
      const sortField = searchParams.get("sortBy");
      const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

      orderBy = { [sortField]: sortDir };
    }

    // Obtener el total de registros para la metadata de paginación
    const totalItems = await prisma[modelName].count({
      where: Object.keys(filters).length > 0 ? filters : undefined,
    });

    // Calcular el total de páginas
    const totalPages = Math.ceil(totalItems / validPageSize);

    // Lista de elementos con paginación, filtros y orden
    const items = await prisma[modelName].findMany({
      where: Object.keys(filters).length > 0 ? filters : undefined,
      orderBy,
      skip,
      take: validPageSize,
      include: {
        // Adaptamos estas inclusiones según tus modelos
        ...(modelName === "supplier" && {}),
        ...(modelName === "category" && {
          gender: true,
          supplier: true,
          sizingSystems: true,
          intCategories: true,
          images: {
            orderBy: { order: "asc" },
          },
          sizes: {
            include: {
              sizeValues: {
                include: {
                  sizeSystem: true,
                },
              },
            },
          },
        }),
        ...(modelName === "size" && {
          supplier: true,
          category: {
            include: {
              sizingSystems: true,
            },
          },
          sizeSystem: true,
          sizeValues: {
            include: {
              sizeSystem: true,
            },
          },
        }),
        ...(modelName === "sizeSystem" && {
          categories: true,
          sizeValues: true,
          translations: true,
        }),
        ...(modelName === "int_Category" && {
          categories: {
            include: {
              supplier: true,
              gender: true,
            },
          },
        }),
        ...(modelName === "productSizeException" && {
          redirectCategory: {
            include: {
              supplier: true,
              gender: true,
            },
          },
        }),
      },
    });

    // Devolver resultados con metadata de paginación
    return NextResponse.json({
      items,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        totalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      },
    });
  } catch (error) {
    console.error("Error en GET:", error);
    const parsedError = parsePrismaError(error);
    return NextResponse.json(
      { 
        error: parsedError.message,
        code: parsedError.code,
        details: parsedError.fields || parsedError.column || null
      }, 
      { status: parsedError.status }
    );
  }
}

export async function POST(request, { params }) {
  const resolvedParams = await Promise.resolve(params);
  const pathParts = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];

  if (!pathParts.length) {
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }

  const modelName = getModelFromPath(pathParts[0]);

  if (!modelName || !prisma[modelName]) {
    return NextResponse.json(
      { error: "Modelo no encontrado" },
      { status: 404 }
    );
  }

  try {
    const data = await request.json();

    // Convertir IDs de relaciones en números (excepto referenceId que es string)
    Object.keys(data).forEach((key) => {
      if (
        key.endsWith("Id") &&
        key !== "referenceId" &&
        data[key] !== null &&
        data[key] !== undefined
      ) {
        data[key] = parseInt(data[key]);
      }
    });

    // Manejar la creación de Size con sus SizeValues
    if (modelName === "size" && data.sizeValues) {
      const { sizeValues, ...sizeData } = data;

      // Limpiar el array para que solo tenga los campos válidos
      const cleanSizeValues = sizeValues.map((sv) => ({
        sizeSystemId: parseInt(sv.sizeSystemId),
        value: sv.value,
      }));

      const item = await prisma[modelName].create({
        data: {
          ...sizeData,
          sizeValues: {
            create: cleanSizeValues,
          },
        },
        include: {
          supplier: true,
          category: true,
          sizeSystem: true,
          sizeValues: {
            include: {
              sizeSystem: true,
            },
          },
        },
      });
      triggerChartRegeneration("size", item.id, item);
      return NextResponse.json(item, { status: 201 });
    }

    // Manejar la creación de Category con sus SizingSystems y IntCategories
    if (
      modelName === "category" &&
      (data.sizingSystems || data.intCategories)
    ) {
      const { sizingSystems, intCategories, ...categoryData } = data;

      const item = await prisma[modelName].create({
        data: {
          ...categoryData,
          sizingSystems: sizingSystems
            ? {
                connect: sizingSystems.map((id) => ({ id: parseInt(id) })),
              }
            : undefined,
          intCategories: intCategories
            ? {
                connect: intCategories.map((id) => ({ id: parseInt(id) })),
              }
            : undefined,
        },
        include: {
          gender: true,
          supplier: true,
          sizingSystems: true,
          originSystem: true,
          intCategories: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });
      triggerChartRegeneration("category", item.id, item);
      return NextResponse.json(item, { status: 201 });
    }

    // Manejar la creación de Int_Category con sus Categories
    if (modelName === "int_Category") {
      const { categories, ...intCategoryData } = data;

      // Verificar si ya existe un Int_Category con el mismo referenceId
      if (intCategoryData.referenceId) {
        const existing = await prisma.int_Category.findUnique({
          where: { referenceId: intCategoryData.referenceId },
        });
        if (existing) {
          return NextResponse.json(
            {
              error: `Ya existe una Int_Category con el referenceId "${intCategoryData.referenceId}"`,
              existingId: existing.id,
            },
            { status: 409 }
          );
        }
      }

      const item = await prisma[modelName].create({
        data: {
          ...intCategoryData,
          ...(categories && {
            categories: {
              connect: categories.map((id) => ({ id: parseInt(id) })),
            },
          }),
        },
        include: {
          categories: true,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    // Manejar la creación de SizeSystem con sus traducciones
    if (modelName === "sizeSystem" && data.translations) {
      const { translations, ...sizeSystemData } = data;

      const item = await prisma.sizeSystem.create({
        data: {
          ...sizeSystemData,
          translations: {
            create: translations
              .filter((t) => t.locale && t.name)
              .map((t) => ({
                locale: t.locale,
                name: t.name,
              })),
          },
        },
        include: {
          categories: true,
          sizeValues: true,
          translations: true,
        },
      });
      triggerChartRegeneration("sizeSystem", item.id, item);
      return NextResponse.json(item, { status: 201 });
    }

    const item = await prisma[modelName].create({
      data,
      include: {
        ...(modelName === "sizeSystem" && {
          categories: true,
          sizeValues: true,
          translations: true,
        }),
      },
    });
    if (["size", "category", "sizeSystem"].includes(modelName)) {
      triggerChartRegeneration(modelName, item.id, item);
    }
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error en POST:", error);
    const parsedError = parsePrismaError(error);
    return NextResponse.json(
      { 
        error: parsedError.message,
        code: parsedError.code,
        details: parsedError.fields || parsedError.column || null
      }, 
      { status: parsedError.status }
    );
  }
}

export async function PUT(request, { params }) {
  console.log("PUT - Inicio de la función");
  console.log("PUT - Parámetros:", params);

  const resolvedParams = await Promise.resolve(params);
  const pathParts = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];

  console.log("PUT - pathParts:", pathParts);

  if (!pathParts.length || pathParts.length < 2) {
    console.log("PUT - Error: Ruta no válida");
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }

  const modelName = getModelFromPath(pathParts[0]);
  console.log("PUT - modelName:", modelName);

  if (!modelName || !prisma[modelName]) {
    console.log("PUT - Error: Modelo no encontrado");
    return NextResponse.json(
      { error: "Modelo no encontrado" },
      { status: 404 }
    );
  }

  try {
    const id = parseInt(pathParts[1]);
    console.log("PUT - ID:", id);

    // Verificamos que id sea un número válido
    if (isNaN(id)) {
      console.log("PUT - Error: ID no válido");
      return NextResponse.json({ error: "ID no válido" }, { status: 400 });
    }

    const data = await request.json();
    console.log("PUT - Data recibida:", data);

    // Convertir IDs de relaciones en números (excepto referenceId que es string)
    Object.keys(data).forEach((key) => {
      if (
        key.endsWith("Id") &&
        key !== "referenceId" &&
        data[key] !== null &&
        data[key] !== undefined
      ) {
        data[key] = parseInt(data[key]);
      }
    });

    // Manejar la actualización de Size con sus SizeValues
    if (modelName === "size" && data.sizeValues) {
      const { sizeValues, ...sizeData } = data;

      // Convertir el objeto sizeValues en un array si es necesario
      const sizeValuesArray = Array.isArray(sizeValues)
        ? sizeValues
        : Object.values(sizeValues);

      // Limpiar el array para que solo tenga los campos válidos
      const cleanSizeValues = sizeValuesArray.map((sv) => ({
        sizeSystemId: parseInt(sv.sizeSystemId),
        value: sv.value,
      }));

      // Obtener los valores actuales
      const currentSize = await prisma.size.findUnique({
        where: { id },
        include: {
          sizeValues: true,
        },
      });

      if (!currentSize) {
        return NextResponse.json(
          { error: "Size no encontrado" },
          { status: 404 }
        );
      }

      const currentValuesMap = new Map(
        currentSize.sizeValues.map((sv) => [sv.sizeSystemId, sv])
      );

      // Prepara las operaciones
      const sizeValueOperations = cleanSizeValues.map((sv) => {
        const currentValue = currentValuesMap.get(sv.sizeSystemId);

        if (currentValue) {
          // Actualiza si existe
          return prisma.sizeValue.update({
            where: {
              sizeId_sizeSystemId: {
                sizeId: id,
                sizeSystemId: sv.sizeSystemId,
              },
            },
            data: { value: sv.value },
          });
        } else {
          // Crea si no existe
          return prisma.sizeValue.create({
            data: {
              value: sv.value,
              sizeSystemId: sv.sizeSystemId,
              sizeId: id,
            },
          });
        }
      });

      // Elimina los que ya no existen
      const newSystemIds = cleanSizeValues.map((sv) => sv.sizeSystemId);

      // Obtener los SizeValues que necesitan ser eliminados
      const sizeValuesToDelete = currentSize.sizeValues.filter(
        (sv) => !newSystemIds.includes(sv.sizeSystemId)
      );

      // Crear operaciones de eliminación individuales
      const deleteOperations = sizeValuesToDelete.map((sv) =>
        prisma.sizeValue.delete({
          where: {
            sizeId_sizeSystemId: {
              sizeId: id,
              sizeSystemId: sv.sizeSystemId,
            },
          },
        })
      );

      // Ejecuta la transacción
      const transaction = await prisma.$transaction([
        ...deleteOperations,
        ...sizeValueOperations,
        prisma.size.update({
          where: {
            id: id,
          },
          data: {
            originalSize: sizeData.originalSize,
            displayOrder: sizeData.displayOrder,
            supplierId: sizeData.supplierId,
            categoryId: sizeData.categoryId,
            sizeSystemId: sizeData.sizeSystemId,
          },
        }),
      ]);

      const updatedSize = await prisma.size.findUnique({
        where: { id },
        include: {
          supplier: true,
          category: true,
          sizeSystem: true,
          sizeValues: {
            include: {
              sizeSystem: true,
            },
          },
        },
      });

      triggerChartRegeneration("size", id, updatedSize);
      return NextResponse.json(updatedSize);
    }

    // Manejar la actualización de Category con sus SizingSystems
    if (
      modelName === "category" &&
      (data.sizingSystems || data.intCategories)
    ) {
      const { sizingSystems, intCategories, ...categoryData } = data;

      // Limpiar campos no válidos
      const allowedFields = [
        "name",
        "genderId",
        "supplierId",
        "originSystemId",
        "predefinedSystemId",
      ];
      const cleanCategoryData = {};
      for (const key of allowedFields) {
        if (categoryData[key] !== undefined) {
          cleanCategoryData[key] = categoryData[key];
        }
      }

      console.log("PUT Category - Inicio de actualización");
      console.log("PUT Category - ID:", id);
      console.log("PUT Category - Data recibida:", data);
      console.log("PUT Category - sizingSystems:", sizingSystems);
      console.log("PUT Category - intCategories:", intCategories);
      console.log("PUT Category - cleanCategoryData:", cleanCategoryData);

      try {
        const updatedCategory = await prisma.category.update({
          where: { id },
          data: {
            ...cleanCategoryData,
            sizingSystems: sizingSystems
              ? {
                  set: sizingSystems.map((sysId) => ({ id: parseInt(sysId) })),
                }
              : undefined,
            intCategories: intCategories
              ? {
                  set: intCategories.map((intCatId) => ({
                    id: parseInt(intCatId),
                  })),
                }
              : undefined,
          },
          include: {
            gender: true,
            supplier: true,
            sizingSystems: true,
            originSystem: true,
            intCategories: true,
            images: {
              orderBy: { order: "asc" },
            },
            sizes: {
              include: {
                sizeValues: {
                  include: {
                    sizeSystem: true,
                  },
                },
              },
            },
          },
        });

        console.log("PUT Category - Actualización exitosa:", updatedCategory);
        triggerChartRegeneration("category", id, updatedCategory);
        return NextResponse.json(updatedCategory);
      } catch (error) {
        console.error("PUT Category - Error en la actualización:", error);
        const parsedError = parsePrismaError(error);
        return NextResponse.json(
          { 
            error: parsedError.message,
            code: parsedError.code,
            details: parsedError.fields || parsedError.column || null
          }, 
          { status: parsedError.status }
        );
      }
    }

    // Manejar la actualización de SizeSystem
    if (modelName === "sizeSystem") {
      console.log("PUT SizeSystem - Inicio de actualización");
      try {
        const { categories, translations, ...sizeSystemData } = data;

        const cleanSizeSystemData = {
          systemName: sizeSystemData.systemName,
          isDefault: sizeSystemData.isDefault || false,
          ...(sizeSystemData.displayOrder !== undefined && {
            displayOrder: Number(sizeSystemData.displayOrder),
          }),
        };

        console.log(
          "PUT SizeSystem - cleanSizeSystemData:",
          cleanSizeSystemData
        );

        // Actualizar SizeSystem sin tocar categories ni translations
        const updatedSizeSystem = await prisma.sizeSystem.update({
          where: { id },
          data: cleanSizeSystemData,
          include: {
            categories: true,
            sizeValues: true,
            translations: true,
          },
        });

        // Si hay categorías especificadas, actualizar la relación
        if (categories && categories.connect) {
          await prisma.sizeSystem.update({
            where: { id },
            data: {
              categories: {
                set: categories.connect.map((cat) => ({
                  id: parseInt(cat.id),
                })),
              },
            },
          });
        }

        // Si hay traducciones, actualizarlas (upsert por locale)
        // Soporta tanto array [{locale, name}] como objeto {locale: name}
        if (translations) {
          let translationsArray = [];
          
          if (Array.isArray(translations)) {
            translationsArray = translations;
          } else if (typeof translations === "object") {
            // Convertir objeto {es: "nombre", ca: "nom"} a array [{locale: "es", name: "nombre"}, ...]
            translationsArray = Object.entries(translations)
              .filter(([locale, name]) => name && String(name).trim() !== "")
              .map(([locale, name]) => ({ locale, name }));
          }

          console.log("PUT SizeSystem - Procesando traducciones:", translationsArray);

          for (const translation of translationsArray) {
            if (translation.locale && translation.name !== undefined) {
              await prisma.sizeSystemTranslation.upsert({
                where: {
                  sizeSystemId_locale: {
                    sizeSystemId: id,
                    locale: translation.locale,
                  },
                },
                update: {
                  name: translation.name,
                },
                create: {
                  sizeSystemId: id,
                  locale: translation.locale,
                  name: translation.name,
                },
              });
            }
          }
        }

        // Recuperar el registro actualizado con todas sus relaciones
        const refreshedSizeSystem = await prisma.sizeSystem.findUnique({
          where: { id },
          include: {
            categories: true,
            sizeValues: true,
            translations: true,
          },
        });

        console.log(
          "PUT SizeSystem - Actualización exitosa:",
          refreshedSizeSystem
        );
        triggerChartRegeneration("sizeSystem", id, refreshedSizeSystem);
        return NextResponse.json(refreshedSizeSystem);
      } catch (error) {
        console.error("PUT SizeSystem - Error en la actualización:", error);
        const parsedError = parsePrismaError(error);
        return NextResponse.json(
          { 
            error: parsedError.message,
            code: parsedError.code,
            details: parsedError.fields || parsedError.column || null
          }, 
          { status: parsedError.status }
        );
      }
    }

    // Manejar la actualización de Int_Category con sus Categories
    if (modelName === "int_Category") {
      const { categories, ...intCategoryData } = data;
      console.log("PUT Int_Category - Data recibida:", data);

      try {
        // Verificar si el referenceId ya existe en otro registro
        if (intCategoryData.referenceId) {
          const existing = await prisma.int_Category.findFirst({
            where: {
              referenceId: intCategoryData.referenceId,
              NOT: { id: id },
            },
          });
          if (existing) {
            return NextResponse.json(
              {
                error: `Ya existe otra Int_Category con el referenceId "${intCategoryData.referenceId}"`,
                existingId: existing.id,
              },
              { status: 409 }
            );
          }
        }

        // Procesar primero los datos básicos de Int_Category
        const updateData = {};
        if (intCategoryData.referenceId !== undefined) {
          updateData.referenceId = intCategoryData.referenceId;
        }
        if (intCategoryData.name !== undefined) {
          updateData.name = intCategoryData.name;
        }

        console.log("PUT Int_Category - Datos a actualizar:", updateData);

        // Primera actualización sin tocar categories
        const updatedIntCategory = await prisma.int_Category.update({
          where: { id },
          data: updateData,
        });

        console.log("PUT Int_Category - Actualización básica completada");

        // Procesar las categorías, asegurándonos de que cada ID es un número válido
        let categoryIds = [];

        // Si categories es un arreglo de objetos con id
        if (Array.isArray(categories) && categories.length > 0) {
          if (typeof categories[0] === "object" && categories[0].id) {
            categoryIds = categories
              .map((cat) => parseInt(cat.id))
              .filter((id) => !isNaN(id));
          }
          // Si categories es un arreglo de IDs
          else if (
            typeof categories[0] === "number" ||
            typeof categories[0] === "string"
          ) {
            categoryIds = categories
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id));
          }
        }

        console.log(
          "PUT Int_Category - IDs de categorías procesados:",
          categoryIds
        );

        if (categoryIds.length > 0) {
          // Actualizar la relación con categories
          await prisma.int_Category.update({
            where: { id },
            data: {
              categories: {
                set: categoryIds.map((catId) => ({ id: catId })),
              },
            },
          });

          console.log("PUT Int_Category - Relación con categorías actualizada");
        }

        // Obtener el registro actualizado con todas sus relaciones
        const finalIntCategory = await prisma.int_Category.findUnique({
          where: { id },
          include: {
            categories: true,
          },
        });

        return NextResponse.json(finalIntCategory);
      } catch (error) {
        console.error("PUT Int_Category - Error en la actualización:", error);
        const parsedError = parsePrismaError(error);
        return NextResponse.json(
          { 
            error: parsedError.message,
            code: parsedError.code,
            details: parsedError.fields || parsedError.column || null
          }, 
          { status: parsedError.status }
        );
      }
    }

    // Para otros modelos, actualización simple
    const item = await prisma[modelName].update({
      where: { id },
      data,
      include: {
        ...(modelName === "sizeSystem" && {
          categories: true,
          sizeValues: true,
          translations: true,
        }),
      },
    });

    if (["size", "category", "sizeSystem"].includes(modelName)) {
      triggerChartRegeneration(modelName, id, item);
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("Error en PUT:", error);
    const parsedError = parsePrismaError(error);
    return NextResponse.json(
      { 
        error: parsedError.message,
        code: parsedError.code,
        details: parsedError.fields || parsedError.column || null
      }, 
      { status: parsedError.status }
    );
  }
}

export async function DELETE(request, { params }) {
  const resolvedParams = await Promise.resolve(params);
  const pathParts = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];

  if (!pathParts.length || pathParts.length < 2) {
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }

  const modelName = getModelFromPath(pathParts[0]);

  if (!modelName || !prisma[modelName]) {
    return NextResponse.json(
      { error: "Recurso no encontrado" },
      { status: 404 }
    );
  }

  try {
    const id = parseInt(pathParts[1]);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID no válido" }, { status: 400 });
    }

    // Capturar datos antes de borrar para poder regenerar charts afectados
    let preDeleteData = null;
    if (["size", "category", "sizeSystem"].includes(modelName)) {
      if (modelName === "size") {
        preDeleteData = await prisma.size.findUnique({
          where: { id },
          select: { categoryId: true },
        });
      } else if (modelName === "category") {
        preDeleteData = await prisma.category.findUnique({
          where: { id },
          include: { intCategories: { select: { referenceId: true } } },
        });
      } else if (modelName === "sizeSystem") {
        const cats = await prisma.category.findMany({
          where: {
            OR: [
              { sizingSystems: { some: { id } } },
              { originSystemId: id },
            ],
          },
          select: { id: true },
        });
        preDeleteData = { affectedCategoryIds: cats.map((c) => c.id) };
      }
    }

    await prisma[modelName].delete({
      where: { id: id },
    });

    // Regenerar charts post-delete encolando para evitar saturación.
    if (modelName === "size" && preDeleteData?.categoryId) {
      enqueueChartRegenerationForCategory(preDeleteData.categoryId);
    } else if (
      modelName === "sizeSystem" &&
      preDeleteData?.affectedCategoryIds
    ) {
      enqueueChartRegenerationForCategories(preDeleteData.affectedCategoryIds);
    } else if (modelName === "category" && preDeleteData?.intCategories) {
      // No hay categoryId para regenerar; se deja sin acción explícita.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE:", error);
    const parsedError = parsePrismaError(error);
    return NextResponse.json(
      { 
        error: parsedError.message,
        code: parsedError.code,
        details: parsedError.fields || parsedError.column || null
      }, 
      { status: parsedError.status }
    );
  }
}
