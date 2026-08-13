const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    // Paso 1: Insertar sistemas de tallas
    const sizeSystems = await Promise.all([
      prisma.sizeSystem.upsert({
        where: { systemName: "UK" },
        update: { isDefault: true },
        create: { systemName: "UK", isDefault: true },
      }),
      prisma.sizeSystem.upsert({
        where: { systemName: "US" },
        update: {},
        create: { systemName: "US" },
      }),
      prisma.sizeSystem.upsert({
        where: { systemName: "EU" },
        update: {},
        create: { systemName: "EU" },
      }),
      prisma.sizeSystem.upsert({
        where: { systemName: "CM" },
        update: {},
        create: { systemName: "CM" },
      }),
    ]);

    console.log("Sistemas de tallas creados:", sizeSystems);

    // Paso 2: Insertar proveedor Salomon
    const salomon = await prisma.supplier.upsert({
      where: { name: "Salomon" },
      update: {},
      create: {
        name: "Salomon",
      },
    });

    console.log("Proveedor creado:", salomon);

    // Paso 3: Insertar géneros
    const genders = await Promise.all([
      prisma.gender.upsert({
        where: { name: "Men" },
        update: {},
        create: { name: "Men" },
      }),
      prisma.gender.upsert({
        where: { name: "Women" },
        update: {},
        create: { name: "Women" },
      }),
      prisma.gender.upsert({
        where: { name: "Unisex" },
        update: {},
        create: { name: "Unisex" },
      }),
      prisma.gender.upsert({
        where: { name: "Kids" },
        update: {},
        create: { name: "Kids" },
      }),
    ]);

    console.log("Géneros creados:", genders);

    // Paso 4: Insertar categorías para Salomon
    const categories = await Promise.all([
      prisma.category.upsert({
        where: {
          supplierId_genderId_name: {
            supplierId: salomon.id,
            genderId: genders[0].id, // Men
            name: "Men's Footwear",
          },
        },
        update: {
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
        },
        create: {
          name: "Men's Footwear",
          genderId: genders[0].id, // Men
          supplierId: salomon.id,
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
          sizingSystems: {
            connect: sizeSystems.map((system) => ({ id: system.id })),
          },
        },
      }),
      prisma.category.upsert({
        where: {
          supplierId_genderId_name: {
            supplierId: salomon.id,
            genderId: genders[1].id, // Women
            name: "Women's Footwear",
          },
        },
        update: {
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
        },
        create: {
          name: "Women's Footwear",
          genderId: genders[1].id, // Women
          supplierId: salomon.id,
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
          sizingSystems: {
            connect: sizeSystems.map((system) => ({ id: system.id })),
          },
        },
      }),
      prisma.category.upsert({
        where: {
          supplierId_genderId_name: {
            supplierId: salomon.id,
            genderId: genders[2].id, // Unisex
            name: "Unisex Footwear",
          },
        },
        update: {
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
        },
        create: {
          name: "Unisex Footwear",
          genderId: genders[2].id, // Unisex
          supplierId: salomon.id,
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
          sizingSystems: {
            connect: sizeSystems.map((system) => ({ id: system.id })),
          },
        },
      }),
      prisma.category.upsert({
        where: {
          supplierId_genderId_name: {
            supplierId: salomon.id,
            genderId: genders[3].id, // Kids
            name: "Kid's Footwear",
          },
        },
        update: {
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
        },
        create: {
          name: "Kid's Footwear",
          genderId: genders[3].id, // Kids
          supplierId: salomon.id,
          originSystemId: sizeSystems.find((s) => s.systemName === "UK")?.id,
          predefinedSystemId: sizeSystems.find((s) => s.systemName === "UK")
            ?.id,
          sizingSystems: {
            connect: sizeSystems.map((system) => ({ id: system.id })),
          },
        },
      }),
    ]);

    console.log("Categorías creadas:", categories);

    // Paso 5: Insertar tallas y sus valores para cada categoría
    const menSizes = [
      { originalSize: "6", values: { UK: "6", US: "7", EU: "39", CM: "25" } },
      { originalSize: "7", values: { UK: "7", US: "8", EU: "40", CM: "25.5" } },
      { originalSize: "8", values: { UK: "8", US: "9", EU: "41", CM: "26" } },
    ];

    const womenSizes = [
      { originalSize: "4", values: { UK: "4", US: "6", EU: "37", CM: "23" } },
      { originalSize: "5", values: { UK: "5", US: "7", EU: "38", CM: "23.5" } },
      { originalSize: "6", values: { UK: "6", US: "8", EU: "39", CM: "24" } },
    ];

    const unisexSizes = [
      { originalSize: "7", values: { UK: "7", US: "8", EU: "40", CM: "25.5" } },
      { originalSize: "8", values: { UK: "8", US: "9", EU: "41", CM: "26" } },
      {
        originalSize: "9",
        values: { UK: "9", US: "10", EU: "42", CM: "26.5" },
      },
    ];

    const kidsSizes = [
      { originalSize: "1", values: { UK: "1", US: "2", EU: "32", CM: "20" } },
      { originalSize: "2", values: { UK: "2", US: "3", EU: "33", CM: "20.5" } },
      { originalSize: "3", values: { UK: "3", US: "4", EU: "34", CM: "21" } },
    ];

    // Función auxiliar para crear tallas con sus valores
    async function createSizesWithValues(category, sizes) {
      for (const sizeData of sizes) {
        const size = await prisma.size.create({
          data: {
            originalSize: sizeData.originalSize,
            supplierId: salomon.id,
            categoryId: category.id,
            sizeSystemId: sizeSystems.find((s) => s.systemName === "UK").id,
            sizeValues: {
              create: Object.entries(sizeData.values).map(
                ([systemName, value]) => ({
                  value,
                  sizeSystemId: sizeSystems.find(
                    (s) => s.systemName === systemName
                  ).id,
                })
              ),
            },
          },
        });
        console.log(`Talla creada: ${size.originalSize} para ${category.name}`);
      }
    }

    // Crear tallas para cada categoría
    await createSizesWithValues(categories[0], menSizes);
    await createSizesWithValues(categories[1], womenSizes);
    await createSizesWithValues(categories[2], unisexSizes);
    await createSizesWithValues(categories[3], kidsSizes);

    // Paso 6: Insertar categorías internas (Int_Category)
    const intCategories = await Promise.all([
      prisma.int_Category.upsert({
        where: { referenceId: "RUNN-ZAPA-001" },
        update: { name: "Zapatillas Running" },
        create: {
          referenceId: "RUNN-ZAPA-001",
          name: "Zapatillas Running",
        },
      }),
      prisma.int_Category.upsert({
        where: { referenceId: "TRAIL-ZAPA-001" },
        update: { name: "Zapatillas Trail" },
        create: {
          referenceId: "TRAIL-ZAPA-001",
          name: "Zapatillas Trail",
        },
      }),
      prisma.int_Category.upsert({
        where: { referenceId: "HIKE-BOOT-001" },
        update: { name: "Botas Hiking" },
        create: {
          referenceId: "HIKE-BOOT-001",
          name: "Botas Hiking",
        },
      }),
      prisma.int_Category.upsert({
        where: { referenceId: "CASUAL-SHOE-001" },
        update: { name: "Calzado Casual" },
        create: {
          referenceId: "CASUAL-SHOE-001",
          name: "Calzado Casual",
        },
      }),
    ]);

    console.log("Categorías internas creadas:", intCategories);

    // Paso 7: Vincular categorías internas con categorías existentes
    // Vinculamos las categorías de hombre con zapatillas running y trail
    await prisma.category.update({
      where: { id: categories[0].id }, // Men's Footwear
      data: {
        intCategories: {
          connect: [
            { id: intCategories[0].id }, // Zapatillas Running
            { id: intCategories[1].id }, // Zapatillas Trail
          ],
        },
      },
    });

    // Vinculamos las categorías de mujer con zapatillas running y calzado casual
    await prisma.category.update({
      where: { id: categories[1].id }, // Women's Footwear
      data: {
        intCategories: {
          connect: [
            { id: intCategories[0].id }, // Zapatillas Running
            { id: intCategories[3].id }, // Calzado Casual
          ],
        },
      },
    });

    // Vinculamos las categorías unisex con botas hiking
    await prisma.category.update({
      where: { id: categories[2].id }, // Unisex Footwear
      data: {
        intCategories: {
          connect: [
            { id: intCategories[2].id }, // Botas Hiking
          ],
        },
      },
    });

    console.log("Relaciones entre categorías actualizadas correctamente");

    console.log("Base de datos poblada exitosamente");
  } catch (error) {
    console.error("Error al poblar la base de datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
