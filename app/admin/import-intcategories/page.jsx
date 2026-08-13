"use client";
import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faList } from "@fortawesome/free-solid-svg-icons";
import IntCategoryPasteImporter from "@/app/components/admin/IntCategoryPasteImporter";
import LogoutButton from "@/app/components/admin/LogoutButton";

export default function ImportIntCategoriesPage() {
  const [importCount, setImportCount] = useState(0);

  const handleImportComplete = () => {
    setImportCount((prev) => prev + 1);
    console.log("Importación de IntCategories completada");
  };

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
                Importar Categorías Internas
              </h1>
              <p className="text-gray-600">
                Copia y pega datos directamente desde Excel o Google Sheets
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Información sobre IntCategories */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faList}
                  className="h-6 w-6 text-purple-600"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Qué son las Categorías Internas (IntCategory)?
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Las <strong>IntCategories</strong> son categorías de producto
                internas que agrupan múltiples categorías de diferentes
                proveedores. Por ejemplo, una IntCategory "TOPS" puede agrupar
                categorías como "Camisetas Nike", "T-Shirts Adidas", etc.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>referenceId:</strong> Código único interno (ej:
                  TOPS, PANTS, SHOES)
                </li>
                <li>
                  • <strong>name:</strong> Nombre descriptivo (ej: "Camisetas y
                  Tops")
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📋 Formato esperado
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Opción 1: Con headers
              </h4>
              <div className="p-2 bg-white rounded border border-blue-300 font-mono text-xs">
                referenceId → name
                <br />
                TOPS → Camisetas y Tops
                <br />
                PANTS → Pantalones
                <br />
                SHOES → Calzado
                <br />
                DRESSES → Vestidos
              </div>
              <p className="mt-2 text-xs text-blue-600">
                Los → representan tabulaciones (tabs)
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Opción 2: Cualquier nombre de columna
              </h4>
              <div className="p-2 bg-white rounded border border-green-300 font-mono text-xs">
                Código → Descripción
                <br />
                OUTERWEAR → Abrigos y Chaquetas
                <br />
                SWIMWEAR → Bañadores
                <br />
                ACCESORIES → Accesorios
              </div>
              <p className="mt-2 text-xs text-green-600">
                Puedes mapear las columnas manualmente
              </p>
            </div>
          </div>
        </div>

        {/* Importador */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Pega los datos de Excel
          </h3>

          <IntCategoryPasteImporter onImportComplete={handleImportComplete} />

          {importCount > 0 && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
              <p className="text-sm text-indigo-700">
                💡 <strong>Siguiente paso:</strong> Ve al panel de administración
                para vincular las IntCategories con las categorías de cada
                proveedor.
              </p>
              <Link
                href="/admin?resource=intcategory"
                className="inline-flex items-center mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Ir a gestionar IntCategories →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
