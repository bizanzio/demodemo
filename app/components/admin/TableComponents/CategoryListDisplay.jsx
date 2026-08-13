import React from "react";

export default function CategoryListDisplay({ categories = [], maxVisible = 2 }) {
  if (!categories || categories.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const visibleItems = categories.slice(0, maxVisible);
  const remainingCount = categories.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleItems.map((category) => (
        <span
          key={category.id}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
          title={`${category.name}${category.supplier ? ` (${category.supplier.name})` : ""}`}
        >
          {category.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span 
          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200 cursor-help"
          title={categories.slice(maxVisible).map(c => `${c.name}${c.supplier ? ` (${c.supplier.name})` : ""}`).join(", ")}
        >
          +{remainingCount} más
        </span>
      )}
    </div>
  );
}
