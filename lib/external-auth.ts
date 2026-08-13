import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

export async function authenticateExternalService(request: NextRequest) {
    const requestId = nanoid(8);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return {
            ok: false as const,
            requestId,
            response: NextResponse.json(
                { success: false, error: 'Bearer token required', code: 'MISSING_TOKEN' },
                { status: 401 }
            ),
        };
    }

    try {
        const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);

        console.log(`[${requestId}] ✅ External API auth: service="${payload.sub}"`);

        return { ok: true as const, requestId, service: payload.sub || 'unknown' };
    } catch (err: any) {
        const isExpired = err.code === 'ERR_JWT_EXPIRED';
        console.log(`[${requestId}] ❌ External API: ${err.message}`);

        return {
            ok: false as const,
            requestId,
            response: NextResponse.json(
                {
                    success: false,
                    error: isExpired ? 'Token expired' : 'Invalid token',
                    code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
                },
                { status: 401 }
            ),
        };
    }
}
