"use client";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import SizeTableGenerator from "@/app/components/admin/SizeTableGenerator";
import LogoutButton from "@/app/components/admin/LogoutButton";

export default function SizeTablePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Volver al Panel
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Generador de Tablas de Tallas
              </h1>
              <p className="text-gray-600">
                Genera guías de tallas personalizadas y descárgalas como imagen
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Generador */}
        <SizeTableGenerator />
      </div>
    </div>
  );
}
