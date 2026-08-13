'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ChartData {
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

interface AdminChartsProps {
    onBack: () => void;
}

export default function AdminCharts({ onBack }: AdminChartsProps) {
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchChartData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'admin-key-2024',
                },
            });

            if (!response.ok) {
                throw new Error('Error al cargar datos de gráficos');
            }

            const data = await response.json();
            if (data.success) {
                setChartData(data.data);
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
        fetchChartData();
    }, []);

    const renderProgressRing = (
        percentage: number,
        size = 120,
        strokeWidth = 8,
        color = '#3B82F6'
    ) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <div className="relative inline-flex items-center justify-center">
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#E5E7EB"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-in-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">
                        {Math.round(percentage)}%
                    </span>
                </div>
            </div>
        );
    };

    const renderBarChart = (
        data: Record<string, number>,
        title: string,
        colors: string[] = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    ) => {
        const maxValue = Math.max(...Object.values(data));

        return (
            <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
                <div className="space-y-4">
                    {Object.entries(data).map(([key, value], index) => (
                        <div key={key} className="flex items-center">
                            <div className="w-20 text-sm text-gray-600 truncate">{key}</div>
                            <div className="flex-1 mx-4">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="h-4 rounded-full transition-all duration-1000 ease-in-out"
                                        style={{
                                            width: `${
                                                maxValue > 0 ? (value / maxValue) * 100 : 0
                                            }%`,
                                            backgroundColor: colors[index % colors.length],
                                        }}
                                    ></div>
                                </div>
                            </div>
                            <div className="w-12 text-sm font-medium text-gray-900 text-right">
                                {value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={fetchChartData}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (!chartData) return null;

    const waitTimeLabels: Record<string, string> = {
        less2: '< 2 min',
        '2to5': '2-5 min',
        '5to10': '5-10 min',
        more10: '> 10 min',
    };

    const formattedWaitTime = Object.entries(chartData.waitTimeDistribution).reduce(
        (acc, [key, value]) => {
            acc[waitTimeLabels[key] || key] = value;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
            {/* Modern Header with Glassmorphism */}
            <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        {/* Left side - Back button and Title */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            >
                                <svg
                                    className="w-5 h-5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                                Volver al Dashboard
                            </button>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center mr-3">
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
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                        Gráficos Avanzados
                                    </h1>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Visualización interactiva de datos
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={fetchChartData}
                                disabled={loading}
                                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 mr-2">
                                        <LoadingSpinner />
                                    </div>
                                ) : (
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
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                )}
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-8">
                <div className="space-y-8">
                    {/* Métricas circulares */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 text-center hover:shadow-xl transition-all duration-300">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">CSAT Score</h3>
                            {renderProgressRing(
                                (chartData.averageCsat / 5) * 100,
                                120,
                                8,
                                '#10B981'
                            )}
                            <p className="mt-2 text-sm text-gray-600">
                                {chartData.averageCsat.toFixed(1)}/5.0
                            </p>
                        </div>

                        <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 text-center hover:shadow-xl transition-all duration-300">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">NPS Score</h3>
                            {renderProgressRing(
                                (chartData.averageNps / 10) * 100,
                                120,
                                8,
                                '#3B82F6'
                            )}
                            <p className="mt-2 text-sm text-gray-600 font-medium">
                                {chartData.averageNps.toFixed(1)}/10.0
                            </p>
                        </div>

                        <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 text-center hover:shadow-xl transition-all duration-300">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Valoración Vendedor
                            </h3>
                            {renderProgressRing(
                                (chartData.averageSalespersonRating / 5) * 100,
                                120,
                                8,
                                '#F59E0B'
                            )}
                            <p className="mt-2 text-sm text-gray-600 font-medium">
                                {chartData.averageSalespersonRating.toFixed(1)}/5.0
                            </p>
                        </div>

                        <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-6 text-center hover:shadow-xl transition-all duration-300">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Encontró Todo</h3>
                            {renderProgressRing(
                                chartData.foundEverythingPercentage,
                                120,
                                8,
                                '#8B5CF6'
                            )}
                            <p className="mt-2 text-sm text-gray-600 font-medium">
                                {chartData.foundEverythingPercentage.toFixed(1)}% satisfechos
                            </p>
                        </div>
                    </div>

                    {/* Gráficos de barras */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {renderBarChart(formattedWaitTime, 'Distribución Tiempo de Espera')}
                        {renderBarChart(chartData.rewardDistribution, 'Estado de Vales / Recompensas', [
                            '#10B981',
                            '#EF4444',
                            '#F59E0B',
                            '#6B7280',
                        ])}
                    </div>

                    {/* Resumen de Recompensas */}
                    <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-8 hover:shadow-xl transition-all duration-300">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Resumen de Vales / Recompensas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">
                                    {chartData.totalVoucherAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </div>
                                <div className="text-sm text-gray-600">Total Importe en Vales</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {chartData.rewardSuccessRate.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Tasa de Éxito Vales</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-gray-900">
                                    {chartData.totalSurveys.toLocaleString('es-ES')}
                                </div>
                                <div className="text-sm text-gray-600">Total Encuestas</div>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de puntos (Legacy) */}
                    <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-8 hover:shadow-xl transition-all duration-300 opacity-60">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-gray-500">Resumen de Puntos (Legacy)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-gray-500">
                                    {chartData.totalPointsEarned.toLocaleString('es-ES')}
                                </div>
                                <div className="text-sm text-gray-600">Total Puntos Ganados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-gray-500">
                                    {chartData.pointsSuccessRate.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Tasa de Éxito Puntos</div>
                            </div>
                        </div>
                    </div>

                    {/* Indicadores de rendimiento */}
                    <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl border border-white/20 p-8 hover:shadow-xl transition-all duration-300">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">
                            Indicadores de Rendimiento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Satisfacción General
                                </h4>
                                <div className="flex items-center">
                                    <div className="flex-1">
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                                                style={{
                                                    width: `${(chartData.averageCsat / 5) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                        {((chartData.averageCsat / 5) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Recomendación (NPS)
                                </h4>
                                <div className="flex items-center">
                                    <div className="flex-1">
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                                                style={{
                                                    width: `${(chartData.averageNps / 10) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                        {((chartData.averageNps / 10) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
