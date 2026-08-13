import React from "react";

export default function IntCategoryDisplay({ categories = [] }) {
  if (!categories || categories.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <span
          key={category.id}
          className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-purple-50 text-purple-700 border border-purple-200"
        >
          {category.name}
          <span className="ml-1 text-xs text-purple-600">
            ({category.referenceId})
          </span>
        </span>
      ))}
    </div>
  );
}
