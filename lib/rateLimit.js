// Rate limiting para autenticación usando localStorage del cliente
// Esto evita que se resetee con cada refresh del servidor

export function checkRateLimit(
  identifier,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
) {
  // Esta función se ejecutará en el cliente
  if (typeof window === "undefined") {
    // Si estamos en el servidor, permitir (el rate limiting real se hace en el cliente)
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      resetTime: Date.now() + windowMs,
    };
  }

  const now = Date.now();
  const storageKey = `rateLimit_${identifier}`;

  try {
    const stored = localStorage.getItem(storageKey);
    const attempts = stored ? JSON.parse(stored) : [];

    // Limpiar intentos antiguos (más de 15 minutos)
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (recentAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: recentAttempts[0] + windowMs,
      };
    }

    // Registrar nuevo intento
    recentAttempts.push(now);
    localStorage.setItem(storageKey, JSON.stringify(recentAttempts));

    return {
      allowed: true,
      remainingAttempts: maxAttempts - recentAttempts.length,
      resetTime: recentAttempts[0] + windowMs,
    };
  } catch (error) {
    console.error("Error en rate limiting:", error);
    // En caso de error, permitir el acceso
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      resetTime: now + windowMs,
    };
  }
}

export function clearRateLimit(identifier) {
  if (typeof window !== "undefined") {
    const storageKey = `rateLimit_${identifier}`;
    localStorage.removeItem(storageKey);
  }
}

// Función para limpiar todos los rate limits antiguos
export function cleanupRateLimits() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("rateLimit_")) {
      try {
        const attempts = JSON.parse(localStorage.getItem(key));
        const recentAttempts = attempts.filter(
          (timestamp) => now - timestamp < windowMs
        );

        if (recentAttempts.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(recentAttempts));
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Limpiar rate limits antiguos cada 5 minutos
if (typeof window !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
