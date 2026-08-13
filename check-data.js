const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log("Verificando datos en la base de datos...\n");

    const sizeSystems = await prisma.sizeSystem.findMany();
    console.log("Sistemas de tallas:", sizeSystems);

    const suppliers = await prisma.supplier.findMany();
    console.log("\nProveedores:", suppliers);

    const genders = await prisma.gender.findMany();
    console.log("\nGéneros:", genders);

    const categories = await prisma.category.findMany({
      include: {
        gender: true,
        supplier: true,
        originSystem: true,
      },
    });
    console.log("\nCategorías:", JSON.stringify(categories, null, 2));

    const sizes = await prisma.size.findMany({
      include: {
        supplier: true,
        category: true,
        sizeSystem: true,
      },
    });
    console.log("\nTallas:", JSON.stringify(sizes, null, 2));

    // Mostrar resumen
    console.log("\nResumen de datos:");
    console.log(`- Sistemas de tallas: ${sizeSystems.length}`);
    console.log(`- Proveedores: ${suppliers.length}`);
    console.log(`- Géneros: ${genders.length}`);
    console.log(`- Categorías: ${categories.length}`);
    console.log(`- Tallas: ${sizes.length}`);
  } catch (error) {
    console.error("Error al verificar datos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
