import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faTimes,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";

export default function FilterPanel({
  mainProperties,
  filters,
  onFilterChange,
  clearFilters,
  relatedData,
  resource,
}) {
  // Estado local para los filtros en edición (pendientes de aplicar)
  const [pendingFilters, setPendingFilters] = useState({ ...filters });

  // Sincronizar pendingFilters cuando cambian los filtros principales
  useEffect(() => {
    setPendingFilters({ ...filters });
  }, [filters]);

  // Transformar nombre de propiedad a nombre de filtro para API
  const getFilterFieldName = (property) => {
    // Para propiedades que son relaciones, necesitamos añadir 'Id'
    const relationProperties = ["supplier", "category", "gender", "sizeSystem"];

    if (relationProperties.includes(property)) {
      return `${property}Id`;
    }

    // Para casos especiales
    if (property === "originSystem") {
      return "originSystemId";
    }

    return property;
  };

  // Determinar si el campo es una relación
  const isRelationField = (property) => {
    return [
      "supplier",
      "category",
      "gender",
      "sizeSystem",
      "originSystem",
    ].includes(property);
  };

  // Obtener las opciones para un campo relacional
  const getOptionsForRelation = (property) => {
    // Mapeo de la propiedad a la clave en relatedData
    const relationMap = {
      originSystem: "sizeSystem", // Caso especial
    };

    const relationKey = relationMap[property] || property;
    return relatedData && relatedData[relationKey]
      ? relatedData[relationKey]
      : [];
  };

  // Obtener la etiqueta para las opciones del select
  const getOptionLabel = (relation, item) => {
    const labelMap = {
      sizeSystem: "systemName",
      supplier: "name",
      gender: "name",
      category: "name",
      originSystem: "systemName",
    };

    return item[labelMap[relation] || "name"] || item.id;
  };

  // Manejar cambios en los campos de filtro (sin aplicar inmediatamente)
  const handlePendingFilterChange = (e, property) => {
    const value = e.target.value;

    setPendingFilters((prev) => ({
      ...prev,
      [property]: value,
    }));
  };

  // Limpiar filtro individual
  const clearSingleFilter = (property) => {
    const newPendingFilters = { ...pendingFilters };
    delete newPendingFilters[property];
    setPendingFilters(newPendingFilters);
  };

  // Aplicar todos los filtros pendientes
  const applyFilters = () => {
    // Eliminar filtros vacíos
    const cleanFilters = { ...pendingFilters };
    Object.keys(cleanFilters).forEach((key) => {
      if (!cleanFilters[key]) delete cleanFilters[key];
    });

    onFilterChange(cleanFilters);
  };

  // Verificar si hay cambios pendientes
  const hasChanges = () => {
    // Comparar si pendingFilters difiere de filters
    if (Object.keys(pendingFilters).length !== Object.keys(filters).length)
      return true;

    for (const key in pendingFilters) {
      if (pendingFilters[key] !== filters[key]) return true;
    }

    for (const key in filters) {
      if (filters[key] !== pendingFilters[key]) return true;
    }

    return false;
  };

  return (
    <div className="m-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          <FontAwesomeIcon icon={faFilter} className="mr-2 text-indigo-600" />
          Filtros
          {Object.keys(filters).length > 0 && (
            <span className="ml-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              {Object.keys(filters).length} activos
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => {
                setPendingFilters({});
                clearFilters();
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainProperties.map((property) => {
          if (property === "id") return null;

          const filterName = getFilterFieldName(property);
          const isRelation = isRelationField(property);
          const isActive = filters[filterName] ? true : false;
          const isPending = pendingFilters[filterName] !== filters[filterName];

          return (
            <div key={`filter-${property}`} className="flex flex-col">
              <label
                className={`block text-sm font-medium mb-1.5 ${
                  isActive ? "text-indigo-700" : "text-gray-700"
                }`}
              >
                {property.charAt(0).toUpperCase() + property.slice(1)}
                {isActive && (
                  <span className="ml-1.5 text-xs text-indigo-600">✓</span>
                )}
              </label>

              {isRelation ? (
                <select
                  value={pendingFilters[filterName] || ""}
                  onChange={(e) => handlePendingFilterChange(e, filterName)}
                  className={`px-3 py-2 w-full border rounded-md shadow-sm focus:ring-2 focus:ring-offset-1 text-sm transition-colors
                    ${
                      isActive
                        ? "border-indigo-300 bg-indigo-50 focus:ring-indigo-500 focus:border-indigo-500"
                        : "border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                    }
                    ${isPending ? "border-yellow-300 bg-yellow-50" : ""}`}
                >
                  <option value="">Todos</option>
                  {getOptionsForRelation(property).map((item) => (
                    <option key={item.id} value={item.id}>
                      {getOptionLabel(property, item)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className={`h-4 w-4 ${
                        isActive ? "text-indigo-500" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    value={pendingFilters[filterName] || ""}
                    onChange={(e) => handlePendingFilterChange(e, filterName)}
                    className={`pl-10 pr-10 py-2 w-full border rounded-md shadow-sm focus:ring-2 focus:ring-offset-1 text-sm transition-colors
                      ${
                        isActive
                          ? "border-indigo-300 bg-indigo-50 focus:ring-indigo-500 focus:border-indigo-500"
                          : "border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                      }
                      ${isPending ? "border-yellow-300 bg-yellow-50" : ""}`}
                    placeholder={`Filtrar por ${property}`}
                  />
                  {pendingFilters[filterName] && (
                    <button
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => clearSingleFilter(filterName)}
                    >
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={applyFilters}
          disabled={!hasChanges()}
          className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
            ${
              hasChanges()
                ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <FontAwesomeIcon icon={faCheck} className="mr-2" />
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}
