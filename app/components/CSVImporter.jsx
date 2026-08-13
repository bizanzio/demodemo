"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faCheck,
  faSpinner,
  faExclamationTriangle,
  faInfoCircle,
  faFileAlt,
  faExclamationCircle,
  faEye,
  faPencilAlt,
  faKeyboard,
} from "@fortawesome/free-solid-svg-icons";

const ENTITY_TYPES = [
  { value: "sizeSystem", label: "Sistemas de Tallas" },
  { value: "supplier", label: "Proveedores" },
  { value: "gender", label: "Géneros" },
  { value: "int_category", label: "Categorías Internas" },
  { value: "category", label: "Categorías" },
  { value: "size", label: "Tallas" },
  { value: "sizeValue", label: "Valores de Tallas" },
];

// Ejemplos de formato CSV por tipo de entidad
const CSV_EXAMPLES = {
  sizeSystem: `systemName,isDefault
EU,false
US,true
UK,false`,

  supplier: `name
Nike
Adidas
Puma`,

  gender: `name
Men
Women
Unisex
Kids`,

  int_category: `referenceId,name
SHOES-RUN-001,Shoes
JACK-OUT-001,Jackets
PANTS-SPT-001,Pants`,

  category: `name,supplierName,genderName,originSystemName,predefinedSystemName,intCategoryReferenceId
Running,Nike,Men,EU,US,1234
Casual,Nike,Women,EU,US,1234
Winter,Adidas,Men,EU,INT,2345`,

  size: `originalSize,displayOrder,supplierName,categoryName,sizeSystemName
S,1,Nike,Running,EU
M,2,Nike,Running,EU
L,3,Nike,Running,EU`,

  sizeValue: `value,originalSize,sizeSystemName
S,S,EU
M,M,EU
Small,S,US`,
};

export default function CSVImporter() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [customMapping, setCustomMapping] = useState(false);
  const [mappingConfig, setMappingConfig] = useState("{}");
  const [showExample, setShowExample] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvPreview, setCsvPreview] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [inputMethod, setInputMethod] = useState("file"); // "file" o "text"

  const handleEntityChange = (e) => {
    setSelectedEntity(e.target.value);
    setShowExample(true); // Mostrar ejemplo cuando se selecciona una entidad
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Leer el contenido del archivo
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setCsvContent(content);
        parseCSVPreview(content);
      };
      reader.readAsText(selectedFile);
    } else {
      setFile(null);
      setCsvContent("");
      setCsvPreview([]);
    }
  };

  const parseCSVPreview = (csvText) => {
    if (!csvText) {
      setCsvPreview([]);
      return;
    }

    const lines = csvText.split("\n");
    if (lines.length === 0) {
      setCsvPreview([]);
      return;
    }

    // Extraer encabezados y hasta 5 filas para la vista previa
    const headers = lines[0].split(",");
    const rows = lines
      .slice(1, Math.min(6, lines.length))
      .map((line) => line.split(","));

    setCsvPreview({ headers, rows });
  };

  const handleCsvContentChange = (e) => {
    const content = e.target.value;
    setCsvContent(content);
    parseCSVPreview(content);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEntity) {
      setError("Por favor, selecciona una entidad");
      return;
    }

    if (inputMethod === "file" && !file && !csvContent) {
      setError("Por favor, selecciona un archivo CSV");
      return;
    }

    if (inputMethod === "text" && !csvContent) {
      setError("Por favor, introduce el contenido CSV");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("entidad", selectedEntity);

      if (inputMethod === "file" && file) {
        formData.append("archivo", file);
      } else {
        // Crear un archivo Blob a partir del contenido texto si estamos en modo texto o modo edición
        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        const csvFile = new File([csvBlob], "data.csv", { type: "text/csv" });
        formData.append("archivo", csvFile);
      }

      if (customMapping) {
        try {
          const config = JSON.parse(mappingConfig);
          formData.append("config", JSON.stringify(config));
        } catch (err) {
          throw new Error("La configuración de mapeo no es un JSON válido");
        }
      }

      const response = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Error en la importación");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Error al procesar la importación");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para copiar el ejemplo al portapapeles
  const copyExampleToClipboard = () => {
    if (selectedEntity && CSV_EXAMPLES[selectedEntity]) {
      navigator.clipboard
        .writeText(CSV_EXAMPLES[selectedEntity])
        .then(() => {
          alert("Ejemplo copiado al portapapeles");
        })
        .catch((err) => {
          console.error("Error al copiar: ", err);
        });
    }
  };

  // Cargar ejemplo en el editor
  const loadExample = () => {
    if (selectedEntity && CSV_EXAMPLES[selectedEntity]) {
      setCsvContent(CSV_EXAMPLES[selectedEntity]);
      parseCSVPreview(CSV_EXAMPLES[selectedEntity]);
      setInputMethod("text");
      setIsEditing(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Importación de Datos CSV
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de entidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de Datos a Importar
          </label>
          <select
            value={selectedEntity}
            onChange={handleEntityChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Selecciona un tipo...</option>
            {ENTITY_TYPES.map((entity) => (
              <option key={entity.value} value={entity.value}>
                {entity.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ejemplo de formato CSV */}
        {selectedEntity && showExample && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                Formato esperado del CSV:
              </h3>
              <div>
                <button
                  type="button"
                  onClick={loadExample}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                >
                  Usar ejemplo
                </button>
                <button
                  type="button"
                  onClick={copyExampleToClipboard}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Copiar ejemplo
                </button>
              </div>
            </div>
            <pre className="bg-white dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
              {CSV_EXAMPLES[selectedEntity]}
            </pre>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Asegúrate de que tu archivo CSV siga este formato. Las cabeceras
              son obligatorias.
            </p>
          </div>
        )}

        {/* Selector de método de entrada */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setInputMethod("file");
              setIsEditing(false);
            }}
            className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
              inputMethod === "file"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
            }`}
          >
            <FontAwesomeIcon icon={faUpload} className="mr-2" />
            Subir archivo
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMethod("text");
              setIsEditing(true);
            }}
            className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
              inputMethod === "text"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
            }`}
          >
            <FontAwesomeIcon icon={faKeyboard} className="mr-2" />
            Escribir datos
          </button>
        </div>

        {/* Selector de archivo - Visible solo si el método es "file" y no está en modo edición */}
        {inputMethod === "file" && !isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Archivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Sólo archivos CSV. Máx 10MB.
              </p>
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700 flex items-start">
                  <FontAwesomeIcon
                    icon={faExclamationCircle}
                    className="mr-1 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Importante:</strong> El archivo debe ser un CSV puro
                    (valores separados por comas).
                    <br />
                    • No utilices archivos RTF guardados desde TextEdit.
                    <br />
                    • Si usas TextEdit en macOS, convierte primero a "texto sin
                    formato" (Shift+Cmd+T).
                    <br />• Guarda directamente como .csv sin formato adicional.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Previsualización y edición del archivo */}
        {((inputMethod === "file" && csvContent && !isEditing) ||
          (csvPreview.headers &&
            csvPreview.rows &&
            csvPreview.rows.length > 0 &&
            !isEditing)) && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <FontAwesomeIcon icon={faEye} className="mr-2" />
                Vista previa del CSV:
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
              >
                <FontAwesomeIcon icon={faPencilAlt} className="mr-1" />
                Editar contenido
              </button>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {csvPreview.headers &&
                      csvPreview.headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {csvPreview.rows &&
                    csvPreview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Mostrando {csvPreview.rows ? csvPreview.rows.length : 0} de{" "}
              {csvContent.split("\n").length - 1} filas
            </p>
          </div>
        )}

        {/* Editor de texto CSV - visible si está en modo edición o método de entrada "text" */}
        {(isEditing || inputMethod === "text") && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {inputMethod === "text"
                  ? "Introduce los datos CSV:"
                  : "Editar contenido CSV:"}
              </label>
              {isEditing && inputMethod === "file" && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Volver a vista previa
                </button>
              )}
            </div>
            <textarea
              value={csvContent}
              onChange={handleCsvContentChange}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              placeholder={
                selectedEntity && CSV_EXAMPLES[selectedEntity]
                  ? CSV_EXAMPLES[selectedEntity]
                  : "Introduce datos en formato CSV..."
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Cada línea representa una fila, valores separados por comas. La
              primera fila debe contener los encabezados.
            </p>
          </div>
        )}

        {/* Configuración personalizada */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="customMapping"
            checked={customMapping}
            onChange={(e) => setCustomMapping(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label
            htmlFor="customMapping"
            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Usar mapeo personalizado de columnas
          </label>
        </div>

        {customMapping && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuración de Mapeo (JSON)
            </label>
            <textarea
              value={mappingConfig}
              onChange={(e) => setMappingConfig(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              placeholder='{"columna_csv": "campo_modelo"}'
            />
          </div>
        )}

        {/* Botón de envío */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                Importar Datos
              </>
            )}
          </button>
        </div>
      </form>

      {/* Mensajes de Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          <div className="flex">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="h-5 w-5 mr-2 flex-shrink-0"
            />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center mb-3">
            <FontAwesomeIcon
              icon={faCheck}
              className="h-5 w-5 mr-2 text-green-500 flex-shrink-0"
            />
            <h3 className="text-lg font-medium text-green-800 dark:text-green-400">
              Importación completada
            </h3>
          </div>

          <div className="ml-7 text-sm text-green-700 dark:text-green-300">
            <p>
              <strong>Entidad:</strong> {result.entidad}
            </p>
            <p>
              <strong>Total registros:</strong> {result.resultados?.total || 0}
            </p>
            <p>
              <strong>Creados:</strong> {result.resultados?.creados || 0}
            </p>
            <p>
              <strong>Actualizados:</strong>{" "}
              {result.resultados?.actualizados || 0}
            </p>
            <p>
              <strong>Fallidos:</strong>{" "}
              {result.resultados?.fallidos?.length || 0}
            </p>
          </div>

          {result.resultados?.fallidos?.length > 0 && (
            <details className="mt-3 ml-7">
              <summary className="text-sm font-medium text-green-800 dark:text-green-400 cursor-pointer">
                Ver detalles de errores ({result.resultados.fallidos.length})
              </summary>
              <ul className="mt-2 text-xs space-y-1 list-disc list-inside text-red-600 dark:text-red-400">
                {result.resultados.fallidos.map((f, i) => (
                  <li key={i}>
                    {f.error}: {JSON.stringify(f.datos)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
