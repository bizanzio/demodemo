/**
 * Módulo para importar datos a la base de datos
 */
const fs = require("fs-extra");
const path = require("path");
// Importar directamente PrismaClient
const { PrismaClient } = require("@prisma/client");
// Importación fallback del singleton
const prismaSingleton = require("../prisma").default || require("../prisma");
const { validarDatos } = require("./parser");

// Usar el singleton o crear una nueva instancia
const prisma = prismaSingleton || new PrismaClient();

/**
 * Importa datos a la base de datos según su tipo
 * @param {string} entidad - Tipo de entidad a importar
 * @param {Array} datos - Datos a importar
 * @returns {Promise<Object>} - Resultados de la importación
 */
async function importar(entidad, datos) {
  // Depuración del cliente Prisma
  console.log("Debug - prisma object:", typeof prisma);
  console.log("Debug - prisma properties:", Object.keys(prisma));
  console.log(
    "Debug - prisma supplier:",
    typeof prisma.supplier,
    prisma.supplier ? true : false
  );
  console.log(
    "Debug - prisma sizeSystem:",
    typeof prisma.sizeSystem,
    prisma.sizeSystem ? true : false
  );

  // 1. Validar los datos
  const { validos, invalidos } = validarDatos(entidad, datos);

  // 2. Crear estructura de resultados
  const resultados = {
    entidad,
    total: datos.length,
    creados: 0,
    actualizados: 0,
    fallidos: invalidos.map((inv) => ({
      datos: inv.registro,
      error: inv.errores,
    })),
  };

  // 3. Procesar según tipo de entidad
  try {
    switch (entidad) {
      case "sizeSystem":
        await procesarSizeSystems(validos, resultados);
        break;
      case "supplier":
        await procesarSuppliers(validos, resultados);
        break;
      case "gender":
        await procesarGenders(validos, resultados);
        break;
      case "int_category":
        await procesarIntCategories(validos, resultados);
        break;
      case "category":
        await procesarCategories(validos, resultados);
        break;
      case "size":
        await procesarSizes(validos, resultados);
        break;
      case "sizeValue":
        await procesarSizeValues(validos, resultados);
        break;
      default:
        throw new Error(`Entidad no soportada: ${entidad}`);
    }

    return resultados;
  } catch (error) {
    console.error(`❌ Error al importar ${entidad}: ${error.message}`);
    throw error;
  }
}

/**
 * Guarda log de importación en archivo JSON
 * @param {Object} informe - Informe de resultados
 * @param {string} archivo - Nombre del archivo de salida
 */
async function guardarLog(informe, archivo) {
  try {
    // Crear directorio si no existe
    const dir = path.dirname(archivo);
    await fs.ensureDir(dir);

    // Leer archivo existente si existe
    let logs = [];
    if (await fs.pathExists(archivo)) {
      logs = await fs.readJson(archivo).catch(() => []);
    }

    // Añadir nuevo log
    logs.push(informe);

    // Guardar archivo
    await fs.writeJson(archivo, logs, { spaces: 2 });
    console.log(`📄 Log guardado en ${archivo}`);
  } catch (error) {
    console.error(`❌ Error al guardar log: ${error.message}`);
  }
}

/**
 * Procesa la importación de sistemas de tallas
 */
async function procesarSizeSystems(datos, resultados) {
  // Intentar encontrar el modelo correcto en prisma
  let sizeSystemModel;

  if (prisma.sizeSystem) {
    sizeSystemModel = prisma.sizeSystem;
    console.log("Usando modelo prisma.sizeSystem");
  } else if (prisma.SizeSystem) {
    sizeSystemModel = prisma.SizeSystem;
    console.log("Usando modelo prisma.SizeSystem");
  } else {
    console.error("No se encontró ningún modelo de SizeSystem en Prisma");

    // Agregar todos los registros como fallidos
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo SizeSystem no está disponible en el cliente Prisma.",
      });
    });

    return; // Salir de la función, no podemos procesar
  }

  for (const dato of datos) {
    try {
      // Verificar si ya existe el registro antes de la operación
      const existente = await sizeSystemModel.findUnique({
        where: { systemName: dato.systemName },
      });

      // Convertir isDefault a booleano si viene como string
      if (typeof dato.isDefault === "string") {
        dato.isDefault = dato.isDefault.toLowerCase() === "true";
      }

      // Solo usamos los campos systemName e isDefault que sabemos que existen
      // Ignoramos description ya que no está en el modelo actual
      console.log(
        `Importando sistema de tallas: ${dato.systemName} (ignorando campos adicionales)`
      );

      if (dato.description) {
        console.log(
          `Nota: El campo description "${dato.description}" no será importado porque no existe en el modelo.`
        );
      }

      // Upsert: Crear si no existe, actualizar si existe (solo con campos existentes)
      const resultado = await sizeSystemModel.upsert({
        where: { systemName: dato.systemName },
        update: {
          isDefault: dato.isDefault || false,
        },
        create: {
          systemName: dato.systemName,
          isDefault: dato.isDefault || false,
        },
      });

      if (resultado.id > 0) {
        const estaCreando = !existente;
        console.log(
          `✅ Sistema de tallas ${resultado.id} (${dato.systemName}) ${
            estaCreando ? "creado" : "actualizado"
          } correctamente`
        );
        dato.id = resultado.id;

        // Incrementar el contador correspondiente
        if (estaCreando) {
          resultados.creados++;
        } else {
          resultados.actualizados++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar sistema de tallas ${dato.systemName}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de proveedores
 */
async function procesarSuppliers(datos, resultados) {
  // Intentar encontrar el modelo correcto en prisma
  let supplierModel;

  if (prisma.supplier) {
    supplierModel = prisma.supplier;
    console.log("Usando modelo prisma.supplier");
  } else if (prisma.Supplier) {
    supplierModel = prisma.Supplier;
    console.log("Usando modelo prisma.Supplier");
  } else {
    console.error("No se encontró ningún modelo de Supplier en Prisma");

    // Agregar todos los registros como fallidos
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo Supplier no está disponible en el cliente Prisma.",
      });
    });

    return; // Salir de la función, no podemos procesar
  }

  for (const dato of datos) {
    try {
      // Verificar si ya existe el registro antes de la operación
      const existente = await supplierModel.findUnique({
        where: { name: dato.name },
      });

      // Solo usamos el campo name que sabemos que existe
      // Ignoramos code y country ya que no están en el modelo actual
      console.log(
        `Importando proveedor: ${dato.name} (ignorando campos adicionales code/country)`
      );

      if (dato.code || dato.country) {
        console.log(
          `Nota: Los campos adicionales (code: ${dato.code}, country: ${dato.country}) no serán importados porque no existen en el modelo.`
        );
      }

      // Upsert: Crear si no existe, actualizar si existe (solo con name)
      const resultado = await supplierModel.upsert({
        where: { name: dato.name },
        update: {}, // No hay campos adicionales para actualizar
        create: {
          name: dato.name,
          // No incluimos code ni country
        },
      });

      if (resultado.id > 0) {
        const estaCreando = !existente;
        console.log(
          `✅ Proveedor ${resultado.id} (${dato.name}) ${
            estaCreando ? "creado" : "actualizado"
          } correctamente`
        );
        dato.id = resultado.id;

        // Incrementar el contador correspondiente
        if (estaCreando) {
          resultados.creados++;
        } else {
          resultados.actualizados++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar proveedor ${dato.name}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de géneros
 */
async function procesarGenders(datos, resultados) {
  // Intentar encontrar el modelo correcto en prisma
  let genderModel;

  if (prisma.gender) {
    genderModel = prisma.gender;
    console.log("Usando modelo prisma.gender");
  } else if (prisma.Gender) {
    genderModel = prisma.Gender;
    console.log("Usando modelo prisma.Gender");
  } else {
    console.error("No se encontró ningún modelo de Gender en Prisma");

    // Agregar todos los registros como fallidos
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo Gender no está disponible en el cliente Prisma.",
      });
    });

    return; // Salir de la función, no podemos procesar
  }

  for (const dato of datos) {
    try {
      // Verificar si ya existe el registro antes de la operación
      const existente = await genderModel.findUnique({
        where: { name: dato.name },
      });

      // Solo usamos el campo name que sabemos que existe
      // Ignoramos code y description ya que no están en el modelo actual
      console.log(
        `Importando género: ${dato.name} (ignorando campos adicionales)`
      );

      if (dato.code || dato.description) {
        console.log(
          `Nota: Los campos adicionales (code: ${dato.code}, description: ${dato.description}) no serán importados porque no existen en el modelo.`
        );
      }

      // Upsert: Crear si no existe, actualizar si existe (solo con name)
      const resultado = await genderModel.upsert({
        where: { name: dato.name },
        update: {}, // No hay campos adicionales para actualizar
        create: { name: dato.name },
      });

      if (resultado.id > 0) {
        const estaCreando = !existente;
        console.log(
          `✅ Género ${resultado.id} (${dato.name}) ${
            estaCreando ? "creado" : "actualizado"
          } correctamente`
        );
        dato.id = resultado.id;

        // Incrementar el contador correspondiente
        if (estaCreando) {
          resultados.creados++;
        } else {
          resultados.actualizados++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar género ${dato.name}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de categorías internas
 */
async function procesarIntCategories(datos, resultados) {
  // Intentar encontrar el modelo correcto en prisma
  let intCategoryModel;

  if (prisma.int_Category) {
    intCategoryModel = prisma.int_Category;
    console.log("Usando modelo prisma.int_Category");
  } else if (prisma.Int_Category) {
    intCategoryModel = prisma.Int_Category;
    console.log("Usando modelo prisma.Int_Category");
  } else {
    console.error("No se encontró ningún modelo de Int_Category en Prisma");

    // Agregar todos los registros como fallidos
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error:
          "El modelo Int_Category no está disponible en el cliente Prisma.",
      });
    });

    return; // Salir de la función, no podemos procesar
  }

  for (const dato of datos) {
    try {
      // Asegurar que referenceId es un string válido
      const referenceId = String(dato.referenceId).trim();
      if (!referenceId) {
        throw new Error(`referenceId inválido o vacío: ${dato.referenceId}`);
      }

      // Verificar si ya existe el registro antes de la operación
      const existente = await intCategoryModel.findUnique({
        where: { referenceId },
      });

      // Solo usamos los campos name y referenceId que sabemos que existen
      // Ignoramos description ya que no está en el modelo actual
      console.log(
        `Importando categoría interna: ${dato.name} (ID: ${referenceId}) (ignorando campos adicionales)`
      );

      if (dato.description) {
        console.log(
          `Nota: El campo description "${dato.description}" no será importado porque no existe en el modelo.`
        );
      }

      // Upsert: Crear si no existe, actualizar si existe (solo con campos existentes)
      const resultado = await intCategoryModel.upsert({
        where: { referenceId },
        update: { name: dato.name },
        create: {
          referenceId,
          name: dato.name,
        },
      });

      if (resultado.id > 0) {
        const estaCreando = !existente;
        console.log(
          `✅ Categoría interna ${resultado.id} (${dato.name}) ${
            estaCreando ? "creada" : "actualizada"
          } correctamente`
        );
        dato.id = resultado.id;

        // Incrementar el contador correspondiente
        if (estaCreando) {
          resultados.creados++;
        } else {
          resultados.actualizados++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar categoría interna ${dato.name}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de categorías
 */
async function procesarCategories(datos, resultados) {
  for (const dato of datos) {
    try {
      // 1. Buscar IDs de referencias
      const supplier = dato.supplierName
        ? await prisma.supplier.findUnique({
            where: { name: dato.supplierName },
          })
        : null;

      const gender = dato.genderName
        ? await prisma.gender.findUnique({ where: { name: dato.genderName } })
        : null;

      const originSystem = dato.originSystemName
        ? await prisma.sizeSystem.findUnique({
            where: { systemName: dato.originSystemName },
          })
        : null;

      const predefinedSystem = dato.predefinedSystemName
        ? await prisma.sizeSystem.findUnique({
            where: { systemName: dato.predefinedSystemName },
          })
        : null;

      // 2. Verificar que las referencias existen
      if (dato.supplierName && !supplier) {
        throw new Error(`Proveedor no encontrado: ${dato.supplierName}`);
      }

      if (dato.genderName && !gender) {
        throw new Error(`Género no encontrado: ${dato.genderName}`);
      }

      if (dato.originSystemName && !originSystem) {
        throw new Error(
          `Sistema de origen no encontrado: ${dato.originSystemName}`
        );
      }

      if (dato.predefinedSystemName && !predefinedSystem) {
        throw new Error(
          `Sistema predefinido no encontrado: ${dato.predefinedSystemName}`
        );
      }

      // 3. Buscar categoría interna si hay referencia
      let intCategoriesConnect = [];
      if (dato.intCategoryReferenceId) {
        const referenceId = String(dato.intCategoryReferenceId).trim();
        const intCategory = await prisma.int_Category.findUnique({
          where: { referenceId },
        });

        if (!intCategory) {
          throw new Error(
            `Categoría interna no encontrada: ${dato.intCategoryReferenceId}`
          );
        }

        intCategoriesConnect.push({ id: intCategory.id });
      }

      // 4. Determinar sistemas de tallas para conectar
      const sizingSystemsConnect = [];
      if (
        originSystem &&
        !sizingSystemsConnect.some((s) => s.id === originSystem.id)
      ) {
        sizingSystemsConnect.push({ id: originSystem.id });
      }

      if (
        predefinedSystem &&
        !sizingSystemsConnect.some((s) => s.id === predefinedSystem.id)
      ) {
        sizingSystemsConnect.push({ id: predefinedSystem.id });
      }

      // 5. Usar combinación de supplier, gender y name como clave única
      const whereCondition = {
        name: dato.name,
        supplierId: supplier?.id || null,
        genderId: gender?.id || null,
      };

      // 6. Upsert: Crear si no existe, actualizar si existe
      const resultado = await prisma.category.upsert({
        where: {
          supplierId_genderId_name: {
            name: dato.name,
            supplierId: supplier?.id || null,
            genderId: gender?.id || null,
          },
        },
        update: {
          originSystemId: originSystem?.id || null,
          predefinedSystemId: predefinedSystem?.id || null,
          sizingSystems: {
            connect: sizingSystemsConnect,
          },
          intCategories: {
            connect: intCategoriesConnect,
          },
        },
        create: {
          name: dato.name,
          supplier: supplier ? { connect: { id: supplier.id } } : undefined,
          gender: gender ? { connect: { id: gender.id } } : undefined,
          originSystem: originSystem
            ? { connect: { id: originSystem.id } }
            : undefined,
          predefinedSystem: predefinedSystem
            ? { connect: { id: predefinedSystem.id } }
            : undefined,
          sizingSystems: {
            connect: sizingSystemsConnect,
          },
          intCategories: {
            connect: intCategoriesConnect,
          },
        },
      });

      if (resultado.id > 0) {
        console.log(
          `✅ Categoría ${resultado.id} (${dato.name}) procesada correctamente`
        );
        dato.id = resultado.id;
        resultado.created ? resultados.creados++ : resultados.actualizados++;
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar categoría ${dato.name}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de tallas
 */
async function procesarSizes(datos, resultados) {
  for (const dato of datos) {
    try {
      // 1. Buscar IDs de referencias
      const supplier = dato.supplierName
        ? await prisma.supplier.findUnique({
            where: { name: dato.supplierName },
          })
        : null;

      const sizeSystem = dato.sizeSystemName
        ? await prisma.sizeSystem.findUnique({
            where: { systemName: dato.sizeSystemName },
          })
        : null;

      // 2. Buscar categoría (requiere supplier + name)
      let category = null;
      if (dato.categoryName && supplier) {
        // Buscar categoría por nombre y proveedor (puede haber múltiples con mismo nombre)
        const categoriesFound = await prisma.category.findMany({
          where: {
            name: dato.categoryName,
            supplierId: supplier.id,
          },
        });

        if (categoriesFound.length > 0) {
          category = categoriesFound[0]; // Usar la primera coincidencia
        }
      }

      // 3. Verificar que las referencias existen
      if (dato.supplierName && !supplier) {
        throw new Error(`Proveedor no encontrado: ${dato.supplierName}`);
      }

      if (dato.sizeSystemName && !sizeSystem) {
        throw new Error(
          `Sistema de tallas no encontrado: ${dato.sizeSystemName}`
        );
      }

      if (dato.categoryName && !category) {
        throw new Error(
          `Categoría no encontrada para proveedor ${dato.supplierName}: ${dato.categoryName}`
        );
      }

      // 4. Convertir displayOrder a numérico si existe
      let displayOrder = null;
      if (dato.displayOrder) {
        displayOrder = parseInt(dato.displayOrder);
        if (isNaN(displayOrder)) {
          throw new Error(`displayOrder inválido: ${dato.displayOrder}`);
        }
      }

      // 5. Crear clave para búsqueda basada en originalSize, supplierId, categoryId
      const whereCondition = {
        originalSize: dato.originalSize,
        supplierId: supplier?.id || null,
        categoryId: category?.id || null,
        sizeSystemId: sizeSystem?.id || null,
      };

      // 6. Buscar talla existente
      const sizeExistente = await prisma.size.findFirst({
        where: whereCondition,
      });

      // 7. Crear o actualizar la talla
      let resultado;
      if (sizeExistente) {
        // Actualizar
        resultado = await prisma.size.update({
          where: { id: sizeExistente.id },
          data: {
            displayOrder: displayOrder || sizeExistente.displayOrder,
          },
        });
        resultados.actualizados++;
      } else {
        // Crear
        resultado = await prisma.size.create({
          data: {
            originalSize: dato.originalSize,
            displayOrder: displayOrder,
            supplier: supplier ? { connect: { id: supplier.id } } : undefined,
            category: category ? { connect: { id: category.id } } : undefined,
            sizeSystem: sizeSystem
              ? { connect: { id: sizeSystem.id } }
              : undefined,
          },
        });
        resultados.creados++;
      }

      if (resultado.id > 0) {
        console.log(
          `✅ Talla ${resultado.id} (${dato.originalSize}) procesada correctamente`
        );
        dato.id = resultado.id;
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar talla ${dato.originalSize}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

/**
 * Procesa la importación de valores de tallas
 */
async function procesarSizeValues(datos, resultados) {
  // Intentar encontrar los modelos correctos en prisma
  let sizeValueModel, sizeModel, sizeSystemModel;

  if (prisma.sizeValue) {
    sizeValueModel = prisma.sizeValue;
    console.log("Usando modelo prisma.sizeValue");
  } else if (prisma.SizeValue) {
    sizeValueModel = prisma.SizeValue;
    console.log("Usando modelo prisma.SizeValue");
  } else {
    console.error("No se encontró ningún modelo de SizeValue en Prisma");
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo SizeValue no está disponible en el cliente Prisma.",
      });
    });
    return;
  }

  if (prisma.size) {
    sizeModel = prisma.size;
  } else if (prisma.Size) {
    sizeModel = prisma.Size;
  } else {
    console.error("No se encontró ningún modelo de Size en Prisma");
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo Size no está disponible en el cliente Prisma.",
      });
    });
    return;
  }

  if (prisma.sizeSystem) {
    sizeSystemModel = prisma.sizeSystem;
  } else if (prisma.SizeSystem) {
    sizeSystemModel = prisma.SizeSystem;
  } else {
    console.error("No se encontró ningún modelo de SizeSystem en Prisma");
    datos.forEach((dato) => {
      resultados.fallidos.push({
        datos: dato,
        error: "El modelo SizeSystem no está disponible en el cliente Prisma.",
      });
    });
    return;
  }

  for (const dato of datos) {
    try {
      // 1. Buscar sistema de tallas
      const sizeSystem = await sizeSystemModel.findUnique({
        where: { systemName: dato.sizeSystemName },
      });

      if (!sizeSystem) {
        throw new Error(
          `Sistema de tallas no encontrado: ${dato.sizeSystemName}`
        );
      }

      // 2. Buscar talla por originalSize y sizeSystemName
      const size = await sizeModel.findFirst({
        where: {
          originalSize: dato.originalSize,
          sizeSystemId: sizeSystem.id,
        },
      });

      if (!size) {
        throw new Error(
          `Talla no encontrada: ${dato.originalSize} en sistema ${dato.sizeSystemName}`
        );
      }

      // 3. Verificar si ya existe el valor de talla
      const existente = await sizeValueModel.findUnique({
        where: {
          sizeId_sizeSystemId: {
            sizeId: size.id,
            sizeSystemId: sizeSystem.id,
          },
        },
      });

      // Solo usamos el campo value que sabemos que existe
      // Ignoramos description ya que no está en el modelo actual
      console.log(
        `Importando valor de talla: ${dato.value} para ${dato.originalSize} (ignorando campos adicionales)`
      );

      if (dato.description) {
        console.log(
          `Nota: El campo description "${dato.description}" no será importado porque no existe en el modelo.`
        );
      }

      // 4. Crear o actualizar el valor de talla (solo con campos existentes)
      const resultado = await sizeValueModel.upsert({
        where: {
          sizeId_sizeSystemId: {
            sizeId: size.id,
            sizeSystemId: sizeSystem.id,
          },
        },
        update: { value: dato.value },
        create: {
          value: dato.value,
          size: { connect: { id: size.id } },
          sizeSystem: { connect: { id: sizeSystem.id } },
        },
      });

      if (resultado.id > 0) {
        const estaCreando = !existente;
        console.log(
          `✅ Valor de talla ${resultado.id} (${dato.value}) ${
            estaCreando ? "creado" : "actualizado"
          } correctamente`
        );
        dato.id = resultado.id;

        // Incrementar el contador correspondiente
        if (estaCreando) {
          resultados.creados++;
        } else {
          resultados.actualizados++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error al procesar valor de talla ${dato.value}: ${error.message}`
      );
      resultados.fallidos.push({
        datos: dato,
        error: error.message,
      });
    }
  }
}

module.exports = {
  importar,
  guardarLog,
};
