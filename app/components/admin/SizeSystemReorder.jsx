"use client";
import React, { useState, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGripVertical,
  faSave,
  faSpinner,
  faCheck,
  faArrowsAlt,
} from "@fortawesome/free-solid-svg-icons";

export default function SizeSystemReorder({ items, onSaved }) {
  const [orderedItems, setOrderedItems] = useState(() =>
    [...items].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
  );
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragNode = useRef(null);

  const isDirty = orderedItems.some(
    (item, idx) => {
      const sorted = [...items].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      return sorted[idx]?.id !== item.id;
    }
  );

  const handleDragStart = useCallback((e, index) => {
    dragNode.current = e.target;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      setOrderedItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
      setDragIndex(null);
      setOverIndex(null);
      setSaved(false);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/crud/sizesystem-reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: orderedItems.map((i) => i.id) }),
      });
      if (!res.ok) throw new Error("Error al guardar orden");
      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      alert("Error guardando el orden: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTranslation = (item, locale) => {
    if (!item.translations) return "";
    const t = item.translations.find((tr) => tr.locale === locale);
    return t?.name || "";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faArrowsAlt} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Orden de columnas en guía de tallas
          </h3>
          <span className="text-xs text-gray-400">
            (arrastra para reordenar → se refleja en la tabla de tallas)
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            saved
              ? "bg-green-100 text-green-700"
              : isDirty
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <FontAwesomeIcon
            icon={saving ? faSpinner : saved ? faCheck : faSave}
            className={`mr-1.5 ${saving ? "animate-spin" : ""}`}
          />
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar orden"}
        </button>
      </div>

      <div className="space-y-1">
        {orderedItems.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-all cursor-grab active:cursor-grabbing select-none ${
              overIndex === index && dragIndex !== index
                ? "border-indigo-400 bg-indigo-50"
                : dragIndex === index
                ? "border-dashed border-gray-300 bg-gray-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <FontAwesomeIcon
              icon={faGripVertical}
              className="text-gray-300 hover:text-gray-500"
            />
            <span className="text-xs font-mono text-gray-400 w-6 text-right">
              {index + 1}
            </span>
            <span className="font-medium text-sm text-gray-800">
              {item.systemName}
            </span>
            {getTranslation(item, "es") && (
              <span className="text-xs text-gray-400">
                ({getTranslation(item, "es")})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
