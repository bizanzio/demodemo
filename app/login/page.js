"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faSpinner,
  faUser,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [resetTime, setResetTime] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRemainingAttempts(null);
    setResetTime(null);

    try {
      // Verificar rate limiting en el cliente antes de hacer la petición
      const identifier = `client:${username}`;
      const rateLimit = checkRateLimit(identifier, 5, 15 * 60 * 1000);

      if (!rateLimit.allowed) {
        setError("Demasiados intentos de login. Inténtalo de nuevo más tarde.");
        setResetTime(rateLimit.resetTime);
        setRemainingAttempts(rateLimit.remainingAttempts);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Credenciales incorrectas - actualizar rate limit
          setError(data.error);
          setRemainingAttempts(rateLimit.remainingAttempts);
        } else {
          throw new Error(data.error || "Error al iniciar sesión");
        }
        return;
      }

      // Login exitoso - limpiar rate limit
      clearRateLimit(identifier);

      // Guardar estado de autenticación
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redireccionar al panel admin
      router.push("/admin");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatResetTime = (resetTime) => {
    if (!resetTime) return "";
    const date = new Date(resetTime);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Acceso al Panel Admin
          </h2>
        </div>

        {error && (
          <div
            className={`border-l-4 p-4 mb-4 ${
              remainingAttempts === 0
                ? "bg-red-50 border-red-500"
                : "bg-yellow-50 border-yellow-500"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <FontAwesomeIcon
                  icon={
                    remainingAttempts === 0 ? faExclamationTriangle : faLock
                  }
                  className={`h-5 w-5 ${
                    remainingAttempts === 0 ? "text-red-500" : "text-yellow-500"
                  }`}
                />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">{error}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Intentos restantes: {remainingAttempts}
                  </p>
                )}
                {resetTime && (
                  <p className="text-xs text-gray-600 mt-1">
                    Puedes intentar de nuevo a las {formatResetTime(resetTime)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6 text-black" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Usuario
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon
                  icon={faUser}
                  className="h-5 w-5 text-gray-400"
                />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ingresa tu usuario"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Contraseña
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon
                  icon={faLock}
                  className="h-5 w-5 text-gray-400"
                />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ingresa tu contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || remainingAttempts === 0}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin h-5 w-5 mr-2"
                  />
                  Verificando...
                </>
              ) : (
                "Acceder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
