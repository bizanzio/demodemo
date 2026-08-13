import bcrypt from "bcryptjs";

// Configuración de usuarios (en producción, esto debería estar en una base de datos)
const USERS = [
  {
    username: "admin",
    password: process.env.ADMIN_PASSWORD, // Contraseña en texto plano
    role: "admin",
  },
];

export async function verifyUser(username, password) {
  const user = USERS.find((u) => u.username === username);

  if (!user) {
    return { success: false, error: "Usuario no encontrado" };
  }

  // Comparar contraseña en texto plano
  if (password !== user.password) {
    return { success: false, error: "Contraseña incorrecta" };
  }

  return {
    success: true,
    user: {
      username: user.username,
      role: user.role,
    },
  };
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export function getUserByUsername(username) {
  return USERS.find((u) => u.username === username);
}
