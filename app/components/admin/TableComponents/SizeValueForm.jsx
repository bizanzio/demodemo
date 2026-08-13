import { useState, useEffect } from "react";

export default function SizeValueForm({ size, category, onSubmit, onCancel }) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar valores desde el size actual o crear nuevos para cada sistema
  useEffect(() => {
    if (size && size.sizeValues) {
      const initialValues = {};
      size.sizeValues.forEach((sv) => {
        initialValues[sv.sizeSystem.id] = sv.value;
      });
      setValues(initialValues);
    } else if (category && category.sizingSystems) {
      const initialValues = {};
      category.sizingSystems.forEach((system) => {
        initialValues[system.id] = "";
      });
      setValues(initialValues);
    }
  }, [size, category]);

  const handleChange = (systemId, value) => {
    setValues((prev) => ({
      ...prev,
      [systemId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convertir los valores a formato de API
      const sizeValues = Object.entries(values).map(
        ([sizeSystemId, value]) => ({
          sizeSystemId,
          value,
        })
      );

      await onSubmit(sizeValues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!category || !category.sizingSystems) {
    return <div>Cargando sistemas de tallaje...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {category.sizingSystems.map((system) => (
        <div key={system.id} className="flex items-center space-x-4">
          <label className="w-24 text-sm font-medium text-gray-700">
            {system.systemName}:
          </label>
          <input
            type="text"
            value={values[system.id] || ""}
            onChange={(e) => handleChange(system.id, e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={`Talla en ${system.systemName}`}
          />
        </div>
      ))}

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      <div className="flex justify-end space-x-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
