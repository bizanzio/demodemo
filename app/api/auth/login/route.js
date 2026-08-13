import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUser } from "@/lib/auth";

// En un entorno real, usa variables de entorno y hash seguro
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request) {
  try {
    let username, password;

    // Obtener el Content-Type de la petición
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Parsear como JSON
      const body = await request.json();
      username = body.username;
      password = body.password;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      // Parsear como FormData
      const formData = await request.formData();
      username = formData.get("username");
      password = formData.get("password");
    } else {
      // Intentar parsear como JSON por defecto
      try {
        const body = await request.json();
        username = body.username;
        password = body.password;
      } catch {
        return NextResponse.json(
          { error: "Formato de datos no soportado. Usa JSON o FormData." },
          { status: 400 }
        );
      }
    }

    // Validar que se proporcionen username y password
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Verificar credenciales
    const authResult = await verifyUser(username, password);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Establecer cookie de sesión con información del usuario
    const cookieStore = cookies();
    const sessionData = {
      username: authResult.user.username,
      role: authResult.user.role,
      authenticated: true,
    };

    cookieStore.set("auth-token", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        username: authResult.user.username,
        role: authResult.user.role,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}
