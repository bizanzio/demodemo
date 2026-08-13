"use client";
import { useState, useEffect, Suspense } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faClipboard,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

import ResourceTopBar from "@/app/components/admin/ResourceTopBar";
import ResourceTable from "@/app/components/admin/ResourceTable";
import SizeSystemReorder from "@/app/components/admin/SizeSystemReorder";
import resourceFields from "@/app/config/resourceFields";
import LogoutButton from "@/app/components/admin/LogoutButton";

export default function AdminPage() {
  const [resources, setResources] = useState([
    { name: "SizeSystem", endpoint: "sizesystem", items: [] },
    { name: "Supplier", endpoint: "supplier", items: [] },
    { name: "Gender", endpoint: "gender", items: [] },
    { name: "Category", endpoint: "category", items: [] },
    { name: "Size", endpoint: "size", items: [] },
    { name: "IntCategory", endpoint: "intcategory", items: [] },
    { name: "ProductSizeException", endpoint: "productsizeexception", items: [] },
  ]);
  const [activeResource, setActiveResource] = useState("SizeSystem");
  const [loading, setLoading] = useState(true);
  const [filterParams, setFilterParams] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [sortParams, setSortParams] = useState({
    sortBy: null,
    sortDir: null,
  });

  // Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Referencias para campos con relaciones
  const [relatedData, setRelatedData] = useState({
    sizeSystem: [],
    supplier: [],
    gender: [],
    category: [],
    int_Category: [],
  });

  // Obtener los campos para el recurso actual
  const fields = resourceFields[activeResource?.toLowerCase()] || [];
  const activeResourceObj =
    resources.find((r) => r.name === activeResource) || {};
  const activeItems = activeResourceObj.items || [];

  useEffect(() => {
    fetchResourceData();
  }, [
    activeResource,
    filterParams,
    appliedSearchTerm,
    sortParams,
    pagination.page,
    pagination.pageSize,
  ]);

  // Cargar datos del recurso activo
  const fetchResourceData = async () => {
    setLoading(true);
    try {
      const activeResourceObj = resources.find(
        (r) => r.name === activeResource
      );
      if (activeResourceObj) {
        // Construir URL con parámetros de filtro, ordenamiento y paginación
        let url = `/api/crud/${activeResourceObj.endpoint}`;

        const params = new URLSearchParams();

        // Añadir parámetros de paginación
        params.append("page", pagination.page);
        params.append("pageSize", pagination.pageSize);

        // Añadir parámetros de filtro
        if (Object.keys(filterParams).length > 0) {
          Object.entries(filterParams).forEach(([key, value]) => {
            if (value) params.append(key, value);
          });
        }

        // Añadir parámetro de búsqueda global
        if (appliedSearchTerm && appliedSearchTerm.trim()) {
          params.append("search", appliedSearchTerm.trim());
        }

        // Añadir parámetros de ordenamiento
        if (sortParams.sortBy && sortParams.sortDir) {
          params.append("sortBy", sortParams.sortBy);
          params.append("sortDir", sortParams.sortDir);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        // Actualizar estado con los datos y la paginación
        if (data.items && data.pagination) {
          setResources(
            resources.map((resource) =>
              resource.name === activeResource
                ? { ...resource, items: data.items }
                : resource
            )
          );
          setPagination(data.pagination);
        } else {
          console.error("Formato de respuesta inesperado:", data);
        }
      }

      // Cargar datos relacionados para los formularios
      await fetchRelatedData();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar datos relacionados
  const fetchRelatedData = async () => {
    try {
      const endpointMap = {
        sizeSystem: "sizesystem",
        supplier: "supplier",
        gender: "gender",
        category: "category",
        size: "size",
        int_Category: "intcategory",
      };

      const relatedPromises = Object.keys(relatedData).map(async (relation) => {
        const endpoint = endpointMap[relation];
        if (!endpoint) {
          console.error(`Endpoint no encontrado para la relación: ${relation}`);
          return { relation, data: [] };
        }

        try {
          const response = await fetch(`/api/crud/${endpoint}?pageSize=10000`);
          if (!response.ok) throw new Error(`Error al cargar ${relation}`);
          const data = await response.json();
          return {
            relation,
            data: Array.isArray(data) ? data : data.items || [],
          };
        } catch (error) {
          console.error(`Error cargando ${relation}:`, error);
          return { relation, data: [] };
        }
      });

      const relatedResults = await Promise.all(relatedPromises);
      const newRelatedData = { ...relatedData };

      relatedResults.forEach(({ relation, data }) => {
        newRelatedData[relation] = data;
      });

      setRelatedData(newRelatedData);
    } catch (error) {
      console.error("Error cargando datos relacionados:", error);
    }
  };

  // Cambiar el recurso activo
  const handleResourceChange = (resourceName) => {
    setActiveResource(resourceName);
    // Resetear filtros, ordenamiento, búsqueda y paginación al cambiar de recurso
    setFilterParams({});
    setSearchTerm("");
    setAppliedSearchTerm("");
    setSortParams({ sortBy: null, sortDir: null });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Manejar cambio en el input de búsqueda (sin aplicar)
  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  // Aplicar la búsqueda (con botón o Enter)
  const handleApplySearch = () => {
    setAppliedSearchTerm(searchTerm);
    // Volver a la primera página al buscar
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Limpiar la búsqueda
  const handleClearSearch = () => {
    setSearchTerm("");
    setAppliedSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Manejar filtrado
  const handleFilter = (filters) => {
    setFilterParams(filters);
    // Volver a la primera página al filtrar
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Manejar ordenamiento
  const handleSort = (sortConfig) => {
    console.log("AdminPage - handleSort - Recibido:", sortConfig);
    setSortParams({
      sortBy: sortConfig.key,
      sortDir: sortConfig.direction,
    });
    console.log("AdminPage - handleSort - sortParams actualizado:", {
      sortBy: sortConfig.key,
      sortDir: sortConfig.direction,
    });

    // Recargar datos con el nuevo ordenamiento
    fetchResourceData();
  };

  // Manejar cambios de página
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Manejar cambios en el tamaño de página
  const handlePageSizeChange = (newSize) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newSize,
      page: 1, // Volver a la primera página al cambiar el tamaño
    }));
  };

  // Abrir formulario para editar elemento existente
  const handleEditItem = async (id) => {
    try {
      const response = await fetch(
        `/api/crud/${activeResourceObj.endpoint}/${id}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar los datos para editar");
      }

      const data = await response.json();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar los datos para editar: " + error.message);
    }
  };

  // Eliminar un elemento
  const handleDeleteItem = async (id, options = {}) => {
    const { skipRefresh = false } = options;
    try {
      const response = await fetch(
        `/api/crud/${activeResourceObj.endpoint}/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Error al eliminar el elemento");
      }

      // Recargar datos
      if (!skipRefresh) {
        await fetchResourceData();
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  // Manejar guardado exitoso
  const handleFormSave = async (result) => {
    console.log("handleFormSave - Iniciando guardado");
    console.log("handleFormSave - Resultado recibido:", result);

    try {
      // Recargar datos
      console.log("handleFormSave - Recargando datos...");
      await fetchResourceData();
      console.log("handleFormSave - Datos recargados correctamente");
    } catch (error) {
      console.error("handleFormSave - Error al recargar datos:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className=" mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Panel de Administración
            </h1>
            <p className="text-gray-600">
              Gestiona todos los recursos del sistema desde aquí
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/import-sizes"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700"
            >
              <FontAwesomeIcon icon={faClipboard} className="mr-2" />
              Importar Tallas
            </Link>
            <Link
              href="/admin/import-intcategories"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
            >
              <FontAwesomeIcon icon={faClipboard} className="mr-2" />
              Importar IntCategories
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Sidebar con recursos */}
          <ResourceTopBar
            resources={resources}
            activeResource={activeResource}
            onResourceChange={handleResourceChange}
          />

          {/* Content Area */}
          <div className="w-full ">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {activeResource}
                </h2>
              </div>

              {!loading && activeResource === "SizeSystem" && activeItems.length > 0 && (
                <div className="px-6 pt-4">
                  <SizeSystemReorder
                    items={activeItems}
                    onSaved={() => fetchResourceData()}
                  />
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin h-12 w-12 text-indigo-600"
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Suspense fallback={
                    <div className="flex justify-center items-center py-12">
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin h-12 w-12 text-indigo-600"
                      />
                    </div>
                  }>
                    <ResourceTable
                      resource={activeResource}
                      resourceEndpoint={activeResourceObj.endpoint}
                      fields={fields}
                      items={activeItems}
                      relatedData={relatedData}
                      pagination={pagination}
                      searchTerm={searchTerm}
                      appliedSearchTerm={appliedSearchTerm}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onSave={handleFormSave}
                      onFilter={handleFilter}
                      onSort={handleSort}
                      onSearchChange={handleSearchChange}
                      onApplySearch={handleApplySearch}
                      onClearSearch={handleClearSearch}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
