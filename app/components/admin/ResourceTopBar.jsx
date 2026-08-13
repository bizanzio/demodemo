export default function ResourceTopBar({
  resources,
  activeResource,
  onResourceChange,
}) {
  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-indigo-600 px-4 py-3">
          <h2 className="text-lg font-bold text-white">Recursos</h2>
        </div>
        <nav className="flex flex-row overflow-x-auto">
          {resources.map((resource) => (
            <button
              key={resource.name}
              onClick={() => onResourceChange(resource.name)}
              className={`px-4 py-3 flex items-center text-center ${
                activeResource === resource.name
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              } transition-all duration-200`}
            >
              <span className="truncate">{resource.name}</span>
              {activeResource === resource.name && (
                <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {resource.items.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
