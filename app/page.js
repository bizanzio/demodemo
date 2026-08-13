import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Sistema de Unificación de Tallas TST
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Gestiona fácilmente las tallas para diferentes proveedores,
            categorías y sistemas.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-2xl rounded-2xl overflow-hidden transform transition duration-500 hover:scale-105">
            <div className="px-6 py-8 sm:p-10 bg-gradient-to-r from-indigo-600 to-indigo-800 flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full mr-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white">
                Panel de Administración
              </h2>
            </div>

            <div className="px-8 py-6">
              <p className="text-gray-600 mb-8 leading-relaxed">
                Accede al panel centralizado para gestionar todos los recursos
                del sistema. Desde aquí podrás:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-md mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-indigo-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Sistemas de Tallas
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Define diferentes sistemas de tallas para tus proveedores.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-md mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-indigo-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Proveedores</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestiona todos tus proveedores y sus sistemas de tallas.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-md mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-indigo-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Géneros</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Organiza tus tallas por diferentes géneros.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-md mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-indigo-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Categorías</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Clasifica las tallas en diferentes categorías de
                      productos.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/admin"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                Acceder al Panel de Administración
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center text-gray-600">
            <p>
              Sistema desarrollado para unificar y convertir tallas entre
              diferentes proveedores.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
