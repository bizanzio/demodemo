import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export interface AdminCredentials {
    username: string;
    password: string;
}

export class AdminAuth {
    private static readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas
    private static readonly MAX_ATTEMPTS = 5;
    private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

    // Verificar credenciales
    static validateCredentials(credentials: AdminCredentials): boolean {
        const validUsername = process.env.ADMIN_USERNAME || 'admin';
        const validPassword = process.env.ADMIN_PASSWORD || 'password';

        return credentials.username === validUsername && credentials.password === validPassword;
    }

    // Verificar API key para endpoints protegidos
    static validateApiKey(request: NextRequest): boolean {
        const apiKey = request.headers.get('x-api-key');
        const validApiKey = process.env.ADMIN_API_KEY || 'admin-key-2024';

        return apiKey === validApiKey;
    }

    // Generar respuesta de error de autenticación
    static unauthorizedResponse(message = 'Unauthorized', code = 'INVALID_CREDENTIALS') {
        return NextResponse.json(
            {
                success: false,
                error: message,
                code,
            },
            { status: 401 }
        );
    }

    // Middleware para proteger rutas de administración
    static async protectAdminRoute(request: NextRequest): Promise<NextResponse | null> {
        const requestId = nanoid(8);

        try {
            // Verificar si es una ruta de API de administración
            if (request.nextUrl.pathname.startsWith('/api/admin/')) {
                console.log(
                    `[${requestId}] Protecting admin API route: ${request.nextUrl.pathname}`
                );

                if (!this.validateApiKey(request)) {
                    console.log(`[${requestId}] ❌ Invalid API key for admin route`);
                    return this.unauthorizedResponse('Invalid API key', 'INVALID_API_KEY');
                }

                console.log(`[${requestId}] ✅ Admin API route authorized`);
                return null; // Continuar con la solicitud
            }

            // Para rutas de página de admin, no hacer nada aquí (se maneja en el componente)
            return null;
        } catch (error: any) {
            console.error(`[${requestId}] ❌ Admin auth error:`, error.message);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication error',
                    code: 'AUTH_ERROR',
                },
                { status: 500 }
            );
        }
    }

    // Validar sesión del cliente
    static isValidSession(sessionData: any): boolean {
        if (!sessionData || !sessionData.timestamp) {
            return false;
        }

        const now = Date.now();
        const sessionAge = now - sessionData.timestamp;

        return sessionAge < this.SESSION_DURATION;
    }

    // Crear datos de sesión
    static createSessionData(username: string) {
        return {
            timestamp: Date.now(),
            user: username,
            sessionId: nanoid(16),
        };
    }
}
