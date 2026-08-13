#!/usr/bin/env node

/**
 * Script para configurar las variables de entorno del Panel de Administración
 * Crea o actualiza el archivo .env con las variables necesarias
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_FILE = path.join(__dirname, '..', 'env.example');

// Función para leer entrada del usuario
function askQuestion(question, defaultValue = '') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim() || defaultValue);
        });
    });
}

// Función para generar una clave aleatoria
function generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Función para leer el archivo .env existente
function readExistingEnv() {
    if (!fs.existsSync(ENV_FILE)) {
        return {};
    }

    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const env = {};

    content.split('\n').forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key] = valueParts.join('=').replace(/^"(.*)"$/, '$1');
            }
        }
    });

    return env;
}

// Función para escribir el archivo .env
function writeEnvFile(envVars) {
    let content = '';

    // Si existe env.example, usar como plantilla
    if (fs.existsSync(ENV_EXAMPLE_FILE)) {
        content = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8');

        // Reemplazar valores en la plantilla
        Object.entries(envVars).forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            const replacement = `${key}="${value}"`;

            if (content.match(regex)) {
                content = content.replace(regex, replacement);
            } else {
                // Si no existe en la plantilla, añadir al final
                content += `\n${replacement}`;
            }
        });
    } else {
        // Crear archivo desde cero
        content = '# Variables de entorno para el Panel de Administración\n\n';
        Object.entries(envVars).forEach(([key, value]) => {
            content += `${key}="${value}"\n`;
        });
    }

    fs.writeFileSync(ENV_FILE, content);
}

async function main() {
    console.log('🔧 Configuración del Panel de Administración');
    console.log('============================================\n');

    const existingEnv = readExistingEnv();

    console.log('Configurando credenciales de administrador...\n');

    // Configurar credenciales de admin
    const adminUsername = await askQuestion(
        'Usuario administrador',
        existingEnv.ADMIN_USERNAME || 'admin'
    );

    const adminPassword = await askQuestion(
        'Contraseña administrador',
        existingEnv.ADMIN_PASSWORD || 'viladomat2024'
    );

    // Generar API key si no existe
    const currentApiKey = existingEnv.ADMIN_API_KEY;
    let adminApiKey;

    if (currentApiKey) {
        const keepExisting = await askQuestion(`¿Mantener API key existente? (s/n)`, 's');

        if (keepExisting.toLowerCase() === 's' || keepExisting.toLowerCase() === 'y') {
            adminApiKey = currentApiKey;
        } else {
            adminApiKey = generateRandomKey();
        }
    } else {
        adminApiKey = generateRandomKey();
    }

    console.log('\n📝 Resumen de configuración:');
    console.log(`Usuario: ${adminUsername}`);
    console.log(`Contraseña: ${'*'.repeat(adminPassword.length)}`);
    console.log(
        `API Key: ${adminApiKey.substring(0, 8)}...${adminApiKey.substring(adminApiKey.length - 4)}`
    );

    const confirm = await askQuestion('\n¿Confirmar configuración? (s/n)', 's');

    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Configuración cancelada.');
        process.exit(0);
    }

    // Preparar variables de entorno
    const envVars = {
        ...existingEnv,
        // Credenciales del servidor
        ADMIN_USERNAME: adminUsername,
        ADMIN_PASSWORD: adminPassword,
        ADMIN_API_KEY: adminApiKey,
        // Variables públicas para el frontend
        NEXT_PUBLIC_ADMIN_USERNAME: adminUsername,
        NEXT_PUBLIC_ADMIN_PASSWORD: adminPassword,
        NEXT_PUBLIC_ADMIN_API_KEY: adminApiKey,
    };

    try {
        writeEnvFile(envVars);
        console.log('\n✅ Archivo .env configurado correctamente!');

        console.log('\n🚀 Próximos pasos:');
        console.log('1. Reinicia el servidor de desarrollo: npm run dev');
        console.log('2. Accede al panel: http://localhost:3000/es/admin');
        console.log(`3. Usa las credenciales: ${adminUsername} / ${adminPassword}`);

        console.log('\n🔒 Seguridad:');
        console.log('- Cambia las credenciales por defecto en producción');
        console.log('- No compartas el archivo .env en el control de versiones');
        console.log('- Usa HTTPS en producción');
    } catch (error) {
        console.error('❌ Error escribiendo archivo .env:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
    });
}

module.exports = { main };


