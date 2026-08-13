import { NextResponse } from "next/server";

// Validar API Key y Secret para endpoints públicos
function validateApiCredentials(request) {
  // Obtener credenciales de headers (preferido) o query params
  const apiKey = request.headers.get("x-api-key") || 
                 request.nextUrl.searchParams.get("apiKey");
  const apiSecret = request.headers.get("x-api-secret") || 
                    request.nextUrl.searchParams.get("apiSecret");

  const validApiKey = process.env.API_KEY;
  const validApiSecret = process.env.API_SECRET;

  // Verificar que las credenciales coincidan
  return apiKey === validApiKey && apiSecret === validApiSecret;
}

export function middleware(request) {
  // Verificar la cookie de autenticación
  const authToken = request.cookies.get("auth-token");

  // Comprobar si la ruta debe estar protegida
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isSizeGuideRoute = request.nextUrl.pathname.startsWith("/api/size-guide");

  // Si es ruta de admin y no hay token, redirigir al login
  if (isAdminRoute && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si es login pero ya está autenticado, redirigir a admin
  if (request.nextUrl.pathname === "/login" && authToken) {
    try {
      const sessionData = JSON.parse(authToken.value);
      if (sessionData.authenticated) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } catch (error) {
      // Si hay error al parsear, eliminar la cookie corrupta
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth-token");
      return response;
    }
  }

  // Para /api/size-guide: validar con API Key/Secret
  if (isSizeGuideRoute) {
    if (!validateApiCredentials(request)) {
      return NextResponse.json(
        { 
          error: "API Key/Secret inválidos o no proporcionados",
          hint: "Incluye headers 'x-api-key' y 'x-api-secret' o parámetros 'apiKey' y 'apiSecret'"
        }, 
        { status: 401 }
      );
    }
    // Si las credenciales son válidas, continuar
  }

  // Para rutas de API protegidas (excluyendo login, logout y size-guide)
  if (
    isApiRoute &&
    !request.nextUrl.pathname.startsWith("/api/auth/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth/logout") &&
    !isSizeGuideRoute
  ) {
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
      const sessionData = JSON.parse(authToken.value);
      if (!sessionData.authenticated) {
        return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Token de sesión inválido" },
        { status: 401 }
      );
    }
  }

  // Añadir cabeceras para evitar cacheo en rutas sensibles
  const response = NextResponse.next();
  if (isAdminRoute || isApiRoute) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Configurar que rutas deben usar el middleware
export const config = {
  matcher: ["/(.*)", "/api/(.*)"],
};
