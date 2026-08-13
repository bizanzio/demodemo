'use client';

import { useState, useEffect } from 'react';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';
import { AdminAuth } from '@/lib/admin-auth';

// Credenciales por defecto (en producción deberían estar en variables de entorno)
const ADMIN_CREDENTIALS = {
    username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
    password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password',
};

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Verificar si hay una sesión activa
        const savedAuth = localStorage.getItem('admin_auth');
        if (savedAuth) {
            try {
                const sessionData = JSON.parse(savedAuth);
                if (AdminAuth.isValidSession(sessionData)) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('admin_auth');
                }
            } catch {
                localStorage.removeItem('admin_auth');
            }
        }
        setIsLoading(false);
    }, []);

    const handleLogin = async (credentials: { username: string; password: string }) => {
        // Verificar credenciales usando AdminAuth
        if (AdminAuth.validateCredentials(credentials)) {
            // Crear y guardar sesión
            const sessionData = AdminAuth.createSessionData(credentials.username);
            localStorage.setItem('admin_auth', JSON.stringify(sessionData));

            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    return <AdminDashboard onLogout={handleLogout} />;
}
