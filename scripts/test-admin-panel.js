#!/usr/bin/env node

/**
 * Script de prueba para el Panel de Administración
 * Verifica que todos los endpoints y funcionalidades funcionen correctamente
 */

const https = require('https');
const http = require('http');

// Configuración
const config = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.ADMIN_API_KEY || 'admin-key-2024',
    locale: 'es', // Puedes cambiar por ca, en, fr
};

// Utilidad para hacer requests HTTP
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                ...options.headers,
            },
            ...options,
        };

        const req = protocol.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Tests
const tests = [
    {
        name: 'Verificar endpoint de estadísticas',
        test: async () => {
            const response = await makeRequest(`${config.baseUrl}/api/admin/stats`);

            if (response.status !== 200) {
                throw new Error(`Status esperado: 200, recibido: ${response.status}`);
            }

            if (!response.data.success) {
                throw new Error(`Respuesta no exitosa: ${response.data.error}`);
            }

            const requiredFields = [
                'totalSurveys',
                'averageCsat',
                'averageNps',
                'averageSalespersonRating',
                'foundEverythingPercentage',
                'waitTimeDistribution',
                'pointsDistribution',
                'totalPointsEarned',
                'pointsSuccessRate',
            ];

            for (const field of requiredFields) {
                if (!(field in response.data.data)) {
                    throw new Error(`Campo requerido faltante: ${field}`);
                }
            }

            console.log(`✅ Estadísticas obtenidas correctamente:`);
            console.log(`   - Total encuestas: ${response.data.data.totalSurveys}`);
            console.log(`   - CSAT promedio: ${response.data.data.averageCsat.toFixed(2)}`);
            console.log(`   - NPS promedio: ${response.data.data.averageNps.toFixed(2)}`);
            console.log(`   - Puntos totales: ${response.data.data.totalPointsEarned}`);
        },
    },

    {
        name: 'Verificar endpoint de encuestas',
        test: async () => {
            const response = await makeRequest(
                `${config.baseUrl}/api/admin/surveys?page=1&limit=5`
            );

            if (response.status !== 200) {
                throw new Error(`Status esperado: 200, recibido: ${response.status}`);
            }

            if (!response.data.success) {
                throw new Error(`Respuesta no exitosa: ${response.data.error}`);
            }

            const requiredFields = ['surveys', 'total', 'page', 'limit', 'totalPages'];

            for (const field of requiredFields) {
                if (!(field in response.data.data)) {
                    throw new Error(`Campo requerido faltante: ${field}`);
                }
            }

            console.log(`✅ Datos de encuestas obtenidos correctamente:`);
            console.log(`   - Total registros: ${response.data.data.total}`);
            console.log(`   - Página actual: ${response.data.data.page}`);
            console.log(`   - Encuestas en página: ${response.data.data.surveys.length}`);
            console.log(`   - Total páginas: ${response.data.data.totalPages}`);
        },
    },

    {
        name: 'Verificar acceso sin API key',
        test: async () => {
            const response = await makeRequest(`${config.baseUrl}/api/admin/stats`, {
                headers: { 'x-api-key': '' },
            });

            if (response.status !== 401) {
                throw new Error(
                    `Se esperaba status 401 (Unauthorized), recibido: ${response.status}`
                );
            }

            console.log(`✅ Protección de API key funcionando correctamente`);
        },
    },

    {
        name: 'Verificar página de administración',
        test: async () => {
            const response = await makeRequest(`${config.baseUrl}/${config.locale}/admin`, {
                headers: { Accept: 'text/html' },
            });

            if (response.status !== 200) {
                throw new Error(`Status esperado: 200, recibido: ${response.status}`);
            }

            console.log(`✅ Página de administración accesible`);
        },
    },
];

// Ejecutar tests
async function runTests() {
    console.log('🚀 Iniciando tests del Panel de Administración...\n');
    console.log(`📍 URL base: ${config.baseUrl}`);
    console.log(`🗝️  API Key: ${config.apiKey.substring(0, 8)}...`);
    console.log(`🌐 Locale: ${config.locale}\n`);

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`🧪 Ejecutando: ${test.name}`);
            await test.test();
            passed++;
        } catch (error) {
            console.log(`❌ FALLÓ: ${test.name}`);
            console.log(`   Error: ${error.message}`);
            failed++;
        }
        console.log('');
    }

    console.log('📊 RESUMEN DE TESTS:');
    console.log(`✅ Pasaron: ${passed}`);
    console.log(`❌ Fallaron: ${failed}`);
    console.log(`📈 Total: ${tests.length}`);

    if (failed === 0) {
        console.log(
            '\n🎉 ¡Todos los tests pasaron! El panel de administración está funcionando correctamente.'
        );
    } else {
        console.log('\n⚠️  Algunos tests fallaron. Revisar la configuración y logs del servidor.');
        process.exit(1);
    }
}

// Verificar que el servidor esté corriendo
async function checkServer() {
    try {
        const response = await makeRequest(`${config.baseUrl}/api/admin/stats`);
        return response.status !== undefined;
    } catch (error) {
        return false;
    }
}

// Función principal
async function main() {
    const serverRunning = await checkServer();

    if (!serverRunning) {
        console.log('❌ El servidor no está corriendo o no es accesible.');
        console.log('   Asegúrate de que el servidor Next.js esté iniciado:');
        console.log('   npm run dev');
        process.exit(1);
    }

    await runTests();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
    });
}

module.exports = { runTests, makeRequest, config };


