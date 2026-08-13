import { useState, useEffect } from "react";
import Select from "react-select";
import ImageUploader from "../ImageUploader";

export default function CategoryForm({
  category = null,
  genders = [],
  suppliers = [],
  sizeSystems = [],
  onSubmit,
  onCancel,
  isEditing = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    genderId: "",
    supplierId: "",
    originSystemId: "",
    sizingSystems: [],
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        genderId: category.genderId || "",
        supplierId: category.supplierId || "",
        originSystemId: category.originSystemId || "",
        sizingSystems:
          category.sizingSystems?.map((system) => ({
            value: system.id,
            label: system.systemName,
          })) || [],
      });
      // Cargar imágenes de la categoría
      setImages(category.images || []);
    }
  }, [category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSizingSystemsChange = (selectedOptions) => {
    setFormData((prev) => ({
      ...prev,
      sizingSystems: selectedOptions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar campos requeridos
      if (!formData.name) {
        throw new Error("El nombre es requerido");
      }
      if (!formData.genderId) {
        throw new Error("El género es requerido");
      }
      if (!formData.supplierId) {
        throw new Error("El proveedor es requerido");
      }
      if (!formData.sizingSystems || formData.sizingSystems.length === 0) {
        throw new Error("Debes seleccionar al menos un sistema de talla");
      }

      // Preparar datos para enviar
      const dataToSubmit = {
        ...formData,
        sizingSystems: formData.sizingSystems.map((option) => option.value),
      };

      await onSubmit(dataToSubmit);
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
            Nombre
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Género
          </label>
          <select
            name="genderId"
            value={formData.genderId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          >
            <option value="">Selecciona un género</option>
            {genders.map((gender) => (
              <option key={gender.id} value={gender.id}>
                {gender.name}
              </option>
            ))}
          </select>
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
            required
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
            Sistema de Tallas Origen
          </label>
          <select
            name="originSystemId"
            value={formData.originSystemId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Selecciona un sistema de tallas</option>
            {sizeSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.systemName}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Sistemas de Talla
          </label>
          <Select
            isMulti
            name="sizingSystems"
            value={formData.sizingSystems}
            onChange={handleSizingSystemsChange}
            options={sizeSystems.map((system) => ({
              value: system.id,
              label: system.systemName,
            }))}
            className="mt-1"
            required
          />
        </div>

        {/* Sección de imágenes - solo visible cuando editamos */}
        {isEditing && category?.id && (
          <div className="sm:col-span-2 pt-4 border-t">
            <ImageUploader
              categoryId={category.id}
              images={images}
              onImagesChange={setImages}
              disabled={loading}
            />
          </div>
        )}
      </div>

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
