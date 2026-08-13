"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";

export default function LogoutButton() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Obtener información del usuario desde localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Borrar estado local de autenticación y datos del usuario
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");

      // Redireccionar al login
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {user && (
        <div className="flex items-center text-sm text-gray-600">
          <FontAwesomeIcon icon={faUser} className="h-4 w-4 mr-2" />
          <span>{user.username}</span>
          {user.role && (
            <span className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded-full">
              {user.role}
            </span>
          )}
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center px-4 py-2 text-sm text-red-600 hover:text-red-800 transition-colors"
      >
        <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4 mr-2" />
        Cerrar Sesión
      </button>
    </div>
  );
}
