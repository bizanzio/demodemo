"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import ExcelPasteImporter from "@/app/components/admin/ExcelPasteImporter";
import LogoutButton from "@/app/components/admin/LogoutButton";

export default function ImportSizesPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar categorías cuando cambia el proveedor
  useEffect(() => {
    if (selectedSupplier) {
      const filtered = categories.filter(
        (cat) => cat.supplierId === parseInt(selectedSupplier)
      );
      setFilteredCategories(filtered);
      setSelectedCategory("");
    } else {
      setFilteredCategories(categories);
    }
  }, [selectedSupplier, categories]);

  const fetchData = async () => {
    try {
      const [suppRes, catRes] = await Promise.all([
        fetch("/api/crud/supplier?pageSize=100"),
        fetch("/api/crud/category?pageSize=100"),
      ]);

      const [suppData, catData] = await Promise.all([
        suppRes.json(),
        catRes.json(),
      ]);

      setSuppliers(suppData.items || []);
      setCategories(catData.items || []);
      setFilteredCategories(catData.items || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    // Recargar datos si es necesario
    console.log("Importación completada");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <FontAwesomeIcon
          icon={faSpinner}
          className="animate-spin h-12 w-12 text-indigo-600"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Volver
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Importar Tallas desde Excel
              </h1>
              <p className="text-gray-600">
                Copia y pega datos directamente desde Excel o Google Sheets
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Selectores de proveedor y categoría */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            1. Selecciona destino de las tallas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor / Marca *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Selecciona un proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={!selectedSupplier}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100"
              >
                <option value="">
                  {selectedSupplier
                    ? "Selecciona una categoría"
                    : "Primero selecciona un proveedor"}
                </option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.gender?.name || "Sin género"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSupplier && selectedCategory && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                ✅ Las tallas se crearán para:{" "}
                <strong>
                  {suppliers.find((s) => s.id === parseInt(selectedSupplier))?.name}
                </strong>{" "}
                →{" "}
                <strong>
                  {filteredCategories.find((c) => c.id === parseInt(selectedCategory))?.name}
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* Importador Excel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            2. Pega los datos de Excel
          </h3>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              📋 Formato esperado:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>Primera fila:</strong> Nombres de sistemas de tallas
                (US, EU, UK, etc.)
              </li>
              <li>
                • <strong>Filas siguientes:</strong> Valores de cada talla
              </li>
              <li>
                • Copia las celdas en Excel y pega aquí (Ctrl+V)
              </li>
            </ul>
            <div className="mt-3 p-2 bg-white rounded border border-blue-300 font-mono text-xs">
              US → EU → UK
              <br />
              5 → 37.5 → 4
              <br />
              5.5 → 38 → 4.5
              <br />
              6 → 38.5 → 5
            </div>
          </div>

          <ExcelPasteImporter
            supplierId={selectedSupplier}
            categoryId={selectedCategory}
            onImportComplete={handleImportComplete}
          />
        </div>
      </div>
    </div>
  );
}
