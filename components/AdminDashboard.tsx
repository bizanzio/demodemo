'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AdminDataTable from './AdminDataTable';
import AdminCharts from './AdminCharts';

interface DashboardStats {
    totalSurveys: number;
    averageCsat: number;
    averageNps: number;
    averageSalespersonRating: number;
    foundEverythingPercentage: number;
    waitTimeDistribution: {
        less2: number;
        '2to5': number;
        '5to10': number;
        more10: number;
    };
    pointsDistribution: Record<string, number>;
    totalPointsEarned: number;
    pointsSuccessRate: number;
    rewardDistribution: Record<string, number>;
    totalVoucherAmount: number;
    rewardSuccessRate: number;
}

interface AdminDashboardProps {
    onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [currentView, setCurrentView] = useState<'dashboard' | 'data' | 'charts'>('dashboard');

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'admin-key-2024',
                },
            });

            if (!response.ok) {
                throw new Error('Error al cargar estadísticas');
            }

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
                setLastUpdated(new Date());
                setError('');
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(num);
    };

    const formatPercentage = (num: number) => {
        return `${formatNumber(num)}%`;
    };

    const getScoreColor = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const waitTimeLabels: Record<string, string> = {
        less2: 'Menos de 2 min',
        '2to5': '2-5 minutos',
        '5to10': '5-10 minutos',
        more10: 'Más de 10 min',
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={fetchStats}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Mostrar vista de datos si está seleccionada
    if (currentView === 'data') {
        return <AdminDataTable onBack={() => setCurrentView('dashboard')} />;
    }

    // Mostrar vista de gráficos si está seleccionada
    if (currentView === 'charts') {
        return <AdminCharts onBack={() => setCurrentView('dashboard')} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
            {/* Modern Header with Glassmorphism */}
            <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        {/* Left side - Logo and Title */}
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                    Panel de Administración
                                </h1>
                                <p className="text-sm text-gray-500 font-medium">
                                    Viladomat Survey Analytics
                                </p>
                            </div>
                        </div>

                        {/* Center - Navigation */}
                        <nav className="hidden md:flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-blue-100 text-blue-700 shadow-sm"
                            >
                                <div className="flex items-center">
                                    <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z"
                                        />
                                    </svg>
                                    Dashboard
                                </div>
                            </button>
                            <button
                                onClick={() => setCurrentView('charts')}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <div className="flex items-center">
                                    <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                    Gráficos
                                </div>
                            </button>
                            <button
                                onClick={() => setCurrentView('data')}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <div className="flex items-center">
                                    <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                        />
                                    </svg>
                                    Datos
                                </div>
                            </button>
                        </nav>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-3">
                            {/* Status indicator */}
                            <div className="hidden sm:flex items-center text-xs text-gray-500">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                Actualizado:{' '}
                                {lastUpdated.toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>

                            {/* Refresh button */}
                            <button
                                onClick={fetchStats}
                                disabled={loading}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
                                title="Actualizar datos"
                            >
                                {loading ? (
                                    <div className="w-5 h-5">
                                        <LoadingSpinner />
                                    </div>
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                )}
                            </button>

                            {/* Logout button */}
                            <button
                                onClick={onLogout}
                                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Cerrar sesión"
                            >
                                <svg
                                    className="w-4 h-4 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                    />
                                </svg>
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-8">
                {stats && (
                    <div className="space-y-8">
                        {/* Métricas principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Total Encuestas */}
                            <div className="group relative bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                        <svg
                                                            className="w-6 h-6 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex-1">
                                                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                                        Total Encuestas
                                                    </p>
                                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                                        {formatNumber(stats.totalSurveys)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                                            <svg
                                                className="w-8 h-8 text-blue-500"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">
                                                    CSAT Promedio
                                                </dt>
                                                <dd
                                                    className={`text-lg font-medium ${getScoreColor(
                                                        stats.averageCsat,
                                                        5
                                                    )}`}
                                                >
                                                    {formatNumber(stats.averageCsat)}/5
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">
                                                    NPS Promedio
                                                </dt>
                                                <dd
                                                    className={`text-lg font-medium ${getScoreColor(
                                                        stats.averageNps,
                                                        10
                                                    )}`}
                                                >
                                                    {formatNumber(stats.averageNps)}/10
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="text-sm font-medium text-gray-500 truncate">
                                                    Total Vales
                                                </dt>
                                                <dd className="text-lg font-medium text-gray-900">
                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats.totalVoucherAmount)}
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gráficos y detalles */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Distribución tiempo de espera */}
                            <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Tiempo de Espera
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(stats.waitTimeDistribution).map(
                                        ([key, value]) => (
                                            <div key={key} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {waitTimeLabels[key]}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                                                        {value}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out group-hover:from-blue-600 group-hover:to-indigo-700"
                                                        style={{
                                                            width: `${
                                                                stats.totalSurveys > 0
                                                                    ? (value / stats.totalSurveys) *
                                                                      100
                                                                    : 0
                                                            }%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Estado de vales */}
                            <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Estado de Vales
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(stats.rewardDistribution).map(
                                        ([status, count]) => (
                                            <div key={status} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {status}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                                                        {count}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-1000 ease-out group-hover:from-green-600 group-hover:to-emerald-700"
                                                        style={{
                                                            width: `${
                                                                stats.totalSurveys > 0
                                                                    ? (count / stats.totalSurveys) *
                                                                      100
                                                                    : 0
                                                            }%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-200/60">
                                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                                        <span className="text-sm font-semibold text-gray-700">
                                            Tasa de éxito vales:
                                        </span>
                                        <span className="text-lg font-bold text-green-600">
                                            {formatPercentage(stats.rewardSuccessRate)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Métricas adicionales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Satisfacción del Vendedor */}
                            <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-8 hover:shadow-xl transition-all duration-300 text-center">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                                        <svg
                                            className="w-6 h-6 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Satisfacción del Vendedor
                                    </h3>
                                </div>
                                <div className="relative">
                                    <div className="mx-auto w-32 h-32 relative">
                                        <svg
                                            className="w-32 h-32 transform -rotate-90"
                                            viewBox="0 0 36 36"
                                        >
                                            <path
                                                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                fill="none"
                                                stroke="#e5e7eb"
                                                strokeWidth="3"
                                            />
                                            <path
                                                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                fill="none"
                                                stroke="url(#gradient-vendedor)"
                                                strokeWidth="3"
                                                strokeDasharray={`${
                                                    (stats.averageSalespersonRating / 5) * 100
                                                }, 100`}
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient
                                                    id="gradient-vendedor"
                                                    x1="0%"
                                                    y1="0%"
                                                    x2="100%"
                                                    y2="0%"
                                                >
                                                    <stop offset="0%" stopColor="#6366f1" />
                                                    <stop offset="100%" stopColor="#8b5cf6" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div
                                                    className={`text-3xl font-bold ${getScoreColor(
                                                        stats.averageSalespersonRating,
                                                        5
                                                    )}`}
                                                >
                                                    {formatNumber(stats.averageSalespersonRating)}
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium">
                                                    de 5
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Encontró Todo */}
                            <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-8 hover:shadow-xl transition-all duration-300 text-center">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-3">
                                        <svg
                                            className="w-6 h-6 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Encontró Todo
                                    </h3>
                                </div>
                                <div className="relative">
                                    <div className="mx-auto w-32 h-32 relative">
                                        <svg
                                            className="w-32 h-32 transform -rotate-90"
                                            viewBox="0 0 36 36"
                                        >
                                            <path
                                                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                fill="none"
                                                stroke="#e5e7eb"
                                                strokeWidth="3"
                                            />
                                            <path
                                                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                fill="none"
                                                stroke="url(#gradient-encontro)"
                                                strokeWidth="3"
                                                strokeDasharray={`${stats.foundEverythingPercentage}, 100`}
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient
                                                    id="gradient-encontro"
                                                    x1="0%"
                                                    y1="0%"
                                                    x2="100%"
                                                    y2="0%"
                                                >
                                                    <stop offset="0%" stopColor="#10b981" />
                                                    <stop offset="100%" stopColor="#0d9488" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div
                                                    className={`text-3xl font-bold ${getScoreColor(
                                                        stats.foundEverythingPercentage,
                                                        100
                                                    )}`}
                                                >
                                                    {formatPercentage(
                                                        stats.foundEverythingPercentage
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium">
                                                    satisfechos
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
