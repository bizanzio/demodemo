#!/usr/bin/env node

/**
 * Script para probar la conexión con MariaDB usando Prisma directo
 */

require('dotenv').config();

async function testMariaDBConnection() {
    console.log('🔌 Probando conexión con MariaDB...\n');

    let prisma;

    try {
        // Importar dependencias
        const { PrismaClient } = require('@prisma/client');

        console.log('📋 Configuración:');
        console.log(
            `- DATABASE_URL: ${
                process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'No configurada'
            }`
        );
        console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'No configurado'}`);
        console.log('');

        // Crear cliente Prisma directo (sin adaptador)
        prisma = new PrismaClient({
            log: ['error'],
        });

        // Probar conexión básica
        console.log('1️⃣ Probando conexión básica...');
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Conexión básica exitosa');

        // Obtener información de la base de datos
        console.log('\n2️⃣ Obteniendo información de la base de datos...');
        const versionResult = await prisma.$queryRaw`SELECT VERSION() as version`;
        const version = versionResult[0]?.version || 'Desconocida';

        console.log(`- Estado: ✅ Conectado`);
        console.log(`- Versión: ${version}`);
        console.log(`- Adaptador: Prisma directo MySQL/MariaDB`);

        // Probar consulta simple
        console.log('\n3️⃣ Probando consulta de prueba...');
        const testQuery =
            await prisma.$queryRaw`SELECT 'Prisma + MariaDB Working!' as message, NOW() as timestamp`;
        console.log('✅ Consulta exitosa:', testQuery);

        // Probar operación con las tablas del schema (si existen)
        console.log('\n4️⃣ Probando operaciones con el schema...');
        try {
            const surveyCount = await prisma.survey.count();
            const submissionCount = await prisma.surveySubmission.count();

            console.log(`✅ Encuestas en BD: ${surveyCount}`);
            console.log(`✅ Envíos en BD: ${submissionCount}`);
        } catch (error) {
            console.log('⚠️ Las tablas aún no existen (ejecuta `npm run db:migrate` primero)');
            console.log(`   Error: ${error.message}`);
        }

        console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('Prisma + MariaDB están funcionando correctamente.');
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
        console.error('\n🔧 Posibles soluciones:');
        console.error('1. Verificar que MariaDB esté ejecutándose: npm run docker:up');
        console.error('2. Verificar las credenciales en DATABASE_URL');
        console.error('3. Verificar que la base de datos existe');
        console.error('4. Ejecutar `npm run db:migrate` si es la primera vez');

        process.exit(1);
    } finally {
        // Limpiar conexiones
        try {
            if (prisma) {
                await prisma.$disconnect();
            }
            console.log('\n🔌 Conexiones cerradas correctamente');
        } catch (error) {
            console.warn('⚠️ Error cerrando conexiones:', error.message);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testMariaDBConnection();
}
