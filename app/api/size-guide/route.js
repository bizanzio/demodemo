import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateAndStoreSizeChart, getSizeChartUrl } from '@/lib/size-guide-chart';

/**
 * GET /api/size-guide
 *
 * Genera una guía de tallas basada en los filtros proporcionados.
 *
 * Query params:
 * - referenceId: (string) El referenceId del IntCategory (requerido)
 * - supplier: (string|number) Nombre o ID del proveedor/marca (opcional)
 * - gender: (string|number) Nombre o ID del género (opcional)
 * - modelCode: (string) Código del modelo/SKU para verificar excepciones (opcional)
 * - locale: (string) Código de idioma para traducciones: es, ca, en, it, fr, de (opcional)
 *
 * Ejemplo: /api/size-guide?referenceId=TOPS&supplier=Nike&gender=Hombre
 * Ejemplo: /api/size-guide?referenceId=TOPS&supplier=1&gender=2
 * Ejemplo: /api/size-guide?referenceId=TOPS&supplier=Nike&modelCode=ABC123
 * Ejemplo: /api/size-guide?referenceId=TOPS&supplier=Nike&locale=es
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        let referenceId = searchParams.get('referenceId');
        const supplierParam = searchParams.get('supplier');
        const genderParam = searchParams.get('gender');
        const modelCode = searchParams.get('modelCode');
        const localeParam = searchParams.get('locale'); // Idioma para traducciones: es, ca, en, it, fr, de
        const locale = normalizeLocale(localeParam);

        // Validar que al menos referenceId esté presente
        if (!referenceId) {
            return NextResponse.json(
                { error: "El parámetro 'referenceId' es requerido" },
                { status: 400 }
            );
        }

        // 0. Verificar si hay una excepción para este modelCode
        let exception = null;
        let redirectCategory = null;
        if (modelCode) {
            // Buscar en todas las excepciones donde el modelCode esté en la lista
            const exceptions = await prisma.productSizeException.findMany({
                include: {
                    redirectCategory: {
                        include: {
                            supplier: true,
                            gender: true,
                            sizingSystems: true,
                            originSystem: true,
                            images: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });

            // Buscar si el modelCode está en alguna de las excepciones
            for (const exc of exceptions) {
                // Parsear los códigos (separados por coma, punto y coma, o salto de línea)
                const codes = exc.modelCodes
                    .split(/[,;\n\r]+/)
                    .map((code) => code.trim().toUpperCase())
                    .filter((code) => code.length > 0);

                if (codes.includes(modelCode.trim().toUpperCase())) {
                    exception = exc;
                    redirectCategory = exc.redirectCategory;
                    break;
                }
            }
        }

        // 1. Buscar IntCategory por referenceId (búsqueda case-insensitive)
        let intCategory = await prisma.int_Category.findUnique({
            where: { referenceId },
            include: {
                categories: {
                    include: {
                        supplier: true,
                        gender: true,
                    },
                },
            },
        });

        // Si no se encuentra, intentar búsqueda case-insensitive
        if (!intCategory) {
            const allIntCategories = await prisma.int_Category.findMany({
                include: {
                    categories: {
                        include: {
                            supplier: true,
                            gender: true,
                        },
                    },
                },
            });
            intCategory = allIntCategories.find(
                (ic) => ic.referenceId.toLowerCase() === referenceId.toLowerCase()
            );
        }

        if (!intCategory) {
            return NextResponse.json(
                { error: `No se encontró IntCategory con referenceId: ${referenceId}` },
                { status: 404 }
            );
        }

        // 2. Resolver supplier (puede ser ID o nombre, búsqueda case-insensitive)
        let supplier = null;
        if (supplierParam) {
            const supplierId = parseInt(supplierParam);
            if (!isNaN(supplierId)) {
                supplier = await prisma.supplier.findUnique({
                    where: { id: supplierId },
                });
            } else {
                // Búsqueda case-insensitive por nombre
                const allSuppliers = await prisma.supplier.findMany();
                supplier = allSuppliers.find(
                    (s) => s.name.toLowerCase() === supplierParam.toLowerCase()
                );
            }

            if (!supplier) {
                // Listar proveedores disponibles para ayudar al usuario
                const availableSuppliers = await prisma.supplier.findMany({
                    select: { name: true },
                    orderBy: { name: 'asc' },
                });
                return NextResponse.json(
                    { 
                        error: `No se encontró el proveedor: ${supplierParam}`,
                        availableSuppliers: availableSuppliers.map(s => s.name),
                    },
                    { status: 404 }
                );
            }
        }

        // 3. Resolver gender (puede ser ID o nombre, búsqueda case-insensitive con mapeo de traducciones)
        // Mapeo de traducciones comunes de género → nombre en español (base de datos)
        const genderTranslations = {
            // Mujer
            'women': 'mujer',
            'woman': 'mujer',
            'female': 'mujer',
            'femme': 'mujer',
            'donna': 'mujer',
            'dona': 'mujer',
            'frau': 'mujer',
            'damen': 'mujer',
            'frauen': 'mujer',
            'weiblich': 'mujer',
            // Hombre
            'men': 'hombre',
            'man': 'hombre',
            'mann': 'hombre',
            'male': 'hombre',
            'homme': 'hombre',
            'uomo': 'hombre',
            'uom': 'hombre',
            'herren': 'hombre',
            'männer': 'hombre',
            'maenner': 'hombre',
            'mannlich': 'hombre',
            'männlich': 'hombre',
            'home': 'hombre',
            'masculi': 'hombre',
            // Unisex
            'unisex': 'unisex',
            // Niño/Niña
            'kids': 'niños',
            'children': 'niños',
            'enfants': 'niños',
            'bambini': 'niños',
            'kinder': 'niños',
            'boy': 'niño',
            'boys': 'niño',
            'girl': 'niña',
            'girls': 'niña',
        };

        let gender = null;
        if (genderParam) {
            const genderId = parseInt(genderParam);
            if (!isNaN(genderId)) {
                gender = await prisma.gender.findUnique({
                    where: { id: genderId },
                });
            } else {
                // Búsqueda case-insensitive por nombre
                const allGenders = await prisma.gender.findMany();
                const searchTerm = normalizeText(genderParam);
                const searchCandidates = buildGenderCandidates(searchTerm);
                
                // Primero intentar búsqueda directa
                gender = allGenders.find((g) =>
                    searchCandidates.includes(normalizeText(g.name))
                );
                
                // Si no se encuentra, intentar con el mapeo de traducciones
                if (!gender) {
                    const mappedCandidates = searchCandidates
                        .map((candidate) => genderTranslations[candidate])
                        .filter(Boolean)
                        .map((candidate) => normalizeText(candidate));

                    if (mappedCandidates.length > 0) {
                        gender = allGenders.find((g) =>
                            mappedCandidates.includes(normalizeText(g.name))
                        );
                    }
                }
            }

            if (!gender) {
                // Listar géneros disponibles para ayudar al usuario
                const availableGenders = await prisma.gender.findMany({
                    select: { name: true },
                    orderBy: { name: 'asc' },
                });
                return NextResponse.json(
                    { 
                        error: `No se encontró el género: ${genderParam}`,
                        normalizedInput: normalizeText(genderParam),
                        normalizedCandidates: buildGenderCandidates(normalizeText(genderParam)),
                        availableGenders: availableGenders.map(g => g.name),
                        hint: 'Puedes usar también traducciones comunes: Home, Dona, Men, Women, Herren, Damen, etc.',
                    },
                    { status: 404 }
                );
            }
        }

        // 4. Obtener los IDs de categorías a usar
        let linkedCategoryIds;

        // Si hay excepción, usar solo la categoría de redirección
        if (redirectCategory) {
            linkedCategoryIds = [redirectCategory.id];
        } else {
            // Sin excepción, filtrar las categorías vinculadas al IntCategory por supplier y gender
            let filteredCategories = intCategory.categories;

            // Filtrar por supplier si está especificado
            if (supplier) {
                filteredCategories = filteredCategories.filter(
                    (c) => c.supplierId === supplier.id
                );
            }

            // Filtrar por gender si está especificado
            if (gender) {
                filteredCategories = filteredCategories.filter(
                    (c) => c.genderId === gender.id
                );
            }

            linkedCategoryIds = filteredCategories.map((c) => c.id);

            if (linkedCategoryIds.length === 0) {
                // Intentar dar un mensaje más descriptivo
                const allCategoryIds = intCategory.categories.map((c) => c.id);
                if (allCategoryIds.length === 0) {
                    return NextResponse.json(
                        { error: `El IntCategory "${referenceId}" no tiene categorías vinculadas` },
                        { status: 404 }
                    );
                } else {
                    // Hay categorías pero no coinciden con el filtro
                    return NextResponse.json({
                        title: intCategory.name,
                        referenceId: intCategory.referenceId,
                        supplier: supplier?.name || 'Todos los proveedores',
                        supplierId: supplier?.id || null,
                        gender: gender?.name || 'Todos los géneros',
                        genderId: gender?.id || null,
                        exception: null,
                        defaultSystem: null,
                        columns: [],
                        rows: [],
                        sizeSystems: [],
                        images: [],
                        imagesByCategory: [],
                        totalSizes: 0,
                        totalSystems: 0,
                        totalImages: 0,
                        message: `No se encontró una categoría para ${supplier?.name || 'el proveedor'} + ${gender?.name || 'el género'} en "${referenceId}". Categorías disponibles: ${intCategory.categories.map(c => `${c.supplier?.name || '?'}/${c.gender?.name || '?'}`).join(', ')}`,
                        filters: {
                            referenceId,
                            supplier: supplier?.name || null,
                            gender: gender?.name || null,
                            modelCode: modelCode || null,
                            locale: locale || null,
                        },
                        generatedAt: new Date().toISOString(),
                    });
                }
            }
        }

        // 5. Construir filtro para sizes (ya filtrado por categoría)
        const sizeFilter = {
            categoryId: { in: linkedCategoryIds },
        };

        // 6. Obtener las tallas con sus valores
        const sizes = await prisma.size.findMany({
            where: sizeFilter,
            include: {
                supplier: true,
                category: {
                    include: {
                        gender: true,
                        supplier: true,
                        sizingSystems: true,
                        originSystem: true, // Sistema por defecto de la categoría
                        images: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                sizeSystem: true,
                sizeValues: {
                    include: {
                        sizeSystem: true,
                    },
                },
            },
            orderBy: [{ displayOrder: 'asc' }, { originalSize: 'asc' }],
        });

        // Obtener el sistema por defecto (de la primera categoría que tenga uno definido)
        let defaultSystem = null;
        for (const size of sizes) {
            if (size.category?.originSystem) {
                defaultSystem = size.category.originSystem;
                break;
            }
        }

        // Si no hay tallas, devolver respuesta vacía en lugar de error
        if (sizes.length === 0) {
            return NextResponse.json({
                title: intCategory.name,
                referenceId: intCategory.referenceId,
                supplier: supplier?.name || 'Todos los proveedores',
                supplierId: supplier?.id || null,
                gender: gender?.name || 'Todos los géneros',
                genderId: gender?.id || null,
                exception: exception
                    ? {
                          matchedModelCode: modelCode,
                          allModelCodes: exception.modelCodes,
                          redirectedToCategory: {
                              id: exception.redirectCategory.id,
                              name: exception.redirectCategory.name,
                              supplier: exception.redirectCategory.supplier?.name,
                              gender: exception.redirectCategory.gender?.name,
                          },
                          notes: exception.notes,
                      }
                    : null,
                defaultSystem: null,
                columns: [],
                rows: [],
                sizeSystems: [],
                images: [],
                imagesByCategory: [],
                totalSizes: 0,
                totalSystems: 0,
                totalImages: 0,
                message: 'No se encontraron tallas con los filtros especificados',
                filters: {
                    referenceId,
                    supplier: supplier?.name || null,
                    gender: gender?.name || null,
                    modelCode: modelCode || null,
                    locale: locale || null,
                },
                generatedAt: new Date().toISOString(),
            });
        }

        // 7. Obtener todos los sistemas de tallas únicos de las tallas encontradas
        const uniqueSystemIds = [
            ...new Set(sizes.flatMap((s) => s.sizeValues?.map((sv) => sv.sizeSystemId) || [])),
        ];

        const sizeSystems = await prisma.sizeSystem.findMany({
            where: { id: { in: uniqueSystemIds } },
            orderBy: [{ displayOrder: 'asc' }, { systemName: 'asc' }],
            include: {
                translations: true,
            },
        });

        // 8. Recopilar todas las imágenes únicas de las categorías
        const categoryImagesMap = new Map();
        sizes.forEach((size) => {
            if (size.category?.images && size.category.images.length > 0) {
                if (!categoryImagesMap.has(size.categoryId)) {
                    categoryImagesMap.set(size.categoryId, {
                        categoryId: size.categoryId,
                        categoryName: size.category.name,
                        images: size.category.images.map((img) => ({
                            id: img.id,
                            url: img.url,
                            alt: img.alt || size.category.name,
                            order: img.order,
                        })),
                    });
                }
            }
        });

        // 9. Organizar los datos en formato de guía de tallas
        const sizeGuide = organizeSizeGuide(sizes, sizeSystems, {
            intCategory,
            supplier,
            gender,
            defaultSystem,
            images: Array.from(categoryImagesMap.values()),
            exception,
            modelCode,
            locale,
        });

        // 10. Generar o reutilizar la imagen de la guía de tallas.
        // El hash incluye el orden de las columnas, así que un drag & drop en SizeSystem
        // actualiza la imagen aunque ya existiera una URL previa.
        try {
            const generated = await generateAndStoreSizeChart(
                sizeGuide,
                {
                    referenceId: intCategory.referenceId,
                    supplierId: supplier?.id || null,
                    genderId: gender?.id || null,
                    locale: locale || null,
                },
                { force: false }
            );
            sizeGuide.chartImageUrl = generated?.url || null;
        } catch (err) {
            console.warn('Error generando chartImageUrl:', err.message);
            try {
                sizeGuide.chartImageUrl = await getSizeChartUrl(
                    intCategory.referenceId,
                    supplier?.id || null,
                    gender?.id || null,
                    locale || null
                );
            } catch {
                sizeGuide.chartImageUrl = null;
            }
        }

        return NextResponse.json(sizeGuide);
    } catch (error) {
        console.error('Error en GET /api/size-guide:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizeLocale(value) {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase().split('-')[0];
    const supported = new Set(['es', 'ca', 'en', 'it', 'fr', 'de']);
    return supported.has(normalized) ? normalized : null;
}

function buildGenderCandidates(normalized) {
    const value = normalizeText(normalized);
    const candidates = new Set();
    if (!value) return [];
    candidates.add(value);

    // Soportar keys de i18n como "product.gender.mann"
    if (value.includes('.')) {
        const lastByDot = value.split('.').pop();
        if (lastByDot) candidates.add(lastByDot);
    }

    // Soportar formatos con guion bajo "product_gender_mann"
    if (value.includes('_')) {
        const lastByUnderscore = value.split('_').pop();
        if (lastByUnderscore) candidates.add(lastByUnderscore);
    }

    return Array.from(candidates);
}

/**
 * Obtiene el nombre traducido de un sistema de tallas
 */
function getTranslatedSystemName(system, locale) {
    if (!locale || !system.translations || system.translations.length === 0) {
        return system.systemName;
    }
    const translation = system.translations.find((t) => t.locale === locale);
    return translation?.name || system.systemName;
}

/**
 * Organiza los datos de tallas en formato de guía
 */
function organizeSizeGuide(
    sizes,
    systems,
    {
        intCategory,
        supplier,
        gender,
        defaultSystem,
        images = [],
        exception = null,
        modelCode = null,
        locale = null,
    }
) {
    // Ordenar tallas por displayOrder o originalSize
    const sortedSizes = [...sizes].sort((a, b) => {
        if (a.displayOrder !== null && b.displayOrder !== null) {
            return a.displayOrder - b.displayOrder;
        }
        return (a.originalSize || '').localeCompare(b.originalSize || '', 'es', {
            numeric: true,
        });
    });

    // Crear filas: cada sistema de tallas es una fila
    // Ordenar por displayOrder (configurable en admin), luego default primero, luego nombre
    const sortedSystems = [...systems].sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        if (defaultSystem) {
            if (a.id === defaultSystem.id) return -1;
            if (b.id === defaultSystem.id) return 1;
        }
        return a.systemName.localeCompare(b.systemName);
    });

    const rows = sortedSystems.map((system) => ({
        systemId: system.id,
        systemName: getTranslatedSystemName(system, locale),
        isDefault: defaultSystem ? system.id === defaultSystem.id : system.isDefault,
        displayOrder: system.displayOrder ?? 0,
        values: sortedSizes.map((size) => {
            const sizeValue = size.sizeValues?.find((sv) => sv.sizeSystemId === system.id);
            return {
                sizeId: size.id,
                originalSize: size.originalSize,
                value: sizeValue?.value || null,
            };
        }),
    }));

    // Crear columnas con información de cada talla
    const columns = sortedSizes.map((size) => ({
        sizeId: size.id,
        originalSize: size.originalSize,
        displayOrder: size.displayOrder,
        categoryId: size.categoryId,
        categoryName: size.category?.name || null,
    }));

    return {
        // Metadata de la guía
        title: intCategory.name,
        referenceId: intCategory.referenceId,
        supplier: supplier?.name || 'Todos los proveedores',
        supplierId: supplier?.id || null,
        gender: gender?.name || 'Todos los géneros',
        genderId: gender?.id || null,

        // Información de excepción (si aplica)
        exception: exception
            ? {
                  matchedModelCode: modelCode,
                  allModelCodes: exception.modelCodes,
                  redirectedToCategory: {
                      id: exception.redirectCategory.id,
                      name: exception.redirectCategory.name,
                      supplier: exception.redirectCategory.supplier?.name,
                      gender: exception.redirectCategory.gender?.name,
                  },
                  notes: exception.notes,
              }
            : null,

        // Sistema de tallas por defecto
        defaultSystem: defaultSystem
            ? {
                  id: defaultSystem.id,
                  systemName: getTranslatedSystemName(
                      sortedSystems.find((s) => s.id === defaultSystem.id) || defaultSystem,
                      locale
                  ),
              }
            : null,

        // Datos de la tabla
        columns,
        rows,

        // Sistemas de tallas incluidos (ordenados, con el default primero)
        sizeSystems: sortedSystems.map((s) => ({
            id: s.id,
            systemName: getTranslatedSystemName(s, locale),
            isDefault: defaultSystem ? s.id === defaultSystem.id : s.isDefault,
        })),

        // Idioma usado para traducciones (null si no se especificó)
        locale: locale || null,

        // Imágenes de la guía (de las categorías)
        images: images.flatMap((cat) => cat.images),

        // Imágenes agrupadas por categoría (si hay múltiples categorías)
        imagesByCategory: images,

        // Información adicional
        totalSizes: sortedSizes.length,
        totalSystems: systems.length,
        totalImages: images.reduce((acc, cat) => acc + cat.images.length, 0),
        generatedAt: new Date().toISOString(),
    };
}
