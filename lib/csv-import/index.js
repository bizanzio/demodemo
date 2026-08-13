/**
 * Módulo de importación CSV para poblar entidades del modelo Prisma
 */

const csvParser = require("../csv-import/parser");
const dataImporter = require("../csv-import/importer");

/**
 * Importa datos desde archivos CSV
 * @param {Object} options - Opciones de importación
 * @param {string} options.entidad - Tipo de entidad a importar
 * @param {string} options.archivo - Ruta del archivo CSV
 * @param {Object} [options.configuracion] - Configuración personalizada de columnas
 * @param {boolean} [options.logToFile=false] - Si debe guardar logs en archivo
 * @param {string} [options.logFile='import-log.json'] - Nombre del archivo de log
 * @returns {Promise<Object>} - Resultados de la importación
 */
async function importarDesdeCSV(options) {
  try {
    console.log(
      `🔄 Iniciando importación de ${options.entidad} desde ${options.archivo}`
    );

    // 1. Parsear el CSV a objetos
    const datos = await csvParser.parsearCSV(
      options.archivo,
      options.configuracion
    );

    // 2. Importar datos según el tipo de entidad
    const resultado = await dataImporter.importar(options.entidad, datos);

    // 3. Generar informe
    const informe = {
      entidad: options.entidad,
      archivo: options.archivo,
      resultados: resultado,
      timestamp: new Date().toISOString(),
    };

    // 4. Guardar log en archivo si se solicita
    if (options.logToFile) {
      await dataImporter.guardarLog(
        informe,
        options.logFile || "import-log.json"
      );
    }

    console.log(`✅ Importación de ${options.entidad} completada`);
    console.log(
      `📊 Resumen: ${resultado.creados} creados, ${resultado.actualizados} actualizados, ${resultado.fallidos.length} fallidos`
    );

    return informe;
  } catch (error) {
    console.error(`❌ Error en importación: ${error.message}`);
    throw error;
  }
}

module.exports = {
  importarDesdeCSV,
};
