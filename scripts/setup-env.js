#!/usr/bin/env node

/**
 * Script para configurar automáticamente el archivo .env
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

console.log('🔧 Configurando variables de entorno...\n');

try {
    // Verificar si .env ya existe
    if (fs.existsSync(envPath)) {
        console.log('⚠️ El archivo .env ya existe.');
        console.log('Si quieres recrearlo, borra el archivo .env primero.\n');

        // Mostrar contenido actual
        const currentEnv = fs.readFileSync(envPath, 'utf8');
        console.log('📋 Contenido actual de .env:');
        console.log('─'.repeat(40));
        console.log(currentEnv);
        console.log('─'.repeat(40));
        return;
    }

    // Copiar desde env.example
    if (!fs.existsSync(envExamplePath)) {
        console.error('❌ No se encuentra env.example');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envContent);

    console.log('✅ Archivo .env creado exitosamente!');
    console.log('\n📋 Configuración por defecto:');
    console.log('─'.repeat(40));
    console.log('DATABASE_URL: mysql://root:password@localhost:3310/vl_survey');
    console.log('NODE_ENV: development');
    console.log('JWT_SECRET: (cambiar en producción)');
    console.log('─'.repeat(40));

    console.log('\n🚀 Próximos pasos:');
    console.log('1. npm run docker:up     # Levantar MariaDB');
    console.log('2. npm run db:migrate    # Crear tablas');
    console.log('3. npm run db:test       # Probar conexión');
} catch (error) {
    console.error('❌ Error configurando .env:', error.message);
    process.exit(1);
}
