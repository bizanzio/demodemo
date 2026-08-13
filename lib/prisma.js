import { PrismaClient } from "@prisma/client";

let prisma;

// Función para validar la conexión a la base de datos
async function validateDbConnection(prismaInstance) {
  try {
    // Intenta realizar una consulta simple para verificar la conexión
    await prismaInstance.$queryRaw`SELECT 1`;
    console.log("✅ Conexión a la base de datos establecida correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error);
    console.error(
      "Por favor, verifica tu configuración de base de datos y asegúrate de que el servidor esté en funcionamiento."
    );

    // En desarrollo, no queremos que la aplicación falle completamente
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️ Continuando en modo desarrollo a pesar del error de conexión..."
      );
      return false;
    }

    // En producción, podríamos querer detener la aplicación
    if (process.env.NODE_ENV === "production") {
      console.error(
        "🛑 Deteniendo la aplicación debido a error de conexión a la base de datos"
      );
      process.exit(1); // Termina el proceso con error
    }
  }
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  // Validar conexión en producción
  validateDbConnection(prisma);
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
    // Validar conexión en desarrollo
    validateDbConnection(global.prisma);
  }
  prisma = global.prisma;
}

export default prisma;
