// Idiomas soportados para traducciones
export const SUPPORTED_LOCALES = [
    { code: 'es', label: 'Español' },
    { code: 'ca', label: 'Català' },
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
];

const resourceFields = {
    sizesystem: [
        {
            name: 'systemName',
            type: 'text',
            label: 'Nombre del Sistema',
            required: true,
        },
        {
            name: 'translations',
            type: 'translations',
            label: 'Traducciones',
            required: false,
        },
    ],
    supplier: [
        {
            name: 'name',
            type: 'text',
            label: 'Nombre del Proveedor',
            required: true,
        },
    ],
    gender: [
        {
            name: 'name',
            type: 'text',
            label: 'Nombre del Género',
            required: true,
        },
    ],
    category: [
        {
            name: 'name',
            type: 'text',
            label: 'Nombre de la Categoría',
            required: true,
        },
        {
            name: 'genderId',
            type: 'select',
            label: 'Género',
            relation: 'gender',
            required: true,
        },
        {
            name: 'supplierId',
            type: 'select',
            label: 'Proveedor',
            relation: 'supplier',
            required: true,
        },
        {
            name: 'originSystemId',
            type: 'select',
            label: 'Sistema de Tallas Origen',
            relation: 'sizeSystem',
            required: false,
        },
        {
            name: 'sizingSystems',
            type: 'multiselect',
            label: 'Sistemas de Talla',
            relation: 'sizeSystem',
            required: true,
        },
        {
            name: 'intCategories',
            type: 'multiselect',
            label: 'Categorías Internas',
            relation: 'int_Category',
            required: false,
        },
    ],
    size: [
        {
            name: 'originalSize',
            type: 'text',
            label: 'Talla Original',
            required: true,
        },
        {
            name: 'euConvertedSize',
            type: 'text',
            label: 'Talla Convertida (EU)',
            required: true,
        },
        {
            name: 'supplierId',
            type: 'select',
            label: 'Proveedor',
            relation: 'supplier',
            required: true,
        },
        {
            name: 'categoryId',
            type: 'select',
            label: 'Categoría',
            relation: 'category',
            required: true,
        },
        {
            name: 'sizeSystemId',
            type: 'select',
            label: 'Sistema de Tallas',
            relation: 'sizeSystem',
            required: true,
        },
    ],
    intcategory: [
        {
            name: 'referenceId',
            type: 'text',
            label: 'ID de Referencia',
            required: true,
        },
        {
            name: 'name',
            type: 'text',
            label: 'Nombre',
            required: true,
        },
        {
            name: 'categories',
            type: 'multiselect',
            label: 'Categorías Vinculadas',
            relation: 'category',
            required: false,
        },
    ],
    productsizeexception: [
        {
            name: 'modelCodes',
            type: 'textarea',
            label: 'Códigos de Modelo/SKU (uno por línea o separados por coma)',
            required: true,
            placeholder: 'SKU001, SKU002\nSKU003',
        },
        {
            name: 'redirectCategoryId',
            type: 'select',
            label: 'Redirigir a Categoría (Guía de Tallas)',
            relation: 'category',
            required: true,
        },
        {
            name: 'notes',
            type: 'textarea',
            label: 'Notas',
            required: false,
        },
    ],
};

export default resourceFields;
