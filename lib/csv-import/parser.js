/**
 * Módulo para parsear archivos CSV
 */

const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

/**
 * Parsea un archivo CSV a un array de objetos
 * @param {string} archivo - Ruta del archivo CSV a parsear
 * @param {Object} [configuracion] - Configuración personalizada de columnas
 * @returns {Promise<Array>} - Array de objetos con los datos del CSV
 */
async function parsearCSV(archivo, configuracion = null) {
  return new Promise((resolve, reject) => {
    const resultados = [];

    // Verificar que el archivo existe
    if (!fs.existsSync(archivo)) {
      return reject(new Error(`El archivo ${archivo} no existe`));
    }

    // Determinar configuración de mapeo de columnas
    const mapeoColumnas = configuracion ? configuracion : {};

    fs.createReadStream(archivo)
      .pipe(
        csv({
          mapHeaders: ({ header }) => {
            // Si hay un mapeo definido para esta columna, usarlo
            return mapeoColumnas[header] || header;
          },
        })
      )
      .on("data", (datos) => {
        // Eliminar espacios en blanco de los valores
        const datosProcesados = {};
        Object.keys(datos).forEach((key) => {
          if (typeof datos[key] === "string") {
            datosProcesados[key] = datos[key].trim();
          } else {
            datosProcesados[key] = datos[key];
          }
        });
        resultados.push(datosProcesados);
      })
      .on("end", () => {
        console.log(
          `📋 Archivo CSV parseado: ${resultados.length} registros encontrados`
        );
        console.log(resultados);
        resolve(resultados);
      })
      .on("error", (error) => {
        console.error(`❌ Error al parsear CSV: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Valida la estructura de los datos para una entidad específica
 * @param {string} entidad - Tipo de entidad a validar
 * @param {Array} datos - Datos a validar
 * @returns {Object} - Resultados de la validación {validos: [], invalidos: []}
 */
function validarDatos(entidad, datos) {
  const resultados = {
    validos: [],
    invalidos: [],
  };

  // Definir esquemas de validación por entidad
  const esquemas = {
    sizeSystem: ["systemName"],
    supplier: ["name"],
    gender: ["name"],
    int_category: ["referenceId", "name"],
    category: ["name", "supplierName", "genderName"],
    size: ["originalSize", "supplierName", "categoryName", "sizeSystemName"],
    sizeValue: ["value", "originalSize", "sizeSystemName"],
  };

  // Verificar que la entidad es válida
  if (!esquemas[entidad]) {
    throw new Error(`Entidad ${entidad} no soportada para validación`);
  }

  // Validar cada registro
  datos.forEach((registro, index) => {
    const camposRequeridos = esquemas[entidad];
    const camposFaltantes = camposRequeridos.filter(
      (campo) => !registro[campo] || registro[campo].toString().trim() === ""
    );

    if (camposFaltantes.length > 0) {
      resultados.invalidos.push({
        indice: index,
        registro: registro,
        errores: `Campos obligatorios faltantes: ${camposFaltantes.join(", ")}`,
      });
    } else {
      resultados.validos.push(registro);
    }
  });

  // Mostrar resultados
  if (resultados.invalidos.length > 0) {
    console.warn(
      `⚠️ Se encontraron ${resultados.invalidos.length} registros inválidos de ${datos.length} total`
    );
  }

  return resultados;
}

module.exports = {
  parsearCSV,
  validarDatos,
};
