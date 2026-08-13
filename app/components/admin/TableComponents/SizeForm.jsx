import { useState, useEffect } from "react";
import SizeValueForm from "./SizeValueForm";

export default function SizeForm({
  size = null,
  suppliers = [],
  categories = [],
  sizeSystems = [],
  onSubmit,
  onCancel,
  isEditing = false,
}) {
  const [formData, setFormData] = useState({
    originalSize: "",
    supplierId: "",
    categoryId: "",
    sizeSystemId: "",
    displayOrder: "",
    sizeValues: [],
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (size) {
      setFormData({
        originalSize: size.originalSize || "",
        supplierId: size.supplierId || "",
        categoryId: size.categoryId || "",
        sizeSystemId: size.sizeSystemId || "",
        displayOrder: size.displayOrder || "",
        sizeValues: size.sizeValues || [],
      });

      // Buscar la categoría seleccionada
      if (size.categoryId) {
        const category = categories.find((c) => c.id === size.categoryId);
        setSelectedCategory(category);
      }
    }
  }, [size, categories]);

  // Actualizar la categoría seleccionada cuando cambia categoryId
  useEffect(() => {
    if (formData.categoryId) {
      const category = categories.find(
        (c) => c.id === parseInt(formData.categoryId)
      );
      setSelectedCategory(category);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.categoryId, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSizeValuesSubmit = (sizeValues) => {
    setFormData((prev) => ({
      ...prev,
      sizeValues,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que tenemos una categoría y valores de talla
      if (!formData.categoryId) {
        throw new Error("Debes seleccionar una categoría");
      }
      if (!formData.sizeValues || formData.sizeValues.length === 0) {
        throw new Error("Debes especificar al menos un valor de talla");
      }

      await onSubmit(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Talla Original
          </label>
          <input
            type="text"
            name="originalSize"
            value={formData.originalSize}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Orden de visualización
          </label>
          <input
            type="number"
            name="displayOrder"
            value={formData.displayOrder}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Proveedor
          </label>
          <select
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Selecciona un proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Categoría
          </label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCategory && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900">
            Valores de talla
          </h3>
          <div className="mt-2">
            <SizeValueForm
              size={size}
              category={selectedCategory}
              onSubmit={handleSizeValuesSubmit}
              onCancel={null} // No necesitamos cancelar aquí
            />
          </div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      <div className="flex justify-end space-x-3">
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
          {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </button>
      </div>
    </form>
  );
}
