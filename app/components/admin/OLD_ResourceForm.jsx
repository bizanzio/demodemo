import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faSpinner,
  faExclamationCircle,
  faTimes,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

export default function ResourceForm({
  resource,
  resourceEndpoint,
  fields,
  formMode,
  initialData,
  selectedItemId,
  relatedData,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(initialData || {});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Convertir a número si es un campo de ID (para relaciones)
    const processedValue =
      name.endsWith("Id") && value !== "" ? parseInt(value, 10) : value;

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  // Enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      // Preparar datos para enviar
      const dataToSend = { ...formData };

      // Eliminar campos nulos o vacíos que no son requeridos
      fields.forEach((field) => {
        if (
          !field.required &&
          (dataToSend[field.name] === "" || dataToSend[field.name] === null)
        ) {
          delete dataToSend[field.name];
        }
      });

      let response;

      if (formMode === "new") {
        // Crear nuevo elemento
        response = await fetch(`/api/crud/${resourceEndpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        });
      } else {
        // Actualizar elemento existente
        response = await fetch(
          `/api/crud/${resourceEndpoint}/${selectedItemId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataToSend),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar los datos");
      }

      const result = await response.json();

      // Notificar al componente padre que se ha guardado correctamente
      onSave(result);
    } catch (error) {
      console.error("Error:", error);
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Obtener opciones para los campos de selección
  const getSelectOptions = (field) => {
    if (!field.relation) return [];
    return relatedData[field.relation] || [];
  };

  // Determinar la etiqueta para las opciones del select
  const getOptionLabel = (relation, item) => {
    const labelMap = {
      sizeSystem: "systemName",
      supplier: "name",
      gender: "name",
      category: "name",
    };

    return item[labelMap[relation] || "name"] || item.id;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Encabezado del formulario */}
      <div
        className={`px-6 py-4 ${
          formMode === "new"
            ? "bg-gradient-to-r from-green-500 to-emerald-600"
            : "bg-gradient-to-r from-amber-500 to-amber-600"
        }`}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FontAwesomeIcon
              icon={formMode === "new" ? faPlus : faEdit}
              className="mr-2 h-5 w-5"
            />
            {formMode === "new" ? "Crear nuevo" : "Editar"}{" "}
            {resource.toLowerCase()}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Contenido del formulario */}
      <div className="p-6">
        {/* Mensajes de error */}
        {formError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <FontAwesomeIcon
                icon={faExclamationCircle}
                className="h-6 w-6 text-red-500 mr-3"
              />
              <p className="text-red-700 font-medium">{formError}</p>
            </div>
          </div>
        )}

        {/* ID destacado (solo en modo edición) */}
        {formMode === "edit" && selectedItemId && (
          <div className="mb-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <p className="text-sm text-indigo-600 font-medium">ID</p>
            <p className="text-2xl font-semibold text-indigo-900">
              {selectedItemId}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 mb-8">
            {fields.map((field) => (
              <div
                key={field.name}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {field.relation ? (
                  <div className="relative mt-2">
                    <select
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={field.required}
                      className={`block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none rounded-md shadow-sm transition duration-150 ease-in-out text-gray-800 font-medium ${
                        formMode === "new"
                          ? "focus:ring-green-500 focus:border-green-500"
                          : "focus:ring-amber-500 focus:border-amber-500"
                      }`}
                    >
                      <option value="">Seleccionar {field.label}</option>
                      {getSelectOptions(field).map((item) => (
                        <option key={item.id} value={item.id}>
                          {getOptionLabel(field.relation, item)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={field.required}
                      className={`shadow-sm block w-full px-4 py-3 text-base text-gray-800 font-medium border-gray-300 rounded-md transition duration-150 ease-in-out ${
                        formMode === "new"
                          ? "focus:ring-green-500 focus:border-green-500"
                          : "focus:ring-amber-500 focus:border-amber-500"
                      }`}
                      placeholder={`Ingrese ${field.label.toLowerCase()}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="pt-5 border-t border-gray-200 mt-8">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ${
                  formMode === "new"
                    ? submitting
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 focus:ring-green-500"
                    : submitting
                    ? "bg-amber-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin mr-2"
                    />
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {formMode === "new" ? "Crear" : "Actualizar"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
