"use client";

import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faTrash,
  faSpinner,
  faImage,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";

export default function ImageUploader({
  categoryId,
  images = [],
  onImagesChange,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("categoryId", categoryId);
        formData.append("order", images.length + index);

        const response = await fetch("/api/images", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al subir la imagen");
        }

        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      const newImages = results.map((r) => r.image);

      onImagesChange([...images, ...newImages]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta imagen?")) {
      return;
    }

    try {
      const response = await fetch(`/api/images?id=${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar la imagen");
      }

      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReorder = async (imageId, direction) => {
    const currentIndex = images.findIndex((img) => img.id === imageId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= images.length) return;

    // Reordenar localmente
    const newImages = [...images];
    const [movedImage] = newImages.splice(currentIndex, 1);
    newImages.splice(newIndex, 0, movedImage);

    // Actualizar orden en la UI inmediatamente
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      order: idx,
    }));
    onImagesChange(reorderedImages);

    // Actualizar en el servidor
    try {
      await Promise.all(
        reorderedImages.map((img) =>
          fetch("/api/images", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: img.id, order: img.order }),
          })
        )
      );
    } catch (err) {
      console.error("Error actualizando orden:", err);
    }
  };

  const handleAltChange = async (imageId, newAlt) => {
    // Actualizar localmente
    const updatedImages = images.map((img) =>
      img.id === imageId ? { ...img, alt: newAlt } : img
    );
    onImagesChange(updatedImages);

    // Actualizar en el servidor (debounced en un caso real)
    try {
      await fetch("/api/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageId, alt: newAlt }),
      });
    } catch (err) {
      console.error("Error actualizando alt:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Imágenes de la Guía
        </label>
        <span className="text-xs text-gray-500">
          {images.length} imagen{images.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Área de upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-indigo-400 cursor-pointer"
        }`}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <FontAwesomeIcon
              icon={faSpinner}
              className="h-8 w-8 text-indigo-500 animate-spin"
            />
            <p className="mt-2 text-sm text-gray-600">Subiendo imágenes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FontAwesomeIcon
              icon={faUpload}
              className="h-8 w-8 text-gray-400"
            />
            <p className="mt-2 text-sm text-gray-600">
              Haz clic o arrastra imágenes aquí
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG, GIF, WebP o SVG (máx. 5MB)
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Grid de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images
            .sort((a, b) => a.order - b.order)
            .map((image, index) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden bg-gray-50"
              >
                {/* Imagen */}
                <div className="aspect-video relative">
                  <img
                    src={image.url}
                    alt={image.alt || image.originalName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const errorDiv = document.createElement("div");
                      errorDiv.className = "w-full h-full flex items-center justify-center bg-gray-100 absolute inset-0";
                      errorDiv.innerHTML = `<span class="text-gray-400 text-sm">Error cargando imagen</span>`;
                      e.target.parentNode?.appendChild(errorDiv);
                    }}
                  />
                </div>

                {/* Overlay con controles */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    {/* Mover arriba */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(image.id, "up");
                      }}
                      disabled={index === 0}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mover arriba"
                    >
                      <FontAwesomeIcon
                        icon={faArrowUp}
                        className="h-4 w-4 text-gray-700"
                      />
                    </button>

                    {/* Mover abajo */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(image.id, "down");
                      }}
                      disabled={index === images.length - 1}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mover abajo"
                    >
                      <FontAwesomeIcon
                        icon={faArrowDown}
                        className="h-4 w-4 text-gray-700"
                      />
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      className="p-2 bg-red-500 rounded-full shadow hover:bg-red-600"
                      title="Eliminar imagen"
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        className="h-4 w-4 text-white"
                      />
                    </button>
                  </div>
                </div>

                {/* Info de la imagen */}
                <div className="p-2 border-t bg-white">
                  <input
                    type="text"
                    value={image.alt || ""}
                    onChange={(e) => handleAltChange(image.id, e.target.value)}
                    placeholder="Texto alternativo (alt)"
                    className="w-full text-xs border-gray-200 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {image.originalName}
                  </p>
                </div>

                {/* Badge de orden */}
                <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-full text-xs font-medium shadow">
                  #{index + 1}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Mensaje cuando no hay imágenes */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FontAwesomeIcon
            icon={faImage}
            className="h-12 w-12 text-gray-300 mx-auto"
          />
          <p className="mt-2 text-sm text-gray-500">
            No hay imágenes añadidas a esta categoría
          </p>
        </div>
      )}
    </div>
  );
}
