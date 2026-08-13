"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboard,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faTrash,
  faSave,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";

export default function IntCategoryPasteImporter({ onImportComplete }) {
  const [pastedData, setPastedData] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    referenceId: null,
    name: null,
  });
  const [editableData, setEditableData] = useState([]);

  // Parsear datos pegados (formato Excel con tabs)
  const parseExcelData = (text) => {
    if (!text.trim()) {
      setParsedData(null);
      setEditableData([]);
      return;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setError("Se necesitan al menos 2 filas (encabezados + datos)");
      return;
    }

    // Primera fila son los headers
    const headers = lines[0].split("\t").map((h) => h.trim());

    // Resto son los valores
    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split("\t").map((v) => v.trim());
      return {
        _rowIndex: idx,
        ...headers.reduce((obj, header, colIdx) => {
          obj[header] = values[colIdx] || "";
          return obj;
        }, {}),
      };
    });

    // Filtrar filas vacías
    const validRows = rows.filter((row) =>
      Object.entries(row)
        .filter(([k]) => k !== "_rowIndex")
        .some(([_, v]) => v !== "")
    );

    // Intentar mapear automáticamente los headers
    const autoMapping = { referenceId: null, name: null };
    headers.forEach((header, idx) => {
      const lowerHeader = header.toLowerCase();
      if (
        lowerHeader.includes("reference") ||
        lowerHeader.includes("ref") ||
        lowerHeader === "id" ||
        lowerHeader === "codigo" ||
        lowerHeader === "código"
      ) {
        autoMapping.referenceId = header;
      }
      if (
        lowerHeader.includes("name") ||
        lowerHeader.includes("nombre") ||
        lowerHeader === "descripcion" ||
        lowerHeader === "descripción" ||
        lowerHeader === "categoria" ||
        lowerHeader === "categoría"
      ) {
        autoMapping.name = header;
      }
    });

    // Si solo hay 2 columnas, asumir referenceId y name
    if (headers.length === 2 && !autoMapping.referenceId && !autoMapping.name) {
      autoMapping.referenceId = headers[0];
      autoMapping.name = headers[1];
    }

    setColumnMapping(autoMapping);
    setParsedData({ headers, rows: validRows });
    setEditableData(validRows);
    setError(null);
  };

  // Manejar cambio en el textarea
  const handlePasteChange = (e) => {
    const text = e.target.value;
    setPastedData(text);
    parseExcelData(text);
  };

  // Actualizar mapeo de columnas
  const handleMappingChange = (field, header) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: header || null,
    }));
  };

  // Editar valor en la tabla
  const handleEditValue = (rowIndex, field, value) => {
    setEditableData((prev) =>
      prev.map((row) =>
        row._rowIndex === rowIndex ? { ...row, [field]: value } : row
      )
    );
  };

  // Eliminar fila
  const handleDeleteRow = (rowIndex) => {
    setEditableData((prev) => prev.filter((row) => row._rowIndex !== rowIndex));
  };

  // Importar las IntCategories
  const handleImport = async () => {
    if (!editableData.length) {
      setError("No hay datos para importar");
      return;
    }

    if (!columnMapping.referenceId || !columnMapping.name) {
      setError("Debes mapear las columnas 'referenceId' y 'name'");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    let created = 0;
    let updated = 0;
    let errors = [];

    for (const row of editableData) {
      const referenceId = row[columnMapping.referenceId];
      const name = row[columnMapping.name];

      if (!referenceId || !name) {
        errors.push(`Fila incompleta: referenceId="${referenceId}", name="${name}"`);
        continue;
      }

      try {
        // Verificar si ya existe
        const checkRes = await fetch(
          `/api/crud/intcategory?pageSize=1&referenceId=${encodeURIComponent(referenceId)}`
        );
        const checkData = await checkRes.json();
        
        // Buscar coincidencia exacta en los resultados
        const existing = checkData.items?.find(
          (item) => item.referenceId === referenceId
        );

        if (existing) {
          // Actualizar existente
          const response = await fetch(`/api/crud/intcategory/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referenceId,
              name,
              categories: existing.categories?.map((c) => c.id) || [],
            }),
          });

          if (response.ok) {
            updated++;
          } else {
            const errData = await response.json();
            errors.push(`${referenceId}: ${errData.error || "Error al actualizar"}`);
          }
        } else {
          // Crear nuevo
          const response = await fetch("/api/crud/intcategory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referenceId,
              name,
            }),
          });

          if (response.ok) {
            created++;
          } else {
            const errData = await response.json();
            errors.push(`${referenceId}: ${errData.error || "Error al crear"}`);
          }
        }
      } catch (err) {
        errors.push(`${referenceId}: ${err.message}`);
      }
    }

    if (created > 0 || updated > 0) {
      const messages = [];
      if (created > 0) messages.push(`${created} creadas`);
      if (updated > 0) messages.push(`${updated} actualizadas`);
      setSuccess(`✅ IntCategories: ${messages.join(", ")}`);
      if (onImportComplete) onImportComplete();
    }

    if (errors.length > 0) {
      setError(
        `Errores (${errors.length}): ${errors.slice(0, 3).join("; ")}${
          errors.length > 3 ? "..." : ""
        }`
      );
    }

    setImporting(false);
  };

  // Limpiar todo
  const handleClear = () => {
    setPastedData("");
    setParsedData(null);
    setEditableData([]);
    setColumnMapping({ referenceId: null, name: null });
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
referenceId	name
TOPS	Camisetas y Tops
PANTS	Pantalones
SHOES	Calzado
DRESSES	Vestidos`}
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

      {/* Vista previa y mapeo */}
      {parsedData && (
        <div className="space-y-4">
          {/* Mapeo de columnas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Mapear columnas a campos de IntCategory:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mapeo referenceId */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  referenceId (identificador único) *
                </label>
                <select
                  value={columnMapping.referenceId || ""}
                  onChange={(e) =>
                    handleMappingChange("referenceId", e.target.value)
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md ${
                    columnMapping.referenceId
                      ? "border-green-500 bg-green-50"
                      : "border-red-300 bg-red-50"
                  } text-gray-900`}
                >
                  <option value="">-- Selecciona columna --</option>
                  {parsedData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mapeo name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  name (nombre descriptivo) *
                </label>
                <select
                  value={columnMapping.name || ""}
                  onChange={(e) => handleMappingChange("name", e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md ${
                    columnMapping.name
                      ? "border-green-500 bg-green-50"
                      : "border-red-300 bg-red-50"
                  } text-gray-900`}
                >
                  <option value="">-- Selecciona columna --</option>
                  {parsedData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vista previa editable */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">
                Vista previa ({editableData.length} registros)
              </h4>
              <span className="text-xs text-gray-500">
                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                Puedes editar los valores antes de importar
              </span>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10">
                      #
                    </th>
                    <th
                      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                        columnMapping.referenceId
                          ? "text-green-700 bg-green-50"
                          : "text-gray-500"
                      }`}
                    >
                      referenceId
                      {columnMapping.referenceId && (
                        <span className="ml-1 text-xs font-normal">
                          ({columnMapping.referenceId})
                        </span>
                      )}
                    </th>
                    <th
                      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                        columnMapping.name
                          ? "text-green-700 bg-green-50"
                          : "text-gray-500"
                      }`}
                    >
                      name
                      {columnMapping.name && (
                        <span className="ml-1 text-xs font-normal">
                          ({columnMapping.name})
                        </span>
                      )}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editableData.map((row, idx) => (
                    <tr
                      key={row._rowIndex}
                      className={idx % 2 === 0 ? "" : "bg-gray-50"}
                    >
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          value={
                            columnMapping.referenceId
                              ? row[columnMapping.referenceId] || ""
                              : ""
                          }
                          onChange={(e) =>
                            columnMapping.referenceId &&
                            handleEditValue(
                              row._rowIndex,
                              columnMapping.referenceId,
                              e.target.value
                            )
                          }
                          disabled={!columnMapping.referenceId}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          value={
                            columnMapping.name ? row[columnMapping.name] || "" : ""
                          }
                          onChange={(e) =>
                            columnMapping.name &&
                            handleEditValue(
                              row._rowIndex,
                              columnMapping.name,
                              e.target.value
                            )
                          }
                          disabled={!columnMapping.name}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row._rowIndex)}
                          className="text-red-500 hover:text-red-700"
                          title="Eliminar fila"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={
                importing ||
                !columnMapping.referenceId ||
                !columnMapping.name ||
                editableData.length === 0
              }
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
                  Importar {editableData.length} IntCategories
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

          {(!columnMapping.referenceId || !columnMapping.name) && (
            <p className="text-sm text-amber-600">
              ⚠️ Debes mapear las columnas "referenceId" y "name" antes de importar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
