"use client";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboard,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faTrash,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

export default function ExcelPasteImporter({
  onImportComplete,
  supplierId,
  categoryId,
}) {
  const [pastedData, setPastedData] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [sizeSystems, setSizeSystems] = useState([]);
  const [systemMapping, setSystemMapping] = useState({});
  const [primarySystem, setPrimarySystem] = useState(""); // Sistema principal para sizeSystemId

  // Cargar sistemas de tallas disponibles
  useEffect(() => {
    fetchSizeSystems();
  }, []);

  const fetchSizeSystems = async () => {
    try {
      const res = await fetch("/api/crud/sizesystem?pageSize=100");
      const data = await res.json();
      setSizeSystems(data.items || []);
    } catch (err) {
      console.error("Error loading size systems:", err);
    }
  };

  // Parsear datos pegados (formato Excel con tabs)
  const parseExcelData = (text) => {
    if (!text.trim()) {
      setParsedData(null);
      return;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setError("Se necesitan al menos 2 filas (encabezados + datos)");
      return;
    }

    // Primera fila son los nombres de sistemas de tallas
    const headers = lines[0].split("\t").map((h) => h.trim());

    // Resto son los valores de tallas
    const rows = lines.slice(1).map((line) => {
      const values = line.split("\t").map((v) => v.trim());
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] || "";
        return obj;
      }, {});
    });

    // Filtrar filas vacías
    const validRows = rows.filter((row) =>
      Object.values(row).some((v) => v !== "")
    );

    // Intentar mapear automáticamente los headers a sistemas existentes
    const autoMapping = {};
    headers.forEach((header) => {
      const match = sizeSystems.find(
        (sys) =>
          sys.systemName.toLowerCase() === header.toLowerCase() ||
          sys.systemName.toLowerCase().includes(header.toLowerCase()) ||
          header.toLowerCase().includes(sys.systemName.toLowerCase())
      );
      if (match) {
        autoMapping[header] = match.id;
      }
    });

    setSystemMapping(autoMapping);
    setParsedData({ headers, rows: validRows });
    setError(null);

    // Auto-seleccionar el primer sistema mapeado como principal
    const firstMappedSystem = Object.values(autoMapping).find((v) => v !== null);
    if (firstMappedSystem) {
      setPrimarySystem(firstMappedSystem.toString());
    }
  };

  // Manejar cambio en el textarea (incluye paste)
  const handlePasteChange = (e) => {
    const text = e.target.value;
    setPastedData(text);
    parseExcelData(text);
  };

  // Actualizar mapeo de sistema
  const handleMappingChange = (header, systemId) => {
    setSystemMapping((prev) => ({
      ...prev,
      [header]: systemId ? parseInt(systemId) : null,
    }));
  };

  // Importar las tallas
  const handleImport = async () => {
    if (!parsedData || !supplierId || !categoryId) {
      setError("Faltan datos requeridos (proveedor o categoría)");
      return;
    }

    // Verificar que al menos un sistema esté mapeado
    const mappedHeaders = Object.entries(systemMapping).filter(
      ([_, v]) => v !== null
    );
    if (mappedHeaders.length === 0) {
      setError("Debes mapear al menos un sistema de tallas");
      return;
    }

    // Verificar que hay un sistema principal seleccionado
    if (!primarySystem) {
      setError("Debes seleccionar un sistema de tallas principal");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);
    setImportProgress({ total: parsedData.rows.length, completed: 0, created: 0, failed: 0 });

    try {
      let created = 0;
      let errors = [];

      // Determinar qué columna usar como "originalSize"
      // Usamos la columna del sistema principal
      const primaryHeader = Object.entries(systemMapping).find(
        ([_, systemId]) => systemId === parseInt(primarySystem)
      )?.[0] || mappedHeaders[0]?.[0] || parsedData.headers[0];

      for (const row of parsedData.rows) {
        const originalSize = row[primaryHeader];
        if (!originalSize) continue;

        // Construir sizeValues array
        const sizeValues = [];
        for (const [header, systemId] of Object.entries(systemMapping)) {
          if (systemId && row[header]) {
            sizeValues.push({
              sizeSystemId: systemId,
              value: row[header],
            });
          }
        }

        if (sizeValues.length === 0) continue;

        // Crear la talla con sizeSystemId principal
        try {
          const response = await fetch("/api/crud/size", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalSize,
              supplierId: parseInt(supplierId),
              categoryId: parseInt(categoryId),
              sizeSystemId: parseInt(primarySystem), // Sistema principal
              displayOrder: created + 1,
              sizeValues,
            }),
          });

          if (response.ok) {
            created++;
          } else {
            const errData = await response.json();
            errors.push(`${originalSize}: ${errData.error || "Error"}`);
          }
        } catch (err) {
          errors.push(`${originalSize}: ${err.message}`);
        } finally {
          const processed = created + errors.length;
          setImportProgress({
            total: parsedData.rows.length,
            completed: processed,
            created,
            failed: errors.length,
          });
        }
      }

      if (created > 0) {
        setSuccess(`✅ ${created} tallas importadas correctamente`);
        if (onImportComplete) onImportComplete();
      }

      if (errors.length > 0) {
        setError(`Errores: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`);
      }
    } catch (err) {
      setError("Error al importar: " + err.message);
    } finally {
      setImporting(false);
      setTimeout(() => {
        setImportProgress(null);
      }, 1500);
    }
  };

  // Limpiar todo
  const handleClear = () => {
    setPastedData("");
    setParsedData(null);
    setSystemMapping({});
    setPrimarySystem("");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-4">
      {/* Área de pegado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pega aquí los datos desde Excel (Ctrl+V)
        </label>
        <div className="relative">
          <textarea
            value={pastedData}
            onChange={handlePasteChange}
            placeholder={`Pega los datos de Excel aquí...

Ejemplo:
US	EU	UK
5	37.5	4
5.5	38	4.5
6	38.5	5`}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-mono text-sm"
          />
          {!pastedData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <FontAwesomeIcon icon={faClipboard} className="h-8 w-8 mb-2" />
                <p>Ctrl+V para pegar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-start gap-2">
          <FontAwesomeIcon icon={faCheck} className="mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {importProgress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm flex items-start gap-2">
          <FontAwesomeIcon icon={faSpinner} className="mt-0.5 animate-spin" />
          <span>
            Procesando importación: {importProgress.completed}/{importProgress.total}
            {" · "}
            Creadas: {importProgress.created}
            {" · "}
            Errores: {importProgress.failed}
          </span>
        </div>
      )}

      {/* Vista previa y mapeo */}
      {parsedData && (
        <div className="space-y-4">
          {/* Mapeo de sistemas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Mapear columnas a sistemas de tallas:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {parsedData.headers.map((header) => (
                <div key={header} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">
                    {header}
                  </label>
                  <select
                    value={systemMapping[header] || ""}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className={`px-2 py-1.5 text-sm border rounded-md ${
                      systemMapping[header]
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300"
                    } text-gray-900`}
                  >
                    <option value="">-- Sin mapear --</option>
                    {sizeSystems.map((sys) => (
                      <option key={sys.id} value={sys.id}>
                        {sys.systemName}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Selector de sistema principal */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sistema de tallas principal (para originalSize y sizeSystemId):
              </label>
              <select
                value={primarySystem}
                onChange={(e) => setPrimarySystem(e.target.value)}
                className={`w-full md:w-64 px-3 py-2 text-sm border rounded-md ${
                  primarySystem
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-300"
                } text-gray-900`}
              >
                <option value="">-- Selecciona sistema principal --</option>
                {Object.entries(systemMapping)
                  .filter(([_, v]) => v !== null)
                  .map(([header, systemId]) => {
                    const sys = sizeSystems.find((s) => s.id === systemId);
                    return (
                      <option key={systemId} value={systemId}>
                        {sys?.systemName || header} (columna: {header})
                      </option>
                    );
                  })}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Este sistema se usará como el valor de "originalSize" y "sizeSystemId" de cada talla
              </p>
            </div>
          </div>

          {/* Vista previa de datos */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">
                Vista previa ({parsedData.rows.length} tallas)
              </h4>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {parsedData.headers.map((header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                          systemMapping[header]
                            ? "text-green-700 bg-green-50"
                            : "text-gray-500"
                        }`}
                      >
                        {header}
                        {systemMapping[header] && (
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="ml-1 text-green-500"
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "" : "bg-gray-50"}>
                      {parsedData.headers.map((header) => (
                        <td
                          key={header}
                          className="px-3 py-2 whitespace-nowrap text-sm text-gray-700"
                        >
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedData.rows.length > 10 && (
                    <tr>
                      <td
                        colSpan={parsedData.headers.length}
                        className="px-3 py-2 text-center text-sm text-gray-500"
                      >
                        ... y {parsedData.rows.length - 10} filas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || !supplierId || !categoryId || !primarySystem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin mr-2"
                  />
                  Importando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Importar {parsedData.rows.length} Tallas
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Limpiar
            </button>
          </div>

          {(!supplierId || !categoryId || !primarySystem) && (
            <p className="text-sm text-amber-600">
              ⚠️ Debes seleccionar: proveedor, categoría y sistema de tallas principal antes de importar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
