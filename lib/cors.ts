import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware CORS per restringir accés només al mateix origen
 */
export function corsHeaders(request: NextRequest): Headers {
    const headers = new Headers();

    // Obtenir l'origen de la request
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Només permetre same-origin requests
    const allowedOrigins = [
        `https://${host}`,
        `http://${host}`,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    ].filter(Boolean) as string[];

    if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
    } else {
        // No establir Access-Control-Allow-Origin per denegar
        headers.set('Access-Control-Allow-Origin', 'null');
    }

    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Allow-Credentials', 'false');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hores

    return headers;
}

/**
 * Gestionar preflight OPTIONS requests
 */
export function handleCorsOptions(request: NextRequest): NextResponse {
    const headers = corsHeaders(request);
    return new NextResponse(null, { status: 204, headers });
}

/**
 * Aplicar headers CORS a una resposta
 */
export function withCors(request: NextRequest, response: NextResponse): NextResponse {
    const corsHeadersMap = corsHeaders(request);

    corsHeadersMap.forEach((value, key) => {
        response.headers.set(key, value);
    });

    return response;
}

/**
 * Helper per crear resposta JSON amb CORS
 */
export function corsJsonResponse(
    request: NextRequest,
    body: any,
    init?: ResponseInit
): NextResponse {
    const response = NextResponse.json(body, init);
    return withCors(request, response);
}
