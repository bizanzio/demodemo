#!/usr/bin/env node

/**
 * Genera un JWT para que un servicio externo consuma /api/external/surveys
 *
 * Uso:
 *   node scripts/generate-external-token.js <nombre_servicio> [duración]
 *
 * Ejemplos:
 *   node scripts/generate-external-token.js n8n          # 1 año
 *   node scripts/generate-external-token.js erp-sync 30d # 30 días
 */

const { SignJWT } = require('jose');
require('dotenv').config();

async function main() {
    const service = process.argv[2];
    const expiresIn = process.argv[3] || 'never';

    if (!service) {
        console.log('');
        console.log('Uso: node scripts/generate-external-token.js <nombre_servicio> [duración]');
        console.log('');
        console.log('  nombre_servicio   Ej: n8n, erp-sync, analytics');
        console.log('  duración          Ej: never, 365d, 30d, 24h (default: never)');
        console.log('');
        process.exit(1);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('❌ JWT_SECRET no definido en .env');
        process.exit(1);
    }

    const jwt = new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(service)
        .setIssuedAt();

    if (expiresIn !== 'never') {
        const match = expiresIn.match(/^(\d+)([dhms])$/);
        if (!match) {
            console.error('❌ Formato inválido. Usa: never, 30d, 24h, 60m, 3600s');
            process.exit(1);
        }
        const unitMap = { d: 'days', h: 'hours', m: 'minutes', s: 'seconds' };
        jwt.setExpirationTime(`${match[1]} ${unitMap[match[2]]}`);
    }

    const token = await jwt.sign(new TextEncoder().encode(secret));

    console.log('');
    console.log(`Servicio: ${service} | Expira: ${expiresIn}`);
    console.log('');
    console.log(token);
    console.log('');
    console.log('Uso:');
    console.log(`  curl -H "Authorization: Bearer ${token.substring(0, 20)}..." \\`);
    console.log('    "https://survey.viladomat.com/api/external/surveys"');
    console.log('');
}

main().catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
});
