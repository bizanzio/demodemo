import { useState, useEffect } from "react";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";

export default function IntCategoryMultiSelect({
  value = [],
  onChange,
  relatedData,
  placeholder = "Selecciona categorías internas",
}) {
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState(null);

  // Cargar opciones desde los datos relacionados
  useEffect(() => {
    if (relatedData && relatedData.int_Category) {
      const newOptions = relatedData.int_Category.map((cat) => ({
        value: cat.id,
        label: `${cat.name} (${cat.referenceId})`,
        referenceId: cat.referenceId,
      }));
      setOptions(newOptions);

      // Si hay valores iniciales y opciones, actualiza las selecciones
      if (Array.isArray(value) && value.length > 0) {
        const selected = value
          .map((id) => {
            const option = newOptions.find((opt) => opt.value === id);
            return option;
          })
          .filter(Boolean);

        if (selected.length > 0) {
          setSelectedOptions(selected);
        }
      }
    }
  }, [relatedData, value]);

  // Manejar cambios en la selección
  const handleChange = (selected) => {
    setSelectedOptions(selected || []);
    const newValues = selected ? selected.map((option) => option.value) : [];
    onChange(newValues);
  };

  // Procesar texto pegado con referenceIds
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setPasteError("Pega los referenceIds");
      return;
    }

    // Separar por líneas, comas, tabs o espacios
    // y filtrar solo los que parecen referenceIds válidos (letras, números y guiones)
    const referenceIds = pasteText
      .split(/[\n,\t\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /^[A-Za-z0-9-]+$/.test(s));

    if (referenceIds.length === 0) {
      setPasteError("No se encontraron referenceIds válidos (formato: XXXX-XXXX)");
      return;
    }

    console.log("ReferenceIds a buscar:", referenceIds);
    console.log("Opciones disponibles:", options.length, options.map(o => o.referenceId));

    // Buscar las opciones correspondientes
    const foundOptions = [];
    const notFound = [];

    referenceIds.forEach((refId) => {
      // Buscar con múltiples métodos para ser más flexible
      const refIdNormalized = refId.trim().toUpperCase();
      
      const option = options.find((opt) => {
        const optRefId = (opt.referenceId || "").trim().toUpperCase();
        return optRefId === refIdNormalized;
      });
      
      if (option) {
        // Evitar duplicados
        if (!foundOptions.find((o) => o.value === option.value)) {
          foundOptions.push(option);
        }
      } else {
        notFound.push(refId);
      }
    });

    console.log("Encontrados:", foundOptions.length);
    console.log("No encontrados:", notFound);

    if (foundOptions.length === 0) {
      setPasteError(`No se encontró ninguno de los ${referenceIds.length} referenceIds. Hay ${options.length} IntCategories disponibles.`);
      return;
    }

    // Combinar con las selecciones existentes (sin duplicados)
    const combinedOptions = [...selectedOptions];
    foundOptions.forEach((opt) => {
      if (!combinedOptions.find((o) => o.value === opt.value)) {
        combinedOptions.push(opt);
      }
    });

    setSelectedOptions(combinedOptions);
    onChange(combinedOptions.map((opt) => opt.value));

    // Mostrar mensaje si algunos no se encontraron
    if (notFound.length > 0) {
      setPasteError(`Añadidos ${foundOptions.length}/${referenceIds.length}. No encontrados (${notFound.length}): ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "..." : ""}`);
    } else {
      setPasteError(null);
      setShowPasteMode(false);
      setPasteText("");
    }
  };

  // Verificar si hay opciones disponibles
  if (
    !relatedData ||
    !relatedData.int_Category ||
    relatedData.int_Category.length === 0
  ) {
    return (
      <span className="text-gray-400">
        No hay categorías internas disponibles
      </span>
    );
  }

  // Estilos personalizados para react-select con altura máxima
  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: '38px',
    }),
    valueContainer: (base) => ({
      ...base,
      maxHeight: '80px',
      overflowY: 'auto',
      padding: '2px 8px',
    }),
    multiValue: (base) => ({
      ...base,
      maxWidth: '150px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          isMulti
          name="intCategories"
          options={options}
          value={selectedOptions}
          onChange={handleChange}
          classNamePrefix="react-select"
          className="min-w-[200px] flex-1"
          placeholder={placeholder}
          isClearable={true}
          noOptionsMessage={() => "No hay opciones disponibles"}
          styles={customStyles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          menuPosition="fixed"
          formatOptionLabel={(option, { context }) => {
            // En el menú mostrar completo, en el valor mostrar solo referenceId
            if (context === 'value') {
              return <span className="text-xs">{option.referenceId}</span>;
            }
            return option.label;
          }}
        />
        <button
          type="button"
          onClick={() => {
            setShowPasteMode(!showPasteMode);
            setPasteError(null);
            setPasteText("");
          }}
          className={`p-2 rounded-md border transition-colors ${
            showPasteMode
              ? "bg-indigo-100 border-indigo-300 text-indigo-600"
              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
          title="Pegar referenceIds"
        >
          <FontAwesomeIcon icon={faClipboard} className="h-4 w-4" />
        </button>
      </div>

      {/* Contador de seleccionados */}
      {selectedOptions.length > 0 && (
        <div className="text-xs text-gray-500">
          {selectedOptions.length} seleccionado{selectedOptions.length !== 1 ? 's' : ''}
          {selectedOptions.length > 3 && (
            <span className="ml-2 text-indigo-600">
              (scroll para ver todos)
            </span>
          )}
        </div>
      )}

      {/* Modo pegar */}
      {showPasteMode && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-xs text-indigo-700 font-medium">
              Pega los referenceIds (uno por línea):
            </div>
            <div className="text-xs text-indigo-500">
              {options.length} IntCategories disponibles
            </div>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPasteError(null);
            }}
            placeholder={`RUNN-ZAPA\nRUNN-ZAPA-TRAI\nOUTD-BOTA`}
            className="w-full h-24 px-2 py-1 text-sm border border-indigo-300 rounded-md font-mono text-gray-900 bg-white"
          />
          {pasteError && (
            <div className={`text-xs p-2 rounded ${pasteError.includes("Añadidos") ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              {pasteError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteSubmit}
              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" />
              Añadir
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasteMode(false);
                setPasteText("");
                setPasteError(null);
              }}
              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1 h-3 w-3" />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
