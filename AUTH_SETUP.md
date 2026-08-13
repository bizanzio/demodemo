# Configuración de Autenticación con Rate Limiting

## Características Implementadas

### 🔐 Autenticación con Usuario y Contraseña

- Sistema de login con nombre de usuario y contraseña
- Contraseñas hasheadas con bcrypt
- Sesiones seguras con cookies httpOnly

### 🛡️ Rate Limiting

- Máximo 5 intentos de login en 15 minutos por IP/usuario
- Bloqueo temporal automático después de exceder el límite
- Limpieza automática de intentos antiguos

### 👤 Gestión de Usuarios

- Información del usuario visible en el panel admin
- Roles de usuario (admin, etc.)
- Logout seguro que limpia todas las sesiones

## Configuración Inicial

### 1. Generar Hash de Contraseña

Ejecuta el script para generar el hash de tu contraseña:

```bash
node scripts/generateHash.js "tu_contraseña_aqui"
```

### 2. Configurar Variables de Entorno

Añade la siguiente línea a tu archivo `.env`:

```env
ADMIN_PASSWORD_HASH=el_hash_generado_en_el_paso_anterior
```

### 3. Usuarios por Defecto

El sistema viene configurado con un usuario administrador:

- **Usuario:** `admin`
- **Contraseña:** La que configuraste en el paso 1
- **Rol:** `admin`

## Personalización

### Añadir Más Usuarios

Para añadir más usuarios, edita el archivo `lib/auth.js`:

```javascript
const USERS = [
  {
    username: "admin",
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    role: "admin",
  },
  {
    username: "editor",
    passwordHash: process.env.EDITOR_PASSWORD_HASH,
    role: "editor",
  },
];
```

### Configurar Rate Limiting

Puedes ajustar los parámetros de rate limiting en `app/api/auth/login/route.js`:

```javascript
const rateLimit = checkRateLimit(identifier, 5, 15 * 60 * 1000);
//                                    ↑    ↑
//                              intentos  tiempo en ms
```

## Seguridad

### Características de Seguridad Implementadas

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Rate limiting por IP y usuario
- ✅ Cookies httpOnly y secure
- ✅ Middleware de protección de rutas
- ✅ Limpieza automática de sesiones
- ✅ Validación de entrada
- ✅ Manejo seguro de errores

### Recomendaciones Adicionales

1. **En producción:**

   - Usa HTTPS
   - Configura variables de entorno seguras
   - Considera usar una base de datos para usuarios
   - Implementa logging de intentos de login

2. **Monitoreo:**
   - Revisa logs de intentos fallidos
   - Monitorea el rate limiting
   - Configura alertas para múltiples intentos

## Uso

1. Accede a `/login`
2. Introduce usuario y contraseña
3. El sistema te redirigirá automáticamente al panel admin
4. Tu información de usuario se mostrará en la barra superior
5. Usa el botón "Cerrar Sesión" para salir de forma segura

## Troubleshooting

### Error: "Usuario no encontrado"

- Verifica que el usuario existe en `lib/auth.js`
- Asegúrate de que el hash de contraseña esté configurado correctamente

### Error: "Demasiados intentos de login"

- Espera 15 minutos o cambia tu IP
- El sistema se desbloqueará automáticamente

### Problemas de sesión

- Limpia las cookies del navegador
- Verifica que las variables de entorno estén configuradas
