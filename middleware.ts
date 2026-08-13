import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { AdminAuth } from './lib/admin-auth';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // Proteger rutas de administración
    if (request.nextUrl.pathname.startsWith('/api/admin/')) {
        const adminResponse = await AdminAuth.protectAdminRoute(request);
        if (adminResponse) {
            return adminResponse;
        }
    }

    // Aplicar middleware de internacionalización
    return intlMiddleware(request);
}

export const config = {
    // Aplicar el middleware a totes les rutes menys les estàtiques
    matcher: [
        // Incloure totes les rutes...
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.|robots.txt|sitemap.xml).*)',
    ],
};
