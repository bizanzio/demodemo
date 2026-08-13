import { PrismaClient } from '@prisma/client';

// Declaración global para evitar múltiples instancias en desarrollo
declare global {
    var prisma: PrismaClient | undefined;
}

// Crear una única instancia de PrismaClient (conexión directa MySQL)
export const prisma =
    globalThis.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

// En desarrollo, almacenar la instancia globalmente para evitar reconexiones
if (process.env.NODE_ENV === 'development') {
    globalThis.prisma = prisma;
}

// Función helper para cerrar la conexión de forma limpia
export async function disconnectPrisma() {
    await prisma.$disconnect();
}

// Función helper para verificar la conexión
export async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1 as test`;
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

// Función helper para obtener información de la conexión
export async function getDatabaseInfo() {
    try {
        const result = (await prisma.$queryRaw`SELECT VERSION() as version`) as Array<{
            version: string;
        }>;
        return {
            connected: true,
            version: result[0]?.version || 'Unknown',
            adapter: 'MySQL/MariaDB Direct',
        };
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            adapter: 'MySQL/MariaDB Direct',
        };
    }
}

export default prisma;
