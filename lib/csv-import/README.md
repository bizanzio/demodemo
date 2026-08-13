# Módulo de Importación CSV

Este módulo permite importar datos desde archivos CSV para poblar el modelo de datos relacionado con tallas, proveedores, categorías, etc.

## Instalación

El módulo ya viene incluido en el proyecto. Las dependencias necesarias son:

```bash
npm install csv-parser fs-extra commander dotenv yargs
```

## Uso básico

### Desde la línea de comandos

```bash
# Importar un solo tipo de entidad
node lib/csv-import/cli.js --entidad sizeSystem --archivo ./data/csv-samples/sizesystems.csv

# Importar todas las entidades desde una carpeta
node lib/csv-import/cli.js --entidad all --directory ./data/csv-samples

# Usar un archivo de configuración para mapeo de columnas
node lib/csv-import/cli.js --entidad supplier --archivo ./data/csv-samples/spanish/proveedores.csv --config ./lib/csv-import/config-example.json

# Guardar log en un archivo
node lib/csv-import/cli.js --entidad sizeSystem --archivo ./data/csv-samples/sizesystems.csv --log --logFile import-results.json
```

### Desde código JavaScript

```javascript
const { importarDesdeCSV } = require("./lib/csv-import");

async function main() {
  try {
    // Importar una entidad
    const resultado = await importarDesdeCSV({
      entidad: "sizeSystem",
      archivo: "./data/csv-samples/sizesystems.csv",
      logToFile: true,
    });

    console.log(`Importación completada: ${JSON.stringify(resultado)}`);
  } catch (error) {
    console.error("Error en importación:", error);
  }
}

main();
```

## Estructura de archivos CSV

### sizesystems.csv

```
systemName,isDefault
EU,false
US,true
```

### suppliers.csv

```
name
Nike
Adidas
```

### genders.csv

```
name
Men
Women
```

### int_categories.csv

```
referenceId,name
SHOES-RUN-001,Shoes
JACK-OUT-001,Jackets
```

### categories.csv

```
name,supplierName,genderName,originSystemName,predefinedSystemName,intCategoryReferenceId
Running,Nike,Men,EU,US,1234
```

### sizes.csv

```
originalSize,displayOrder,supplierName,categoryName,sizeSystemName
S,1,Nike,Running,EU
M,2,Nike,Running,EU
```

### sizevalues.csv

```
value,originalSize,sizeSystemName
38,S,EU
40,M,EU
```

## Configuración personalizada

Si tus archivos CSV tienen nombres de columnas diferentes a los esperados, puedes usar un archivo de configuración JSON para mapear los nombres:

```json
{
  "sizeSystem": {
    "nombre_sistema": "systemName",
    "es_default": "isDefault"
  },
  "supplier": {
    "proveedor": "name"
  }
}
```

## Orden de importación

Cuando se importan todas las entidades (`--entidad all`), el orden es el siguiente:

1. SizeSystem
2. Supplier
3. Gender
4. Int_Category
5. Category
6. Size
7. SizeValue

Este orden respeta las dependencias entre las entidades.

## Registros de la importación

Los resultados de la importación se muestran en la consola y pueden guardarse en un archivo JSON para su consulta posterior utilizando la opción `--log`.
