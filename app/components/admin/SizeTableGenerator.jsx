"use client";
import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faSpinner,
  faTable,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";

export default function SizeTableGenerator() {
  const tableRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Datos para los selectores
  const [intCategories, setIntCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [genders, setGenders] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filtros seleccionados
  const [selectedIntCategory, setSelectedIntCategory] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  // Datos de la tabla generada
  const [tableData, setTableData] = useState(null);
  const [sizeSystems, setSizeSystems] = useState([]);

  // Unidad de medida (cm/inch)
  const [unit, setUnit] = useState("cm");

  // Cargar datos iniciales
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [intCatRes, suppRes, genderRes, catRes, sizeSystemRes] =
        await Promise.all([
          fetch("/api/crud/intcategory?pageSize=100"),
          fetch("/api/crud/supplier?pageSize=100"),
          fetch("/api/crud/gender?pageSize=100"),
          fetch("/api/crud/category?pageSize=100"),
          fetch("/api/crud/sizesystem?pageSize=100"),
        ]);

      const [intCatData, suppData, genderData, catData, sizeSystemData] =
        await Promise.all([
          intCatRes.json(),
          suppRes.json(),
          genderRes.json(),
          catRes.json(),
          sizeSystemRes.json(),
        ]);

      setIntCategories(intCatData.items || []);
      setSuppliers(suppData.items || []);
      setGenders(genderData.items || []);
      setCategories(catData.items || []);
      setSizeSystems(sizeSystemData.items || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error al cargar los datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  // Generar tabla de tallas
  const generateTable = async () => {
    if (!selectedIntCategory && !selectedSupplier && !selectedGender) {
      setError("Selecciona al menos un filtro");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Construir query params para filtrar sizes
      const params = new URLSearchParams();
      params.append("pageSize", "1000"); // Obtener todas las tallas posibles

      if (selectedSupplier) {
        params.append("supplierId", selectedSupplier);
      }

      // Obtener todas las tallas
      const sizesRes = await fetch(`/api/crud/size?${params.toString()}`);
      const sizesData = await sizesRes.json();
      let sizes = sizesData.items || [];

      // Filtrar por género si está seleccionado
      if (selectedGender) {
        sizes = sizes.filter(
          (size) => size.category?.genderId === parseInt(selectedGender)
        );
      }

      // Filtrar por IntCategory si está seleccionado
      if (selectedIntCategory) {
        const intCat = intCategories.find(
          (ic) => ic.id === parseInt(selectedIntCategory)
        );
        if (intCat) {
          // Obtener IDs de categorías vinculadas a esta IntCategory
          const linkedCategoryIds = intCat.categories?.map((c) => c.id) || [];
          sizes = sizes.filter((size) =>
            linkedCategoryIds.includes(size.categoryId)
          );
        }
      }

      // Obtener los sistemas de tallas únicos de las tallas filtradas
      const uniqueSystemIds = [
        ...new Set(
          sizes.flatMap((s) => s.sizeValues?.map((sv) => sv.sizeSystemId) || [])
        ),
      ];
      const relevantSystems = sizeSystems.filter((sys) =>
        uniqueSystemIds.includes(sys.id)
      );

      // Agrupar y organizar datos
      const organizedData = organizeSizeData(sizes, relevantSystems);
      setTableData(organizedData);
    } catch (err) {
      console.error("Error generating table:", err);
      setError("Error al generar la tabla de tallas");
    } finally {
      setGenerating(false);
    }
  };

  // Organizar datos de tallas para la tabla
  const organizeSizeData = (sizes, systems) => {
    if (!sizes.length) return null;

    // Obtener info del filtro para el título
    const supplier = suppliers.find(
      (s) => s.id === parseInt(selectedSupplier)
    );
    const gender = genders.find((g) => g.id === parseInt(selectedGender));
    const intCategory = intCategories.find(
      (ic) => ic.id === parseInt(selectedIntCategory)
    );

    // Crear mapa de tallas ordenadas por displayOrder o originalSize
    const sortedSizes = [...sizes].sort((a, b) => {
      if (a.displayOrder !== null && b.displayOrder !== null) {
        return a.displayOrder - b.displayOrder;
      }
      return (a.originalSize || "").localeCompare(b.originalSize || "", "es", {
        numeric: true,
      });
    });

    // Crear filas: cada sistema de tallas es una fila
    const rows = systems.map((system) => ({
      systemName: system.systemName,
      systemId: system.id,
      values: sortedSizes.map((size) => {
        const sizeValue = size.sizeValues?.find(
          (sv) => sv.sizeSystemId === system.id
        );
        return sizeValue?.value || "-";
      }),
    }));

    return {
      title: intCategory?.name || "Guía de Tallas",
      referenceId: intCategory?.referenceId || "",
      supplier: supplier?.name || "Todos los proveedores",
      gender: gender?.name || "Todos los géneros",
      columns: sortedSizes.map((s) => s.originalSize),
      rows,
      systems,
    };
  };

  // Estado para indicar si está descargando
  const [downloading, setDownloading] = useState(false);

  // Descargar como imagen usando html2canvas
  const downloadAsImage = async () => {
    if (!tableRef.current) return;

    setDownloading(true);
    setError(null);

    try {
      // Importar html2canvas dinámicamente
      let html2canvas;
      try {
        const module = await import("html2canvas");
        html2canvas = module.default || module;
      } catch (importErr) {
        console.error("Error importing html2canvas:", importErr);
        setError(
          "Error: html2canvas no está instalado. Ejecuta: npm install html2canvas && npm run build"
        );
        setDownloading(false);
        return;
      }

      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Mayor resolución
        useCORS: true,
        logging: false,
        windowWidth: tableRef.current.scrollWidth,
        windowHeight: tableRef.current.scrollHeight,
      });

      // Crear link de descarga
      const link = document.createElement("a");
      const fileName = `size-guide-${tableData?.referenceId || "table"}-${
        tableData?.supplier || "all"
      }.png`;
      link.download = fileName.replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error downloading image:", err);
      setError(
        "Error al generar la imagen. Asegúrate de haber ejecutado: npm install html2canvas && npm run build"
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FontAwesomeIcon
          icon={faSpinner}
          className="animate-spin h-12 w-12 text-indigo-600"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración de la Tabla
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Selector IntCategory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría Interna (Reference ID)
            </label>
            <select
              value={selectedIntCategory}
              onChange={(e) => setSelectedIntCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="">Todas las categorías</option>
              {intCategories.map((ic) => (
                <option key={ic.id} value={ic.id}>
                  {ic.name} ({ic.referenceId})
                </option>
              ))}
            </select>
          </div>

          {/* Selector Proveedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor / Marca
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selector Género */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Género
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="">Todos los géneros</option>
              {genders.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={generateTable}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="animate-spin mr-2"
                />
                Generando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTable} className="mr-2" />
                Generar Tabla
              </>
            )}
          </button>

          {tableData && (
            <button
              onClick={downloadAsImage}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin mr-2"
                  />
                  Generando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faDownload} className="mr-2" />
                  Descargar Imagen
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Vista previa de la tabla */}
      {tableData && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Vista Previa
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Unidad:</span>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => setUnit("cm")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                    unit === "cm"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  cm
                </button>
                <button
                  onClick={() => setUnit("inch")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                    unit === "inch"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  inch
                </button>
              </div>
            </div>
          </div>

          {/* Tabla para exportar — replica el estilo de la grilla HTML de la ficha */}
          <div
            ref={tableRef}
            className="bg-white"
            style={{ minWidth: "400px", maxWidth: "700px" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-5 py-3.5 text-left text-[13px] font-bold text-white">
                      Talla original
                    </th>
                    {tableData.rows.map((row, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-3.5 text-center text-[13px] font-bold text-white"
                      >
                        {row.systemName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.columns.map((originalSize, sizeIdx) => (
                    <tr
                      key={sizeIdx}
                      className="border-b border-gray-200"
                    >
                      <td className="px-5 py-3 text-sm font-bold text-slate-800">
                        {originalSize}
                      </td>
                      {tableData.rows.map((row, systemIdx) => (
                        <td
                          key={systemIdx}
                          className="px-3 py-3 text-center text-sm text-gray-600"
                        >
                          {row.values[sizeIdx] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje si no hay datos */}
      {!tableData && !generating && (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FontAwesomeIcon
            icon={faTable}
            className="h-12 w-12 text-gray-400 mb-4"
          />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay tabla generada
          </h3>
          <p className="text-gray-500">
            Selecciona los filtros y haz clic en "Generar Tabla" para crear una
            guía de tallas.
          </p>
        </div>
      )}
    </div>
  );
}
