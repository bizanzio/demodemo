#!/usr/bin/env node

/**
 * CLI para importación de datos CSV
 */
const path = require("path");
const fs = require("fs");
const yargs = require("yargs");
const { importarDesdeCSV } = require("./index");

// Configurar argumentos de línea de comandos
const argv = yargs
  .usage("Uso: $0 --entidad [entidad] --archivo [ruta_archivo] [opciones]")
  .option("entidad", {
    alias: "e",
    describe: "Tipo de entidad a importar",
    choices: [
      "sizeSystem",
      "supplier",
      "gender",
      "int_category",
      "category",
      "size",
      "sizeValue",
      "all",
    ],
    demandOption: true,
  })
  .option("archivo", {
    alias: "f",
    describe: "Ruta del archivo CSV a importar",
    type: "string",
    demandOption: true,
  })
  .option("config", {
    alias: "c",
    describe: "Ruta al archivo JSON de configuración de columnas",
    type: "string",
  })
  .option("log", {
    alias: "l",
    describe: "Guardar log en archivo",
    type: "boolean",
    default: false,
  })
  .option("logFile", {
    describe: "Nombre del archivo de log",
    type: "string",
    default: "import-log.json",
  })
  .option("directory", {
    alias: "d",
    describe: 'Directorio de trabajo (para entidad "all")',
    type: "string",
  })
  .help()
  .alias("help", "h")
  .example("$0 --entidad sizeSystem --archivo ./data/sizesystems.csv")
  .example("$0 --entidad all --directory ./data").argv;

/**
 * Función principal
 */
async function main() {
  try {
    console.log("🚀 Iniciando importación CSV...");

    // Cargar configuración personalizada si existe
    let configuracion = null;
    if (argv.config) {
      try {
        const configData = fs.readFileSync(argv.config, "utf8");
        configuracion = JSON.parse(configData);
        console.log(`✅ Configuración cargada desde ${argv.config}`);
      } catch (error) {
        console.error(`❌ Error al cargar configuración: ${error.message}`);
        process.exit(1);
      }
    }

    // Si se solicita importar todas las entidades
    if (argv.entidad === "all") {
      if (!argv.directory) {
        console.error(
          "❌ Para importar todas las entidades, debe especificar un directorio con --directory"
        );
        process.exit(1);
      }

      await importarTodo(argv.directory, configuracion);
    } else {
      // Importar una sola entidad
      const resultado = await importarDesdeCSV({
        entidad: argv.entidad,
        archivo: argv.archivo,
        configuracion,
        logToFile: argv.log,
        logFile: argv.logFile,
      });

      // Mostrar resumen
      mostrarResumen(resultado);
    }

    console.log("✅ Proceso de importación finalizado");
  } catch (error) {
    console.error(`❌ Error en proceso de importación: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Importa todas las entidades desde archivos en un directorio
 * @param {string} directorio - Directorio con archivos CSV
 * @param {Object} configuracion - Configuración de columnas
 */
async function importarTodo(directorio, configuracion) {
  // Orden de importación para respetar dependencias
  const ordenEntidades = [
    { entidad: "sizeSystem", archivo: "sizesystems.csv" },
    { entidad: "supplier", archivo: "suppliers.csv" },
    { entidad: "gender", archivo: "genders.csv" },
    { entidad: "int_category", archivo: "int_categories.csv" },
    { entidad: "category", archivo: "categories.csv" },
    { entidad: "size", archivo: "sizes.csv" },
    { entidad: "sizeValue", archivo: "sizevalues.csv" },
  ];

  const resultados = [];

  for (const item of ordenEntidades) {
    const rutaArchivo = path.join(directorio, item.archivo);

    // Verificar si existe el archivo
    if (!fs.existsSync(rutaArchivo)) {
      console.warn(
        `⚠️ Archivo ${rutaArchivo} no encontrado, saltando importación de ${item.entidad}`
      );
      continue;
    }

    console.log(`\n📄 Procesando ${item.entidad} desde ${rutaArchivo}...`);

    try {
      const resultado = await importarDesdeCSV({
        entidad: item.entidad,
        archivo: rutaArchivo,
        configuracion: configuracion ? configuracion[item.entidad] : null,
        logToFile: argv.log,
        logFile: argv.logFile,
      });

      resultados.push(resultado);
    } catch (error) {
      console.error(`❌ Error al importar ${item.entidad}: ${error.message}`);
      // Continuar con la siguiente entidad
    }
  }

  // Mostrar resumen global
  console.log("\n📊 RESUMEN GLOBAL:");
  resultados.forEach((r) => {
    console.log(
      `${r.entidad}: ${r.resultados.creados} creados, ${r.resultados.actualizados} actualizados, ${r.resultados.fallidos.length} fallidos`
    );
  });
}

/**
 * Muestra un resumen de la importación
 * @param {Object} resultado - Resultado de la importación
 */
function mostrarResumen(resultado) {
  console.log("\n📊 RESUMEN:");
  console.log(`Entidad: ${resultado.entidad}`);
  console.log(`Archivo: ${resultado.archivo}`);
  console.log(`Total registros: ${resultado.resultados.total}`);
  console.log(`Creados: ${resultado.resultados.creados}`);
  console.log(`Actualizados: ${resultado.resultados.actualizados}`);
  console.log(`Fallidos: ${resultado.resultados.fallidos.length}`);

  if (resultado.resultados.fallidos.length > 0) {
    console.log("\n⚠️ DETALLES DE ERRORES:");
    resultado.resultados.fallidos.forEach((f, i) => {
      console.log(`\nError ${i + 1}:`);
      console.log(`Datos: ${JSON.stringify(f.datos)}`);
      console.log(`Error: ${f.error}`);
    });
  }
}

// Ejecutar el programa
main();
