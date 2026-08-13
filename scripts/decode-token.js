#!/usr/bin/env node

/**
 * JWT Token Decoder
 * Usage: node scripts/decode-token.js <token_or_url>
 *
 * Examples:
 *   node scripts/decode-token.js "https://survey.viladomat.com?t=eyJhbG..."
 *   node scripts/decode-token.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */

const token = process.argv[2];

if (!token) {
    console.log('❌ Usage: node scripts/decode-token.js <token_or_url>\n');
    console.log('Examples:');
    console.log('  node scripts/decode-token.js "https://survey.viladomat.com?t=eyJhbG..."');
    console.log('  node scripts/decode-token.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
    process.exit(1);
}

// Extract token from URL if needed
let jwt = token;
if (token.includes('?t=')) {
    const url = new URL(token);
    jwt = url.searchParams.get('t');
    console.log('🔗 URL detected, extracting token parameter...\n');
} else if (token.includes('t=')) {
    jwt = token.split('t=')[1].split('&')[0];
    console.log('🔗 Query string detected, extracting token...\n');
}

if (!jwt) {
    console.log('❌ No token found in the input');
    process.exit(1);
}

// Decode JWT (without verification - just to see contents)
const parts = jwt.split('.');

if (parts.length < 2) {
    console.log('❌ Invalid JWT format (expected at least 2 parts separated by dots)');
    process.exit(1);
}

try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    console.log('='.repeat(50));
    console.log('📋 JWT TOKEN DECODED');
    console.log('='.repeat(50));

    console.log('\n🔑 HEADER:');
    console.log(JSON.stringify(header, null, 2));

    console.log('\n📦 PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));

    // Parse timestamps if present
    console.log('\n⏰ TIMESTAMPS:');
    if (payload.iat) {
        const iat = new Date(payload.iat * 1000);
        console.log(`   iat (issued at):  ${iat.toISOString()} (${iat.toLocaleString()})`);
    }
    if (payload.exp) {
        const exp = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = exp < now;
        console.log(
            `   exp (expires at): ${exp.toISOString()} (${exp.toLocaleString()}) ${
                isExpired ? '❌ EXPIRED' : '✅ Valid'
            }`
        );
    }
    if (payload.nbf) {
        const nbf = new Date(payload.nbf * 1000);
        console.log(`   nbf (not before): ${nbf.toISOString()} (${nbf.toLocaleString()})`);
    }
    if (!payload.iat && !payload.exp && !payload.nbf) {
        console.log('   No timestamps found in token');
    }

    console.log('\n🔒 SIGNATURE:');
    console.log(
        `   ${parts[2] ? parts[2].substring(0, 20) + '...' : '(no signature - alg: none)'}`
    );

    console.log('\n' + '='.repeat(50));

    // Validation hints
    console.log('\n💡 VALIDATION CHECKS:');
    if (header.alg === 'HS256') {
        console.log('   ✅ Algorithm: HS256 (expected)');
    } else if (header.alg === 'none') {
        console.log('   ⚠️  Algorithm: none (unsigned token - dev only!)');
    } else {
        console.log(`   ⚠️  Algorithm: ${header.alg} (expected HS256)`);
    }

    if (payload.iss === 'vl-survey-system') {
        console.log('   ✅ Issuer: vl-survey-system');
    } else {
        console.log(`   ❌ Issuer: ${payload.iss || 'missing'} (expected: vl-survey-system)`);
    }

    if (payload.aud === 'vl-survey') {
        console.log('   ✅ Audience: vl-survey');
    } else {
        console.log(`   ❌ Audience: ${payload.aud || 'missing'} (expected: vl-survey)`);
    }

    if (payload.ticket_id) {
        console.log(`   ✅ Ticket ID: ${payload.ticket_id}`);
    } else {
        console.log('   ❌ Ticket ID: missing (required!)');
    }
} catch (error) {
    console.log('❌ Error decoding token:', error.message);
    console.log('\nRaw parts:');
    parts.forEach((part, i) => {
        console.log(`   Part ${i}: ${part.substring(0, 30)}...`);
    });
    process.exit(1);
}
