import { useMemo } from "react";

export default function SizeValueDisplay({
  size,
  category,
  showAllSystems = false, // Si es true, muestra todos los sistemas aunque no tengan valor
}) {
  const valueMap = useMemo(() => {
    const map = new Map();
    if (size?.sizeValues) {
      size.sizeValues.forEach((sv) => {
        map.set(sv.sizeSystem.systemName, sv.value);
      });
    }
    return map;
  }, [size]);

  const systems = useMemo(() => {
    if (showAllSystems && category?.sizingSystems) {
      return category.sizingSystems;
    }
    return size?.sizeValues?.map((sv) => sv.sizeSystem) || [];
  }, [category, size, showAllSystems]);

  if (!systems.length) {
    return <span className="text-gray-400">No hay valores</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {systems.map((system) => {
        const value = valueMap.get(system.systemName);
        if (!showAllSystems && !value) return null;

        return (
          <div
            key={system.id}
            className={`inline-flex items-center px-2 py-1 rounded-md text-sm
              ${
                value
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}
          >
            <span className="font-medium mr-1">{system.systemName}:</span>
            <span>{value || "-"}</span>
          </div>
        );
      })}
    </div>
  );
}
