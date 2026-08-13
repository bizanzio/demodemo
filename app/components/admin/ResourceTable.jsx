import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEdit,
  faTrash,
  faInbox,
  faPlus,
  faSave,
  faTimes,
  faSpinner,
  faCheck,
  faPencilAlt,
  faSort,
  faSortUp,
  faSortDown,
  faFilter,
  faSearch,
  faChevronLeft,
  faChevronRight,
  faStepBackward,
  faStepForward,
  faExclamationCircle,
  faImage,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import FilterPanel from "./FilterPanel";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SizeValueDisplay from "./TableComponents/SizeValueDisplay";
import SizeValueForm from "./TableComponents/SizeValueForm";
import Select from "react-select";
import CategoryForm from "./TableComponents/CategoryForm";
import IntCategoryMultiSelect from "./TableComponents/IntCategoryMultiSelect";
import RelationDisplay from "./TableComponents/RelationDisplay";
import CategoryListDisplay from "./TableComponents/CategoryListDisplay";
import ImageUploader from "./ImageUploader";

export default function ResourceTable({
  resource,
  resourceEndpoint,
  fields,
  items,
  relatedData,
  pagination,
  searchTerm: externalSearchTerm,
  appliedSearchTerm,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onNew,
  onSave,
  onFilter,
  onSort,
  onSearchChange,
  onApplySearch,
  onClearSearch,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineFormData, setInlineFormData] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(null);

  // Estados para filtrado y ordenamiento
  const [filters, setFilters] = useState({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });
  const [filteredItems, setFilteredItems] = useState([]);
  
  // Estado para búsqueda rápida (usa el externo si está disponible)
  const [localSearch, setLocalSearch] = useState("");
  const quickSearch = externalSearchTerm !== undefined ? externalSearchTerm : localSearch;
  const setQuickSearch = onSearchChange || setLocalSearch;
  const isSearchFromBackend = !!onApplySearch;

  // Inicializar filtros desde la URL al cargar
  useEffect(() => {
    if (!searchParams) return;

    const initialFilters = {};

    // Para cada parámetro de búsqueda, si no es de paginación o sorting, es un filtro
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      if (!["page", "pageSize", "sortBy", "sortDir"].includes(key) && value) {
        initialFilters[key] = value;
      }
    });

    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
      setFilterVisible(true); // Mostrar panel de filtros si hay filtros activos
    }

    // Inicializar también el sorting desde la URL
    const sortBy = searchParams.get("sortBy");
    const sortDir = searchParams.get("sortDir");
    if (sortBy && sortDir) {
      console.log("Inicializando sortConfig desde URL:", {
        key: sortBy,
        direction: sortDir,
      });
      setSortConfig({ key: sortBy, direction: sortDir });
    }
  }, [searchParams]);

  // Función para obtener las propiedades principales a mostrar por cada recurso
  const getMainProperties = () => {
    switch (resource.toLowerCase()) {
      case "sizesystem":
        return ["id", "systemName", "displayOrder", "trans_es", "trans_ca", "trans_en", "trans_it", "trans_fr", "trans_de"];
      case "supplier":
        return ["id", "name"];
      case "gender":
        return ["id", "name"];
      case "category":
        return [
          "name",
          "gender",
          "supplier",
          "sizingSystems",
          "intCategories",
          "hasSizeGrid",
        ];
      case "intcategory":
        return ["id", "referenceId", "name", "categories"];
      case "size":
        return ["id", "originalSize", "sizeSystem", "supplier", "category"];
      case "productsizeexception":
        return ["id", "modelCodes", "redirectCategory", "notes"];
      default:
        return ["id"];
    }
  };

  const mainProperties = getMainProperties();

  // Obtener label amigable para columnas (especialmente para traducciones)
  const getColumnLabel = (property) => {
    const labels = {
      trans_es: "ES",
      trans_ca: "CA",
      trans_en: "EN",
      trans_it: "IT",
      trans_fr: "FR",
      trans_de: "DE",
      displayOrder: "Orden",
    };
    return labels[property] || property;
  };

  // Obtener valor de traducción de un item
  const getTranslationValue = (item, locale) => {
    if (!item.translations || !Array.isArray(item.translations)) return "-";
    const translation = item.translations.find((t) => t.locale === locale);
    return translation?.name || "-";
  };

  // Obtener la clave de etiqueta para las relaciones
  const getLabelKeyForRelation = (property) => {
    const labelMap = {
      sizeSystem: "systemName",
      supplier: "name",
      gender: "name",
      category: "name",
      intCategories: "name",
      categories: "name",
      int_Category: "name",
      redirectCategory: "name",
    };
    return labelMap[property] || "name";
  };

  // Inicializar filteredItems con todos los items
  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Actualizar items filtrados cuando cambian los filtros, ordenamiento o búsqueda rápida
  useEffect(() => {
    let result = [...items];

    // Aplicar búsqueda rápida SOLO si no hay búsqueda en backend
    // Si hay onApplySearch, la búsqueda ya se hizo en el servidor
    if (quickSearch.trim() && !isSearchFromBackend) {
      const searchLower = quickSearch.toLowerCase().trim();
      result = result.filter((item) => {
        // Buscar en todas las propiedades principales
        return mainProperties.some((property) => {
          const value = item[property];
          
          if (value === null || value === undefined) return false;
          
          // Si es un objeto (relación), buscar en su nombre/label
          if (typeof value === "object") {
            if (Array.isArray(value)) {
              // Para arrays (como intCategories, categories)
              return value.some((v) => {
                const labelKey = getLabelKeyForRelation(property);
                return String(v[labelKey] || v.name || v.referenceId || "")
                  .toLowerCase()
                  .includes(searchLower);
              });
            }
            const labelKey = getLabelKeyForRelation(property);
            return String(value[labelKey] || "")
              .toLowerCase()
              .includes(searchLower);
          }
          
          // Para valores primitivos
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Aplicar filtros localmente si no hay onFilter (filtrado en servidor)
    if (Object.keys(filters).length > 0 && !onFilter) {
      result = result.filter((item) => {
        return Object.keys(filters).every((key) => {
          if (!filters[key]) return true;

          // Manejar filtrado de relaciones
          if (typeof item[key] === "object" && item[key] !== null) {
            const labelKey = getLabelKeyForRelation(key);
            return item[key][labelKey]
              ?.toLowerCase()
              .includes(filters[key].toLowerCase());
          }

          // Filtrado normal para valores primitivos
          return String(item[key])
            .toLowerCase()
            .includes(filters[key].toLowerCase());
        });
      });
    }

    // Aplicar ordenamiento local solo si no está ordenado en el servidor
    if (sortConfig.key && !onSort) {
      result.sort((a, b) => {
        // Obtener los valores a comparar
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Si son objetos (relaciones), usar la propiedad apropiada
        if (typeof aValue === "object" && aValue !== null) {
          const labelKey = getLabelKeyForRelation(sortConfig.key);
          aValue = aValue[labelKey];
        }

        if (typeof bValue === "object" && bValue !== null) {
          const labelKey = getLabelKeyForRelation(sortConfig.key);
          bValue = bValue[labelKey];
        }

        // Manejar valores nulos
        if (aValue === null) return sortConfig.direction === "asc" ? -1 : 1;
        if (bValue === null) return sortConfig.direction === "asc" ? 1 : -1;

        // Comparar números como números
        if (!isNaN(aValue) && !isNaN(bValue)) {
          return sortConfig.direction === "asc"
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }

        // Comparar strings
        return sortConfig.direction === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    setFilteredItems(result);
  }, [filters, sortConfig, items, quickSearch]);

  // Encontrar el campo correspondiente a una propiedad
  const findFieldForProperty = (property) => {
    // Caso especial para originSystem
    if (property === "originSystem") {
      return (
        fields.find((f) => f.name === "originSystemId") ||
        fields.find((f) => f.relation === "sizeSystem")
      );
    }

    // Caso especial para redirectCategory
    if (property === "redirectCategory") {
      return fields.find((f) => f.name === "redirectCategoryId");
    }

    // Para propiedades simples, buscar por nombre
    const directField = fields.find((f) => f.name === property);
    if (directField) return directField;

    // Para relaciones, buscar por el nombre de la relación
    return fields.find((f) => f.relation === property);
  };

  // Formatear valores para mostrar relaciones correctamente
  const formatValue = (property, value, item) => {
    // Si es una talla y tiene valores en diferentes sistemas
    if (resource === "size" && property === "originalSize" && item.sizeValues) {
      return (
        <SizeValueDisplay
          size={item}
          category={item.category}
          showAllSystems={true}
        />
      );
    }

    // Caso especial para hasSizeGrid - mostrar SI/NO con colores
    if (property === "hasSizeGrid") {
      const hasGrid = hasSizeGrid(item);
      const sizesCount = item.sizes?.length || 0;
      const sizesWithValues = item.sizes?.filter(
        (s) => s.sizeValues && s.sizeValues.length > 0
      ).length || 0;
      
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            hasGrid
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
          title={hasGrid 
            ? `${sizesWithValues} de ${sizesCount} tallas con equivalencias` 
            : "Sin grilla de tallas creada"
          }
        >
          {hasGrid ? `SÍ (${sizesWithValues}/${sizesCount})` : "NO"}
        </span>
      );
    }

    // Caso especial para intCategories - mostrar resumen compacto
    if (property === "intCategories") {
      if (!value || value.length === 0) {
        return <span className="text-gray-400">-</span>;
      }

      const maxVisible = 2;
      const visibleItems = value.slice(0, maxVisible);
      const remainingCount = value.length - maxVisible;

      return (
        <div className="flex flex-wrap gap-1 items-center">
          {visibleItems.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200"
              title={`${category.name} (${category.referenceId})`}
            >
              {category.referenceId}
            </span>
          ))}
          {remainingCount > 0 && (
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200 cursor-help"
              title={value.slice(maxVisible).map(c => c.referenceId).join(", ")}
            >
              +{remainingCount} más
            </span>
          )}
        </div>
      );
    }

    // Caso especial para categories (en IntCategory)
    if (property === "categories") {
      return <CategoryListDisplay categories={value} />;
    }

    // Caso especial para redirectCategory
    if (property === "redirectCategory") {
      if (!value) return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
          {value.supplier?.name} - {value.gender?.name} - {value.name}
        </span>
      );
    }

    // Para el resto de casos, mantener la lógica existente
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    if (typeof value === "boolean") {
      return value ? (
        <span className="text-green-600">Sí</span>
      ) : (
        <span className="text-red-600">No</span>
      );
    }

    if (typeof value === "object") {
      const labelKey = getLabelKeyForRelation(property);
      return <RelationDisplay value={value} labelKey={labelKey} />;
    }

    return value;
  };

  // Obtener opciones para los campos de selección
  const getSelectOptions = (field) => {
    if (!field.relation) return [];

    // Caso especial para originSystem
    if (field.name === "originSystemId") {
      return relatedData["sizeSystem"] || [];
    }

    // Caso especial para redirectCategoryId en ProductSizeException - mostrar todas las categorías
    if (field.name === "redirectCategoryId") {
      return relatedData.category || [];
    }

    // Caso especial para categoryId - filtrar por proveedor seleccionado (solo para Size)
    if (field.relation === "category" && resource.toLowerCase() === "size") {
      // Para el formulario de creación (inline)
      if (showInlineForm && inlineFormData.supplierId) {
        return (relatedData.category || []).filter(
          (cat) => cat.supplierId === inlineFormData.supplierId
        );
      }
      // Para el formulario de edición
      if (editingItemId && editFormData.supplierId) {
        return (relatedData.category || []).filter(
          (cat) => cat.supplierId === editFormData.supplierId
        );
      }
    }

    return relatedData[field.relation] || [];
  };

  // Determinar la etiqueta para las opciones del select
  const getOptionLabel = (relation, item) => {
    const labelMap = {
      sizeSystem: "systemName",
      supplier: "name",
      gender: "name",
      category: "name",
      int_Category: "name",
    };

    // Para int_Category, mostrar referenceId y name
    if (relation === "int_Category" && item.referenceId) {
      return `${item.referenceId} - ${item.name}`;
    }

    // Para category, mostrar Proveedor - Género - Nombre
    if (relation === "category") {
      const supplierName = item.supplier?.name || "Sin proveedor";
      const genderName = item.gender?.name || "Sin género";
      return `${supplierName} - ${genderName} - ${item.name}`;
    }

    return item[labelMap[relation] || "name"] || item.id;
  };

  // Manejar cambios en el formulario en línea
  const handleInlineChange = (e) => {
    const { name, value } = e.target;

    // Convertir a número si es un campo de ID de relación (no referenceId que es string)
    const isRelationId = name.endsWith("Id") && name !== "referenceId";
    const processedValue =
      isRelationId && value !== "" ? parseInt(value, 10) : value;

    const newFormData = {
      ...inlineFormData,
      [name]: processedValue,
    };

    // Si estamos en el recurso "size" y se cambió el proveedor,
    // actualizar automáticamente el sistema de tallas
    if (
      resource.toLowerCase() === "size" &&
      name === "supplierId" &&
      value !== ""
    ) {
      const supplierId = parseInt(value, 10);
      const selectedSupplier = relatedData.supplier?.find(
        (supplier) => supplier.id === supplierId
      );

      console.log("Proveedor seleccionado:", selectedSupplier);

      if (selectedSupplier) {
        // Ahora buscamos la categoría que tenga el mismo proveedor
        const selectedCategory = relatedData.category?.find(
          (category) => category.supplierId === supplierId
        );

        if (selectedCategory && selectedCategory.originSystemId) {
          console.log(
            "Sistema de tallas de la categoría:",
            selectedCategory.originSystemId
          );
          newFormData.sizeSystemId = selectedCategory.originSystemId;

          // Si ya hay un valor en originalSize, lo copiamos al sistema seleccionado
          if (inlineFormData.originalSize) {
            newFormData.sizeValues = {
              ...(inlineFormData.sizeValues || {}),
              [selectedCategory.originSystemId]: {
                sizeSystemId: selectedCategory.originSystemId,
                value: inlineFormData.originalSize,
              },
            };
          }
        }
      }
    }

    // Si estamos en el recurso "size" y se cambió el originalSize o sizeSystemId
    if (resource.toLowerCase() === "size") {
      if (name === "originalSize" && inlineFormData.sizeSystemId) {
        // Si cambia el valor original y ya hay un sistema seleccionado, actualizar también ese valor
        newFormData.sizeValues = {
          ...(inlineFormData.sizeValues || {}),
          [inlineFormData.sizeSystemId]: {
            sizeSystemId: inlineFormData.sizeSystemId,
            value: value,
          },
        };
      } else if (
        name === "sizeSystemId" &&
        value &&
        inlineFormData.originalSize
      ) {
        // Si cambia el sistema y ya hay un valor original, copiar ese valor al sistema seleccionado
        newFormData.sizeValues = {
          ...(inlineFormData.sizeValues || {}),
          [value]: {
            sizeSystemId: parseInt(value, 10),
            value: inlineFormData.originalSize,
          },
        };
      }
    }

    setInlineFormData(newFormData);
  };

  // Manejar cambios en el formulario de edición
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    // Convertir a número si es un campo de ID de relación (no referenceId que es string)
    const isRelationId = name.endsWith("Id") && name !== "referenceId";
    const processedValue =
      isRelationId && value !== "" ? parseInt(value, 10) : value;

    const newFormData = {
      ...editFormData,
      [name]: processedValue,
    };

    // Si estamos en el recurso "size" y se cambió el proveedor,
    // actualizar automáticamente el sistema de tallas
    if (
      resource.toLowerCase() === "size" &&
      name === "supplierId" &&
      value !== ""
    ) {
      const supplierId = parseInt(value, 10);
      const selectedSupplier = relatedData.supplier?.find(
        (supplier) => supplier.id === supplierId
      );

      if (selectedSupplier && selectedSupplier.originSystemId) {
        newFormData.sizeSystemId = selectedSupplier.originSystemId;
      }
    }

    setEditFormData(newFormData);
    console.log(`Campo cambiado: ${name} = ${processedValue}`);
  };

  // Iniciar edición de un elemento
  const startEditing = (item) => {
    setEditingItemId(item.id);

    // Inicializar el formulario con los datos actuales
    const initialData = { ...item };

    // Convertir relaciones a IDs para el formulario
    fields.forEach((field) => {
      if (field.relation) {
        const relationKey = field.relation;
        const relationObject = item[relationKey];

        if (relationObject) {
          initialData[`${relationKey}Id`] = relationObject.id;
        }
      }
    });

    // Caso especial para originSystem
    if (item.originSystem && typeof item.originSystem === "object") {
      initialData.originSystemId = item.originSystem.id;
    }

    // Caso especial para redirectCategory (ProductSizeException)
    if (item.redirectCategory && typeof item.redirectCategory === "object") {
      initialData.redirectCategoryId = item.redirectCategory.id;
    }

    // Inicializar sizingSystems como array de IDs
    if (item.sizingSystems && Array.isArray(item.sizingSystems)) {
      initialData.sizingSystems = item.sizingSystems.map((sys) => sys.id);
    }

    // Inicializar intCategories como array de IDs
    if (item.intCategories && Array.isArray(item.intCategories)) {
      initialData.intCategories = item.intCategories.map((cat) => cat.id);
      console.log("Inicializando intCategories:", initialData.intCategories);
    }

    // Inicializar sizeValues como un objeto indexado por systemId
    if (item.sizeValues && Array.isArray(item.sizeValues)) {
      console.log("Inicializando sizeValues:", item.sizeValues);
      initialData.sizeValues = item.sizeValues.reduce((acc, sv) => {
        console.log("sv:", sv);
        if (sv.sizeSystemId) {
          acc[sv.sizeSystemId] = {
            sizeSystemId: sv.sizeSystemId,
            value: sv.value,
          };
        } else if (sv.sizeSystem && sv.sizeSystem.id) {
          acc[sv.sizeSystem.id] = {
            sizeSystemId: sv.sizeSystem.id,
            value: sv.value,
          };
        }
        return acc;
      }, {});
    }

    // Inicializar translations como un objeto indexado por locale
    if (item.translations && Array.isArray(item.translations)) {
      initialData.translations = item.translations.reduce((acc, t) => {
        acc[t.locale] = t.name;
        return acc;
      }, {});
    } else {
      // Inicializar objeto vacío para traducciones nuevas
      initialData.translations = {};
    }

    // Eliminar propiedades que no necesitamos en el formulario
    delete initialData.createdAt;
    delete initialData.updatedAt;

    setEditFormData(initialData);
    console.log("Datos iniciales para edición:", initialData);
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditFormData({});
  };

  // Duplicar un elemento (principalmente para Category)
  const handleDuplicate = async (item) => {
    setSubmitting(true);
    setError(null);

    try {
      // Preparar los datos para duplicar
      const duplicateData = {
        name: `${item.name} (copia)`,
        genderId: item.genderId || item.gender?.id || null,
        supplierId: item.supplierId || item.supplier?.id || null,
        originSystemId: item.originSystemId || item.originSystem?.id || null,
        predefinedSystemId: item.predefinedSystemId || item.predefinedSystem?.id || null,
      };

      // Duplicar sizingSystems si existen
      if (item.sizingSystems && item.sizingSystems.length > 0) {
        duplicateData.sizingSystems = item.sizingSystems.map((sys) => sys.id);
      }

      // Duplicar intCategories si existen
      if (item.intCategories && item.intCategories.length > 0) {
        duplicateData.intCategories = item.intCategories.map((cat) => cat.id);
      }

      console.log("DUPLICATE - Datos a crear:", duplicateData);

      const response = await fetch(`/api/crud/${resourceEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(duplicateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al duplicar");
      }

      const result = await response.json();
      console.log("DUPLICATE - Resultado:", result);
      
      // Recargar datos
      if (onSave) {
        await onSave(result);
      }
    } catch (err) {
      console.error("DUPLICATE - Error:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar formulario de edición
  const handleEditSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      console.log("EDIT SUBMIT - Iniciando envío");
      console.log("EDIT SUBMIT - editFormData:", editFormData);
      console.log("EDIT SUBMIT - editingItemId:", editingItemId);

      let dataToSend;
      if (resource === "size") {
        const { sizeValues, ...restData } = editFormData;
        if (!sizeValues) {
          throw new Error("No se han especificado los valores de talla");
        }
        dataToSend = {
          ...restData,
          sizeValues: Object.entries(sizeValues).map(([systemId, value]) => ({
            sizeSystemId: parseInt(systemId),
            value,
          })),
        };
        console.log("EDIT SUBMIT - Enviando talla:", dataToSend);
      } else if (resource === "sizesystem") {
        // Manejo especial para sizeSystem
        const { categories, sizeValues, translations, ...restData } = editFormData;

        // Preparar datos para enviar sin categories completos, solo sus IDs
        dataToSend = {
          ...restData,
        };

        // Si hay categorías, convertirlas en un formato que Prisma acepte
        if (categories && Array.isArray(categories)) {
          dataToSend.categories = {
            connect: categories.map((cat) =>
              typeof cat === "object" ? { id: cat.id } : { id: parseInt(cat) }
            ),
          };
        }

        // Procesar traducciones: convertir objeto {locale: name} a array [{locale, name}]
        if (translations && typeof translations === "object") {
          dataToSend.translations = Object.entries(translations)
            .filter(([locale, name]) => name && name.trim() !== "")
            .map(([locale, name]) => ({ locale, name }));
        }

        console.log("EDIT SUBMIT - Enviando sizesystem:", dataToSend);
      } else {
        // Procesar sizingSystems si existe
        if (editFormData.sizingSystems) {
          editFormData.sizingSystems = editFormData.sizingSystems.map((id) =>
            parseInt(id)
          );
          console.log(
            "EDIT SUBMIT - sizingSystems procesado:",
            editFormData.sizingSystems
          );
        }

        // Procesar intCategories si existe
        if (editFormData.intCategories) {
          editFormData.intCategories = editFormData.intCategories.map((id) =>
            parseInt(id)
          );
          console.log(
            "EDIT SUBMIT - intCategories procesado:",
            editFormData.intCategories
          );
        }

        dataToSend = { ...editFormData };
        console.log("EDIT SUBMIT - Enviando datos:", dataToSend);
      }

      // Hacer fetch PUT a la API
      const response = await fetch(
        `/api/crud/${resourceEndpoint}/${editingItemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar los datos");
      }

      const result = await response.json();
      console.log("EDIT SUBMIT - Respuesta backend:", result);
      await onSave(result);

      console.log("EDIT SUBMIT - Envío completado");
      setEditingItemId(null);
      setEditFormData({});
    } catch (err) {
      console.error("EDIT SUBMIT - Error:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar formulario en línea
  const handleInlineSubmit = async (dataToSubmit) => {
    setSubmitting(true);
    setError(null);

    try {
      // Comprobar si dataToSubmit es un evento en lugar de datos
      if (dataToSubmit && dataToSubmit.nativeEvent) {
        console.log(
          "Se recibió un evento en lugar de datos. Usando inlineFormData."
        );
        dataToSubmit = null;
      }

      // Si no se pasó dataToSubmit, usar inlineFormData
      const formData = dataToSubmit
        ? { ...dataToSubmit }
        : { ...inlineFormData };

      console.log("INLINE SUBMIT: formData (antes de limpiar)", formData);

      // Eliminar campos nulos o vacíos que no son requeridos
      fields.forEach((field) => {
        if (
          !field.required &&
          (formData[field.name] === "" || formData[field.name] === null)
        ) {
          delete formData[field.name];
        }
      });

      // Eliminar propiedades que pueden contener referencias circulares
      delete formData.events;
      delete formData.refs;
      delete formData._owner;
      delete formData._store;
      delete formData.ref;

      // Limpiar propiedades de eventos React
      Object.keys(formData).forEach((key) => {
        if (
          key.startsWith("_react") ||
          key === "nativeEvent" ||
          key === "target" ||
          key === "currentTarget" ||
          key === "view"
        ) {
          delete formData[key];
        }
      });

      // Asegurarse de que los sizingSystems sean números
      if (formData.sizingSystems) {
        formData.sizingSystems = formData.sizingSystems.map((id) =>
          parseInt(id)
        );
      }

      // Asegurarse de que los intCategories sean números
      if (formData.intCategories) {
        formData.intCategories = formData.intCategories.map((id) =>
          parseInt(id)
        );
        console.log(
          "INLINE SUBMIT: intCategories procesado",
          formData.intCategories
        );
      }

      // Especial para Size: procesar valores de sistemas de tallas
      if (resource.toLowerCase() === "size" && formData.sizeValues) {
        formData.sizeValues = Object.values(formData.sizeValues)
          .filter((sv) => sv.value && sv.value.trim() !== "")
          .map((sv) => ({
            sizeSystemId: parseInt(sv.sizeSystemId),
            value: sv.value,
          }));
      }

      // Especial para SizeSystem: procesar traducciones
      if (resource.toLowerCase() === "sizesystem" && formData.translations) {
        formData.translations = Object.entries(formData.translations)
          .filter(([locale, name]) => name && name.trim() !== "")
          .map(([locale, name]) => ({ locale, name }));
      }

      console.log("INLINE SUBMIT: formData limpio", formData);

      const response = await fetch(`/api/crud/${resourceEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar los datos");
      }

      // Notificar al componente padre que se ha guardado correctamente
      const result = await response.json();
      console.log("INLINE SUBMIT: respuesta backend", result);
      onSave(result);

      // Limpiar formulario
      setShowInlineForm(false);
      setInlineFormData({});
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Funciones para paginación
  const goToFirstPage = () => {
    if (pagination && pagination.hasPrevPage && onPageChange) {
      onPageChange(1);
    }
  };

  const goToPrevPage = () => {
    if (pagination && pagination.hasPrevPage && onPageChange) {
      onPageChange(pagination.page - 1);
    }
  };

  const goToNextPage = () => {
    if (pagination && pagination.hasNextPage && onPageChange) {
      onPageChange(pagination.page + 1);
    }
  };

  const goToLastPage = () => {
    if (pagination && pagination.hasNextPage && onPageChange) {
      onPageChange(pagination.totalPages);
    }
  };

  const goToPage = (pageNum) => {
    if (pagination && onPageChange) {
      onPageChange(pageNum);
    }
  };

  const handlePageSizeChange = (e) => {
    if (onPageSizeChange) {
      onPageSizeChange(Number(e.target.value));
    }
  };

  // Función para generar los números de página a mostrar
  const getPageNumbers = () => {
    if (!pagination) return [];

    const { page, totalPages } = pagination;
    const pageNumbers = [];

    // Siempre mostrar la primera página
    pageNumbers.push(1);

    // Lógica para mostrar páginas alrededor de la actual
    if (page > 3) pageNumbers.push("...");

    // Páginas alrededor de la actual
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pageNumbers.push(i);
    }

    // Elipsis antes de la última página si hay muchas páginas
    if (page < totalPages - 2) pageNumbers.push("...");

    // Siempre mostrar la última página si hay más de una
    if (totalPages > 1) pageNumbers.push(totalPages);

    return pageNumbers;
  };

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  
  // Estado para el modal de imágenes de categoría
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalCategory, setImageModalCategory] = useState(null);
  const [categoryImages, setCategoryImages] = useState([]);

  // Estado para el modal de grilla de tallas
  const [sizeGridModalOpen, setSizeGridModalOpen] = useState(false);
  const [sizeGridCategory, setSizeGridCategory] = useState(null);

  // Función para manejar la selección de un elemento
  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  // Función para seleccionar/deseleccionar todos los elementos
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
    setIsSelectAll(!isSelectAll);
  };

  // Función para borrar elementos seleccionados
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      window.confirm(
        `¿Estás seguro de que quieres borrar ${selectedItems.size} elementos?`
      )
    ) {
      const itemIds = Array.from(selectedItems);
      const total = itemIds.length;
      let completed = 0;
      const failedDeletions = [];

      setSubmitting(true);
      setError(null);
      setBulkDeleteProgress({ total, completed: 0, failed: 0 });

      try {
        for (const itemId of itemIds) {
          try {
            const response = await fetch(`/api/crud/${resourceEndpoint}/${itemId}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => null);
              const message =
                errorData?.error || `No se pudo borrar el elemento ${itemId}`;
              failedDeletions.push({ itemId, message });
            }
          } catch (requestError) {
            failedDeletions.push({
              itemId,
              message: requestError?.message || "Error de red al borrar",
            });
          } finally {
            completed += 1;
            setBulkDeleteProgress({
              total,
              completed,
              failed: failedDeletions.length,
            });
          }
        }

        if (failedDeletions.length > 0) {
          const preview = failedDeletions
            .slice(0, 3)
            .map((failure) => `#${failure.itemId}: ${failure.message}`)
            .join(" | ");
          setError(
            `Se borraron ${total - failedDeletions.length}/${total}. Errores: ${preview}${
              failedDeletions.length > 3 ? "..." : ""
            }`
          );
          setSelectedItems(new Set(failedDeletions.map((failure) => failure.itemId)));
          setIsSelectAll(false);
        } else {
          setSelectedItems(new Set());
          setIsSelectAll(false);
        }

        if (onSave) {
          await onSave({ deletedCount: total - failedDeletions.length });
        }
      } catch (error) {
        console.error("Error al borrar elementos:", error);
        setError(error?.message || "Error al borrar elementos");
      } finally {
        setSubmitting(false);
        setTimeout(() => {
          setBulkDeleteProgress(null);
        }, 1500);
      }
    }
  };

  // Función para eliminar un elemento individual con confirmación
  const handleSingleDelete = async (itemId) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar este elemento?")
    ) {
      try {
        await onDelete(itemId);
      } catch (error) {
        console.error("Error al eliminar elemento:", error);
        setError(error?.message || "Error al eliminar el elemento");
      }
    }
  };

  // Función para abrir el modal de imágenes
  const openImageModal = async (category) => {
    setImageModalCategory(category);
    setCategoryImages(category.images || []);
    setImageModalOpen(true);
  };

  // Función para cerrar el modal de imágenes
  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalCategory(null);
    setCategoryImages([]);
  };

  // Función para verificar si una categoría tiene grilla de tallas creada
  const hasSizeGrid = (category) => {
    if (!category.sizes || category.sizes.length === 0) return false;
    // Verificar que al menos una talla tenga valores de equivalencia
    return category.sizes.some(
      (size) => size.sizeValues && size.sizeValues.length > 0
    );
  };

  // Función para abrir el modal de grilla de tallas
  const openSizeGridModal = (category) => {
    setSizeGridCategory(category);
    setSizeGridModalOpen(true);
  };

  // Función para cerrar el modal de grilla de tallas
  const closeSizeGridModal = () => {
    setSizeGridModalOpen(false);
    setSizeGridCategory(null);
  };

  // --- COLUMNAS DINÁMICAS DE SISTEMAS DE TALLAJE ---
  // Solo para el recurso 'size'
  let dynamicSizeSystems = [];
  if (resource.toLowerCase() === "size") {
    // Extraer todos los sistemas de tallaje únicos presentes en las categorías de los items
    const systemsSet = new Map();
    items.forEach((item) => {
      if (item.category && item.category.sizingSystems) {
        item.category.sizingSystems.forEach((sys) => {
          systemsSet.set(sys.id, sys);
        });
      }
    });
    dynamicSizeSystems = Array.from(systemsSet.values());
  }

  // Función para manejar cambios en los filtros
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    // Actualizar URL con los nuevos filtros
    updateUrlWithFilters(newFilters);

    // Si hay función de filtrado en servidor, la llamamos
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  // Función para limpiar los filtros
  const clearFilters = () => {
    setFilters({});

    // Actualizar URL eliminando los filtros
    updateUrlWithFilters({});

    if (onFilter) onFilter({});
  };

  // Función para actualizar la URL con los filtros actuales
  const updateUrlWithFilters = (filterObj) => {
    // Crear un nuevo objeto URLSearchParams
    const params = new URLSearchParams(searchParams.toString());

    // Mantener parámetros de paginación y ordenamiento
    const preserveParams = ["page", "pageSize", "sortBy", "sortDir"];

    // Eliminar todos los parámetros que no son de paginación o sorting
    Array.from(params.keys()).forEach((key) => {
      if (!preserveParams.includes(key)) {
        params.delete(key);
      }
    });

    // Añadir los nuevos filtros
    Object.entries(filterObj).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    // Si hay filtros, volver a la primera página
    if (Object.keys(filterObj).length > 0 || params.has("page")) {
      params.set("page", "1");
    }

    // Actualizar la URL sin recargar la página
    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  // Función para manejar el clic en los encabezados para ordenar
  const handleSort = (key) => {
    console.log("ResourceTable - handleSort - Inicio", {
      key,
      sortConfigActual: sortConfig,
    });
    let direction = "asc";

    if (sortConfig.key === key) {
      console.log("ResourceTable - handleSort - Misma columna detectada");
      if (sortConfig.direction === "asc") {
        console.log("ResourceTable - handleSort - Cambiando de asc a desc");
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        console.log("ResourceTable - handleSort - Cambiando de desc a null");
        key = null;
        direction = null;
      }
    } else {
      console.log(
        "ResourceTable - handleSort - Nueva columna, iniciando en asc"
      );
    }

    const newSortConfig = { key, direction };
    console.log(
      "ResourceTable - handleSort - Nuevo sortConfig:",
      newSortConfig
    );

    // Importante: actualizar el estado inmediatamente para futuras referencias
    setSortConfig(newSortConfig);

    // Actualizar URL con el ordenamiento
    const params = new URLSearchParams(searchParams.toString());
    if (key && direction) {
      params.set("sortBy", key);
      params.set("sortDir", direction);
    } else {
      params.delete("sortBy");
      params.delete("sortDir");
    }

    const newUrl = `${pathname}?${params.toString()}`;
    console.log("ResourceTable - handleSort - Nueva URL:", newUrl);
    router.push(newUrl);

    // Si hay función para ordenar en el servidor
    if (onSort) {
      console.log(
        "ResourceTable - handleSort - Llamando a onSort con:",
        newSortConfig
      );
      onSort(newSortConfig);
    } else {
      console.log(
        "ResourceTable - handleSort - No hay función onSort disponible"
      );
    }

    // Verificar estado final
    console.log(
      "ResourceTable - handleSort - Estado final sortConfig:",
      newSortConfig
    );
  };

  if (filteredItems.length === 0 && !showInlineForm) {
    return (
      <div className="py-12 text-center">
        <FontAwesomeIcon
          icon={faInbox}
          className="mx-auto h-12 w-12 text-gray-400"
        />
        <p className="mt-2 text-sm font-medium text-gray-500">
          No hay elementos para mostrar
          {Object.keys(filters).length > 0 ? " con los filtros actuales" : ""}
        </p>
        <div className="mt-4 flex justify-center space-x-3">
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Limpiar filtros
            </button>
          )}
          <button
            onClick={() => setShowInlineForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Añadir {resource.toLowerCase()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <div className="flex items-center">
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="mr-2 h-4 w-4 text-red-500"
            />
            <span>{error}</span>
          </div>
        </div>
      )}

      {bulkDeleteProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          <div className="flex items-center">
            <FontAwesomeIcon
              icon={faSpinner}
              className="mr-2 h-4 w-4 animate-spin text-blue-500"
            />
            <span>
              Borrando elementos: {bulkDeleteProgress.completed}/{bulkDeleteProgress.total}
              {bulkDeleteProgress.failed > 0
                ? ` (${bulkDeleteProgress.failed} con error)`
                : ""}
            </span>
          </div>
        </div>
      )}

      {/* Controles superiores */}
      <div className="m-4 flex justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowInlineForm(true)}
            disabled={submitting}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-3 w-3" />
            Añadir fila
          </button>

          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={submitting}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FontAwesomeIcon
                icon={submitting ? faSpinner : faTrash}
                className={`mr-2 h-3 w-3 ${submitting ? "animate-spin" : ""}`}
              />
              {submitting
                ? "Borrando..."
                : `Borrar seleccionados (${selectedItems.size})`}
            </button>
          )}
        </div>

        {/* Buscador rápido */}
        <div className="flex-1 max-w-lg">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onApplySearch) {
                    onApplySearch();
                  }
                }}
                placeholder={`Buscar en ${resource.toLowerCase()}...`}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
              {quickSearch && (
                <button
                  onClick={() => {
                    setQuickSearch("");
                    if (onClearSearch) onClearSearch();
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <FontAwesomeIcon
                    icon={faTimes}
                    className="h-4 w-4 text-gray-400 hover:text-gray-600"
                  />
                </button>
              )}
            </div>
            {isSearchFromBackend && (
              <button
                onClick={onApplySearch}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Buscar
              </button>
            )}
          </div>
          {appliedSearchTerm && (
            <p className="mt-1 text-xs text-gray-500">
              Buscando: "{appliedSearchTerm}" - {filteredItems.length} resultado{filteredItems.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <button
          onClick={() => setFilterVisible(!filterVisible)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FontAwesomeIcon icon={faFilter} className="mr-2 h-3 w-3" />
          {filterVisible ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {/* Panel de filtros */}
      {filterVisible && (
        <FilterPanel
          mainProperties={mainProperties}
          filters={filters}
          onFilterChange={handleFilterChange}
          clearFilters={clearFilters}
          relatedData={relatedData}
          resource={resource}
        />
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="relative w-12 px-6 py-3">
              <input
                type="checkbox"
                checked={isSelectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </th>
            {mainProperties.map((property) => (
              <th
                key={property}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  property.startsWith("trans_") ? "" : "cursor-pointer"
                }`}
                onClick={() => !property.startsWith("trans_") && handleSort(property)}
              >
                <div className="flex items-center">
                  {getColumnLabel(property)}
                  {!property.startsWith("trans_") && (
                    <span className="ml-1">
                      {sortConfig.key === property ? (
                        sortConfig.direction === "asc" ? (
                          <FontAwesomeIcon icon={faSortUp} className="h-3 w-3" />
                        ) : (
                          <FontAwesomeIcon
                            icon={faSortDown}
                            className="h-3 w-3"
                          />
                        )
                      ) : (
                        <FontAwesomeIcon
                          icon={faSort}
                          className="h-3 w-3 text-gray-400"
                        />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {/* Columnas dinámicas de sistemas de tallaje */}
            {resource.toLowerCase() === "size" &&
              dynamicSizeSystems.map((system) => (
                <th
                  key={`dynamic-system-${system.id}`}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {system.systemName}
                </th>
              ))}
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Formulario en línea para crear nuevo elemento */}
          {showInlineForm && (
            <tr className="bg-green-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 w-4 border border-gray-300 rounded bg-gray-100"></div>
              </td>
              {mainProperties.map((property) => {
                const field = findFieldForProperty(property);

                // Para el ID, mostrar (auto)
                if (property === "id") {
                  return (
                    <td
                      key={property}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      (auto)
                    </td>
                  );
                }

                // Columnas de traducción para SizeSystem en creación
                if (property.startsWith("trans_")) {
                  const locale = property.replace("trans_", "");
                  return (
                    <td key={property} className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={inlineFormData.translations?.[locale] || ""}
                        onChange={(e) => {
                          setInlineFormData({
                            ...inlineFormData,
                            translations: {
                              ...inlineFormData.translations,
                              [locale]: e.target.value,
                            },
                          });
                        }}
                        placeholder={getColumnLabel(property)}
                        className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-black min-w-[80px]"
                      />
                    </td>
                  );
                }

                // Si no hay campo correspondiente o es un campo calculado, mostramos un placeholder
                if (!field) {
                  return (
                    <td
                      key={property}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      -
                    </td>
                  );
                }

                return (
                  <td key={property} className="px-6 py-4 whitespace-nowrap">
                    {property === "sizingSystems" ? (
                      <>
                        <Select
                          isMulti
                          name="sizingSystems"
                          options={(relatedData.sizeSystem || []).map(
                            (system) => ({
                              value: system.id,
                              label: system.systemName,
                            })
                          )}
                          value={(inlineFormData.sizingSystems || [])
                            .map((id) => {
                              const sys = (relatedData.sizeSystem || []).find(
                                (s) => s.id === id
                              );
                              return sys
                                ? { value: sys.id, label: sys.systemName }
                                : null;
                            })
                            .filter(Boolean)}
                          onChange={(selected) => {
                            setInlineFormData({
                              ...inlineFormData,
                              sizingSystems: selected
                                ? selected.map((opt) => opt.value)
                                : [],
                              // Si el sistema default ya no está seleccionado, lo quitamos
                              originSystemId:
                                selected &&
                                inlineFormData.originSystemId &&
                                !selected.some(
                                  (opt) =>
                                    opt.value === inlineFormData.originSystemId
                                )
                                  ? ""
                                  : inlineFormData.originSystemId,
                            });
                          }}
                          classNamePrefix="react-select"
                          className="min-w-[180px]"
                          placeholder="Selecciona sistemas"
                        />
                        {/* Select para sistema default */}
                        {(inlineFormData.sizingSystems || []).length > 0 && (
                          <select
                            name="originSystemId"
                            value={inlineFormData.originSystemId || ""}
                            onChange={handleInlineChange}
                            className="mt-2 px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-black"
                          >
                            <option value="">
                              Seleccionar sistema default
                            </option>
                            {(inlineFormData.sizingSystems || [])
                              .map((id) =>
                                (relatedData.sizeSystem || []).find(
                                  (s) => s.id === id
                                )
                              )
                              .filter(Boolean)
                              .map((sys) => (
                                <option key={sys.id} value={sys.id}>
                                  {sys.systemName}
                                </option>
                              ))}
                          </select>
                        )}
                      </>
                    ) : field.type === "multiselect" ? (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-gray-400">
                          Seleccione valores a continuación
                        </span>
                      </div>
                    ) : property === "intCategories" ? (
                      <IntCategoryMultiSelect
                        value={inlineFormData.intCategories || []}
                        onChange={(selected) => {
                          setInlineFormData({
                            ...inlineFormData,
                            intCategories: selected,
                          });
                        }}
                        relatedData={relatedData}
                      />
                    ) : field.relation || property === "originSystem" ? (
                      <select
                        name={
                          property === "originSystem"
                            ? "originSystemId"
                            : property === "redirectCategory"
                            ? "redirectCategoryId"
                            : `${field.relation}Id`
                        }
                        value={
                          property === "originSystem"
                            ? inlineFormData.originSystemId || ""
                            : property === "redirectCategory"
                            ? inlineFormData.redirectCategoryId || ""
                            : inlineFormData[`${field.relation}Id`] || ""
                        }
                        onChange={handleInlineChange}
                        required={field.required}
                        disabled={
                          (resource.toLowerCase() === "size" &&
                            property === "sizeSystem") ||
                          (resource.toLowerCase() === "size" &&
                            property === "category" &&
                            !inlineFormData.supplierId)
                        }
                        className="
                        px-2 py-1
                        block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500
                        text-black
                        "
                      >
                        <option value="">Seleccionar</option>
                        {getSelectOptions(field).map((item) => (
                          <option key={item.id} value={item.id}>
                            {property === "originSystem"
                              ? item.systemName
                              : getOptionLabel(field.relation, item)}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        name={field.name}
                        value={inlineFormData[field.name] || ""}
                        onChange={handleInlineChange}
                        required={field.required}
                        rows={3}
                        placeholder={field.placeholder || ""}
                        className="
                        px-2 py-1
                        block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500
                        text-black
                        "
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        name={field.name}
                        value={inlineFormData[field.name] || ""}
                        onChange={handleInlineChange}
                        required={field.required}
                        className="
                        px-2 py-1
                        block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500
                        text-black
                        "
                      />
                    )}
                  </td>
                );
              })}
              {/* Columnas dinámicas para valores de tallas en el formulario de creación */}
              {resource.toLowerCase() === "size" &&
                dynamicSizeSystems.map((system) => (
                  <td
                    key={`dynamic-cell-new-${system.id}`}
                    className="px-2 py-4 whitespace-nowrap"
                  >
                    <input
                      type="text"
                      placeholder="Valor talla"
                      className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-black"
                      onChange={(e) => {
                        const newSizeValues = {
                          ...(inlineFormData.sizeValues || {}),
                          [system.id]: {
                            sizeSystemId: system.id,
                            value: e.target.value,
                          },
                        };
                        setInlineFormData({
                          ...inlineFormData,
                          sizeValues: newSizeValues,
                        });
                      }}
                      value={
                        inlineFormData.sizeValues?.[system.id]?.value || ""
                      }
                    />
                  </td>
                ))}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {resource.toLowerCase() === "category" ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();

                        // Crear un objeto limpio con solo los datos necesarios
                        const categoryData = {
                          name: inlineFormData.name || "",
                          genderId: inlineFormData.genderId
                            ? parseInt(inlineFormData.genderId)
                            : null,
                          supplierId: inlineFormData.supplierId
                            ? parseInt(inlineFormData.supplierId)
                            : null,
                          originSystemId: inlineFormData.originSystemId
                            ? parseInt(inlineFormData.originSystemId)
                            : null,
                          sizingSystems: Array.isArray(
                            inlineFormData.sizingSystems
                          )
                            ? inlineFormData.sizingSystems.map((id) =>
                                parseInt(id)
                              )
                            : [],
                        };

                        console.log(
                          "Enviando datos de categoría:",
                          categoryData
                        );

                        // Realizar fetch directamente para evitar problemas con JSON circular
                        fetch(`/api/crud/${resourceEndpoint}`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(categoryData),
                        })
                          .then((response) => {
                            if (!response.ok) {
                              return response.json().then((errorData) => {
                                throw new Error(
                                  errorData.error ||
                                    "Error al guardar los datos"
                                );
                              });
                            }
                            return response.json();
                          })
                          .then((result) => {
                            console.log("Categoría creada:", result);
                            onSave(result);
                            setShowInlineForm(false);
                            setInlineFormData({});
                          })
                          .catch((error) => {
                            console.error("Error al crear categoría:", error);
                            setError(error.message);
                            alert(`Error al guardar: ${error.message}`);
                          })
                          .finally(() => {
                            setSubmitting(false);
                          });

                        setSubmitting(true);
                      }}
                      disabled={submitting}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      {submitting ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="animate-spin h-4 w-4"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowInlineForm(false);
                        setInlineFormData({});
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleInlineSubmit}
                    disabled={submitting}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    {submitting ? (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin h-4 w-4"
                      />
                    ) : (
                      <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                    )}
                  </button>
                )}
                {resource.toLowerCase() !== "category" && (
                  <button
                    onClick={() => {
                      setShowInlineForm(false);
                      setInlineFormData({});
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          )}

          {/* Filas de datos existentes */}
          {filteredItems.map((item) => (
            <React.Fragment key={item.id}>
            <tr
              className={`hover:bg-gray-50 transition-colors ${
                editingItemId === item.id ? "bg-amber-50" : ""
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </td>
              {mainProperties.map((property) => {
                const field = findFieldForProperty(property);

                // Si estamos editando esta fila y hay un campo correspondiente
                if (editingItemId === item.id && field && property !== "id") {
                  if (property === "sizingSystems") {
                    // --- MultiSelect + Select para default en edición ---
                    return (
                      <td
                        key={`${item.id}-${property}`}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        <>
                          <Select
                            isMulti
                            name="sizingSystems"
                            options={(relatedData.sizeSystem || []).map(
                              (system) => ({
                                value: system.id,
                                label: system.systemName,
                              })
                            )}
                            value={(editFormData.sizingSystems || [])
                              .map((id) => {
                                const sys = (relatedData.sizeSystem || []).find(
                                  (s) => s.id === id
                                );
                                return sys
                                  ? { value: sys.id, label: sys.systemName }
                                  : null;
                              })
                              .filter(Boolean)}
                            onChange={(selected) => {
                              setEditFormData({
                                ...editFormData,
                                sizingSystems: selected
                                  ? selected.map((opt) => opt.value)
                                  : [],
                                // Si el sistema default ya no está seleccionado, lo quitamos
                                originSystemId:
                                  selected &&
                                  editFormData.originSystemId &&
                                  !selected.some(
                                    (opt) =>
                                      opt.value === editFormData.originSystemId
                                  )
                                    ? ""
                                    : editFormData.originSystemId,
                              });
                            }}
                            classNamePrefix="react-select"
                            className="min-w-[180px]"
                            placeholder="Selecciona sistemas"
                          />
                          {/* Select para sistema default */}
                          {(editFormData.sizingSystems || []).length > 0 && (
                            <select
                              name="originSystemId"
                              value={editFormData.originSystemId || ""}
                              onChange={handleEditChange}
                              className="mt-2 px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black"
                            >
                              <option value="">
                                Seleccionar sistema default
                              </option>
                              {(editFormData.sizingSystems || [])
                                .map((id) =>
                                  (relatedData.sizeSystem || []).find(
                                    (s) => s.id === id
                                  )
                                )
                                .filter(Boolean)
                                .map((sys) => (
                                  <option key={sys.id} value={sys.id}>
                                    {sys.systemName}
                                  </option>
                                ))}
                            </select>
                          )}
                        </>
                      </td>
                    );
                  }
                  if (property === "intCategories") {
                    return (
                      <td
                        key={`${item.id}-${property}`}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        <IntCategoryMultiSelect
                          value={editFormData.intCategories || []}
                          onChange={(selected) => {
                            setEditFormData({
                              ...editFormData,
                              intCategories: selected,
                            });
                          }}
                          relatedData={relatedData}
                        />
                      </td>
                    );
                  }

                  // Para campos simples como name, systemName, etc.
                  if (property !== "id" && field && !field.relation) {
                    return (
                      <td
                        key={`${item.id}-${property}`}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        {field.type === "textarea" ? (
                          <textarea
                            name={field.name}
                            value={editFormData[field.name] || ""}
                            onChange={handleEditChange}
                            required={field.required}
                            rows={2}
                            className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black"
                          />
                        ) : (
                          <input
                            type={field.type || "text"}
                            name={field.name}
                            value={editFormData[field.name] || ""}
                            onChange={handleEditChange}
                            required={field.required}
                            className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black"
                          />
                        )}
                      </td>
                    );
                  }

                  // Para campos de relación (gender, supplier, etc.)
                  if (field && field.relation) {
                    // Determinar el nombre del campo correcto
                    const fieldName = property === "redirectCategory"
                      ? "redirectCategoryId"
                      : `${field.relation}Id`;
                    
                    return (
                      <td
                        key={`${item.id}-${property}`}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        <select
                          name={fieldName}
                          value={editFormData[fieldName] || ""}
                          onChange={handleEditChange}
                          required={field.required}
                          className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black"
                        >
                          <option value="">Seleccionar</option>
                          {getSelectOptions(field).map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {getOptionLabel(field.relation, opt)}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={`${item.id}-${property}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                    >
                      <span className="inline-flex items-center">
                        {formatValue(property, item[property], item)}
                      </span>
                    </td>
                  );
                }

                // Para filas normales (no en edición)
                if (property === "originSystem") {
                  // Mostrar el nombre del sistema de origen correctamente
                  let originSystemName = "N/A";
                  if (item.originSystem && item.originSystem.systemName) {
                    originSystemName = item.originSystem.systemName;
                  } else if (item.sizingSystems && item.originSystemId) {
                    const found = item.sizingSystems.find(
                      (sys) => sys.id === item.originSystemId
                    );
                    if (found) originSystemName = found.systemName;
                  }
                  return (
                    <td
                      key={`${item.id}-${property}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                    >
                      {originSystemName}
                    </td>
                  );
                }

                if (property === "sizingSystems") {
                  return (
                    <td
                      key={`${item.id}-${property}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                    >
                      <div className="flex flex-wrap gap-1">
                        {item.sizingSystems?.map((system) => {
                          const isDefault = item.originSystemId === system.id;
                          return (
                            <span
                              key={system.id}
                              className={`inline-flex items-center px-2 py-1 rounded-md text-sm border 
                                ${
                                  isDefault
                                    ? "bg-green-100 text-green-800 border-green-300 font-semibold"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                            >
                              {system.systemName}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  );
                }

                // Columnas de traducción para SizeSystem
                if (property.startsWith("trans_")) {
                  const locale = property.replace("trans_", "");
                  const translationValue = getTranslationValue(item, locale);
                  
                  // En modo edición, mostrar input
                  if (editingItemId === item.id) {
                    return (
                      <td
                        key={`${item.id}-${property}`}
                        className="px-3 py-4 whitespace-nowrap"
                      >
                        <input
                          type="text"
                          value={editFormData.translations?.[locale] || ""}
                          onChange={(e) => {
                            setEditFormData({
                              ...editFormData,
                              translations: {
                                ...editFormData.translations,
                                [locale]: e.target.value,
                              },
                            });
                          }}
                          placeholder={getColumnLabel(property)}
                          className="px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black min-w-[80px]"
                        />
                      </td>
                    );
                  }
                  
                  // En modo normal, mostrar valor
                  return (
                    <td
                      key={`${item.id}-${property}`}
                      className="px-3 py-4 whitespace-nowrap text-sm text-gray-600"
                    >
                      {translationValue}
                    </td>
                  );
                }

                return (
                  <td
                    key={`${item.id}-${property}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                  >
                    <span className="inline-flex items-center">
                      {formatValue(property, item[property], item)}
                    </span>
                  </td>
                );
              })}
              {/* Celdas dinámicas de sistemas de tallaje */}
              {resource.toLowerCase() === "size" && editingItemId === item.id
                ? dynamicSizeSystems.map((system) => {
                    // Verificar si el sistema es relevante para esta categoría
                    const isRelevant =
                      item.category &&
                      item.category.sizingSystems &&
                      item.category.sizingSystems.some(
                        (s) => s.id === system.id
                      );

                    return (
                      <td
                        key={`dynamic-cell-${item.id}-${system.id}`}
                        className={`px-2 py-4 whitespace-nowrap text-sm ${
                          isRelevant ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        <input
                          type="text"
                          value={
                            editFormData.sizeValues?.[system.id]?.value || ""
                          }
                          onChange={(e) => {
                            const newSizeValues = {
                              ...editFormData.sizeValues,
                              [system.id]: {
                                sizeSystemId: system.id,
                                value: e.target.value,
                              },
                            };
                            setEditFormData({
                              ...editFormData,
                              sizeValues: newSizeValues,
                            });
                          }}
                          className={`px-2 py-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-black ${
                            !isRelevant ? " text-gray-400" : ""
                          }`}
                          placeholder={
                            isRelevant ? "Valor de talla" : "No aplicable"
                          }
                        />
                      </td>
                    );
                  })
                : dynamicSizeSystems.map((system) => {
                    // Verificar si el sistema es relevante para esta categoría
                    const isRelevant =
                      item.category &&
                      item.category.sizingSystems &&
                      item.category.sizingSystems.some(
                        (s) => s.id === system.id
                      );

                    const value = item.sizeValues
                      ? item.sizeValues.find(
                          (sv) => sv.sizeSystemId === system.id
                        )?.value || "-"
                      : "-";

                    return (
                      <td
                        key={`dynamic-cell-${item.id}-${system.id}`}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-center
                          ${
                            isRelevant
                              ? "text-blue-700"
                              : "bg-gray-50 text-gray-400"
                          }`}
                      >
                        {!isRelevant ? (
                          <span className="opacity-50 select-none">
                            {value}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                {editingItemId === item.id ? (
                  <>
                    <button
                      onClick={handleEditSubmit}
                      disabled={submitting}
                      className="text-amber-500 hover:text-amber-700 mr-3"
                    >
                      {submitting ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="animate-spin h-4 w-4"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`mr-3 ${
                        resource.toLowerCase() === "category" && hasSizeGrid(item)
                          ? "text-green-600 hover:text-green-800"
                          : "text-indigo-600 hover:text-indigo-900"
                      }`}
                      onClick={() => {
                        if (resource.toLowerCase() === "category") {
                          openSizeGridModal(item);
                        } else {
                          alert(`Ver detalles del elemento ${item.id}`);
                        }
                      }}
                      title={
                        resource.toLowerCase() === "category"
                          ? "Ver grilla de equivalencias de tallas"
                          : "Ver detalles"
                      }
                    >
                      <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                    </button>
                    {/* Botón de imágenes solo para categorías */}
                    {resource.toLowerCase() === "category" && (
                      <button
                        className="text-green-600 hover:text-green-800 mr-3"
                        onClick={() => openImageModal(item)}
                        title="Gestionar imágenes"
                      >
                        <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                        {item.images && item.images.length > 0 && (
                          <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                            {item.images.length}
                          </span>
                        )}
                      </button>
                    )}
                    {/* Botón de duplicar solo para categorías */}
                    {resource.toLowerCase() === "category" && (
                      <button
                        className="text-cyan-600 hover:text-cyan-800 mr-3"
                        onClick={() => handleDuplicate(item)}
                        disabled={submitting}
                        title="Duplicar categoría"
                      >
                        {submitting ? (
                          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faCopy} className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      className="text-amber-500 hover:text-amber-700 mr-3"
                      onClick={() => startEditing(item)}
                    >
                      <FontAwesomeIcon icon={faPencilAlt} className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleSingleDelete(item.id)}
                    >
                      <span className="inline-flex items-center">
                        <FontAwesomeIcon
                          icon={faTrash}
                          className="h-4 w-4 mr-1"
                        />
                      </span>
                    </button>
                  </>
                )}
              </td>
            </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Modal de grilla de tallas para categorías */}
      {sizeGridModalOpen && sizeGridCategory && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeSizeGridModal}
          ></div>

          {/* Modal centrado */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative z-[101] w-full max-w-5xl bg-white rounded-lg shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Grilla de Equivalencias: {sizeGridCategory.name}
                  </h3>
                  <button
                    onClick={closeSizeGridModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {sizeGridCategory.supplier?.name} - {sizeGridCategory.gender?.name}
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-auto">
                {(!sizeGridCategory.sizes || sizeGridCategory.sizes.length === 0) ? (
                  <div className="text-center py-12">
                    <FontAwesomeIcon
                      icon={faInbox}
                      className="mx-auto h-12 w-12 text-gray-400"
                    />
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      No hay tallas creadas para esta categoría
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Primero debes crear las tallas en la sección "Size"
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Talla Original
                          </th>
                          {sizeGridCategory.sizingSystems?.map((system) => (
                            <th
                              key={system.id}
                              className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                system.id === sizeGridCategory.originSystemId
                                  ? "bg-green-100 text-green-800"
                                  : "text-gray-500"
                              }`}
                            >
                              {system.systemName}
                              {system.id === sizeGridCategory.originSystemId && (
                                <span className="ml-1 text-xs">(origen)</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sizeGridCategory.sizes
                          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                          .map((size) => {
                            const hasValues = size.sizeValues && size.sizeValues.length > 0;
                            return (
                              <tr 
                                key={size.id}
                                className={hasValues ? "" : "bg-red-50"}
                              >
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                  {size.originalSize}
                                  {!hasValues && (
                                    <span className="ml-2 text-xs text-red-500">(sin equivalencias)</span>
                                  )}
                                </td>
                                {sizeGridCategory.sizingSystems?.map((system) => {
                                  const sizeValue = size.sizeValues?.find(
                                    (sv) => sv.sizeSystemId === system.id || sv.sizeSystem?.id === system.id
                                  );
                                  return (
                                    <td
                                      key={`${size.id}-${system.id}`}
                                      className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                                        system.id === sizeGridCategory.originSystemId
                                          ? "bg-green-50 font-medium text-green-800"
                                          : sizeValue?.value
                                          ? "text-gray-700"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {sizeValue?.value || "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Resumen */}
                {sizeGridCategory.sizes && sizeGridCategory.sizes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Total tallas: <strong>{sizeGridCategory.sizes.length}</strong>
                      </span>
                      <span>
                        Con equivalencias:{" "}
                        <strong className="text-green-600">
                          {sizeGridCategory.sizes.filter(
                            (s) => s.sizeValues && s.sizeValues.length > 0
                          ).length}
                        </strong>
                      </span>
                      <span>
                        Sin equivalencias:{" "}
                        <strong className="text-red-600">
                          {sizeGridCategory.sizes.filter(
                            (s) => !s.sizeValues || s.sizeValues.length === 0
                          ).length}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer con imágenes */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                {/* Imágenes de la guía */}
                {sizeGridCategory.images && sizeGridCategory.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Imágenes de la guía ({sizeGridCategory.images.length})
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {sizeGridCategory.images
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((image) => (
                          <a
                            key={image.id}
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 h-24 border rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
                          >
                            <img
                              src={image.url}
                              alt={image.alt || image.originalName || "Imagen guía"}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    onClick={closeSizeGridModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imágenes para categorías */}
      {imageModalOpen && imageModalCategory && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeImageModal}
          ></div>

          {/* Modal centrado */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative z-[101] w-full max-w-3xl bg-white rounded-lg shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Imágenes de: {imageModalCategory.name}
                  </h3>
                  <button
                    onClick={closeImageModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {imageModalCategory.supplier?.name} - {imageModalCategory.gender?.name}
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <ImageUploader
                  categoryId={imageModalCategory.id}
                  images={categoryImages}
                  onImagesChange={(newImages) => {
                    setCategoryImages(newImages);
                    // Actualizar también en el item de la tabla
                    if (onSave) {
                      onSave({ ...imageModalCategory, images: newImages });
                    }
                  }}
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={closeImageModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de paginación */}
      {pagination && pagination.totalPages > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            {/* Controles para móvil */}
            <button
              onClick={goToPrevPage}
              disabled={!pagination.hasPrevPage}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                pagination.hasPrevPage
                  ? "text-gray-700 bg-white hover:bg-gray-50"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              }`}
            >
              Anterior
            </button>
            <button
              onClick={goToNextPage}
              disabled={!pagination.hasNextPage}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                pagination.hasNextPage
                  ? "text-gray-700 bg-white hover:bg-gray-50"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              }`}
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando{" "}
                <span className="font-medium">
                  {pagination.totalItems === 0
                    ? 0
                    : (pagination.page - 1) * pagination.pageSize + 1}
                </span>{" "}
                a{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.totalItems
                  )}
                </span>{" "}
                de <span className="font-medium">{pagination.totalItems}</span>{" "}
                resultados
              </p>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <label
                  htmlFor="pageSize"
                  className="text-sm text-gray-600 mr-2"
                >
                  Filas por página:
                </label>
                <select
                  id="pageSize"
                  name="pageSize"
                  value={pagination.pageSize}
                  onChange={handlePageSizeChange}
                  className="border border-gray-300 rounded-md text-sm p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {[5, 10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Paginación"
              >
                <button
                  onClick={goToFirstPage}
                  disabled={!pagination.hasPrevPage}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    pagination.hasPrevPage
                      ? "text-gray-500 bg-white hover:bg-gray-50"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <span className="sr-only">Primera página</span>
                  <FontAwesomeIcon icon={faStepBackward} className="h-4 w-4" />
                </button>
                <button
                  onClick={goToPrevPage}
                  disabled={!pagination.hasPrevPage}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                    pagination.hasPrevPage
                      ? "text-gray-500 bg-white hover:bg-gray-50"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <span className="sr-only">Anterior</span>
                  <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                </button>

                {/* Números de página */}
                {getPageNumbers().map((pageNum, index) =>
                  pageNum === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => goToPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                        pagination.page === pageNum
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={goToNextPage}
                  disabled={!pagination.hasNextPage}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                    pagination.hasNextPage
                      ? "text-gray-500 bg-white hover:bg-gray-50"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <span className="sr-only">Siguiente</span>
                  <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={!pagination.hasNextPage}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                    pagination.hasNextPage
                      ? "text-gray-500 bg-white hover:bg-gray-50"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <span className="sr-only">Última página</span>
                  <FontAwesomeIcon icon={faStepForward} className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
