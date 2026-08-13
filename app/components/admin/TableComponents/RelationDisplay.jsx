import React from "react";

export default function RelationDisplay({ value, labelKey = "name" }) {
  if (!value) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200">
      {value[labelKey] || value.toString()}
    </span>
  );
}
