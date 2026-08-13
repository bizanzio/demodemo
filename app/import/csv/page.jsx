"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import CSVImporter from "../../components/CSVImporter";
import LogoutButton from "@/app/components/admin/LogoutButton";

// Nota: metadata se trasladará a un archivo layout.js separado
// ya que no puede coexistir con "use client"

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Importación de Datos CSV
            </h1>
            <p className="text-gray-600">
              Importa tus datos desde archivos CSV
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Volver al Panel
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Instrucciones de Uso
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Selecciona el tipo de entidad que deseas importar.</li>
            <li>
              Sube un archivo CSV con los datos correspondientes (formato
              UTF-8).
            </li>
            <li>
              Si tu CSV tiene nombres de columnas diferentes, activa la opción
              de mapeo personalizado.
            </li>
            <li>
              El sistema importará los datos, validando las referencias
              necesarias.
            </li>
            <li>
              Al finalizar, verás un resumen de los registros creados,
              actualizados o con error.
            </li>
          </ul>
        </div>

        <CSVImporter />
      </div>
    </div>
  );
}
