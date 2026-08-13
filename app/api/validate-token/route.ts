import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { handleCorsOptions, corsJsonResponse } from '@/lib/cors';
import { trackSuspiciousActivity } from '@/lib/anti-fraud';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const requestId = nanoid(8);

    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('t');

        // Obtenir IP i User-Agent per tracking antifraude
        const ip =
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || undefined;

        console.log(`[${requestId}] Token validation request from IP: ${ip}`);

        if (!token) {
            return corsJsonResponse(
                request,
                {
                    success: false,
                    error: 'Token parameter is required',
                    code: 'MISSING_TOKEN',
                },
                { status: 400 }
            );
        }

        // En desenvolupament, acceptar tokens simples per facilitar proves
        if (process.env.NODE_ENV === 'development') {
            // Tokens de desenvolupament simples
            if (token === 'dev-token' || token === 'test' || token === 'placeholder') {
                console.log(`[${requestId}] ✅ Dev token accepted: ${token}`);
                return NextResponse.json({
                    success: true,
                    data: {
                        valid: true,
                        ticket_id: 'DEV_TICKET_12345',
                    },
                });
            }

            // Tokens que semblen números de tiquet (com E/12191)
            if (token.match(/^[A-Z]+\/\d+$/)) {
                console.log(
                    `[${requestId}] ✅ Dev ticket-like token accepted: ${token.substring(0, 5)}...`
                );
                return NextResponse.json({
                    success: true,
                    data: {
                        valid: true,
                        ticket_id: token,
                    },
                });
            }
        }

        // Verificació JWT segura amb jose
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET, {
                algorithms: ['HS256'],
                audience: 'vl-survey',
                issuer: 'vl-survey-system',
            });

            // Verificar camps obligatoris
            if (!payload.ticket_id || typeof payload.ticket_id !== 'string') {
                console.log(`[${requestId}] ❌ JWT missing ticket_id`);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid token payload',
                        code: 'INVALID_PAYLOAD',
                    },
                    { status: 401 }
                );
            }

            console.log(
                `[${requestId}] ✅ JWT validated for ticket: ${payload.ticket_id.substring(
                    0,
                    5
                )}...`
            );

            // Tracking antifraude per token vàlid
            const fraudCheck = trackSuspiciousActivity(ip, payload.ticket_id, true, userAgent);
            if (!fraudCheck.allowed) {
                console.log(`[${requestId}] 🚫 Suspicious activity detected: ${fraudCheck.reason}`);
                return corsJsonResponse(
                    request,
                    {
                        success: false,
                        error: 'Too many requests detected',
                        code: 'SUSPICIOUS_ACTIVITY',
                    },
                    { status: 429 }
                );
            }

            return corsJsonResponse(request, {
                success: true,
                data: {
                    valid: true,
                    ticket_id: payload.ticket_id,
                },
            });
        } catch (jwtError: any) {
            console.log(`[${requestId}] ❌ JWT verification failed: ${jwtError.message}`);

            // Tracking antifraude per token invàlid
            const fraudCheck = trackSuspiciousActivity(ip, undefined, false, userAgent);
            if (!fraudCheck.allowed) {
                console.log(`[${requestId}] 🚫 Suspicious activity detected: ${fraudCheck.reason}`);
                return corsJsonResponse(
                    request,
                    {
                        success: false,
                        error: 'Too many invalid attempts detected',
                        code: 'SUSPICIOUS_ACTIVITY',
                    },
                    { status: 429 }
                );
            }

            // En desenvolupament, fallback per tokens no-JWT
            if (process.env.NODE_ENV === 'development') {
                console.log(
                    `[${requestId}] 🔄 Dev fallback for non-JWT token: ${token.substring(0, 10)}...`
                );
                return NextResponse.json({
                    success: true,
                    data: {
                        valid: true,
                        ticket_id: token,
                    },
                });
            }

            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid or expired token',
                    code: 'INVALID_JWT',
                },
                { status: 401 }
            );
        }
    } catch (error: any) {
        console.error(`[${requestId}] ❌ Token validation error:`, error.message);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
            },
            { status: 500 }
        );
    }
}
