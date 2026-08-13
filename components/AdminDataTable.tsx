'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface SurveyRecord {
    id: string;
    ticketId: string;
    csatScore: number;
    npsScore: number;
    salespersonRating: number;
    foundEverything: boolean;
    waitTimeRange: string;
    comment: string | null;
    submittedAt: string;
    pointsStatus: string | null;
    pointsEarned: number | null;
    rewardStatus: string | null;
    voucherId: string | null;
    voucherAmount: number | null;
}

interface AdminDataTableProps {
    onBack: () => void;
}

export default function AdminDataTable({ onBack }: AdminDataTableProps) {
    const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        minCsat: '',
        maxCsat: '',
        minNps: '',
        maxNps: '',
        rewardStatus: '',
        pointsStatus: '',
        dateFrom: '',
        dateTo: '',
    });

    const itemsPerPage = 20;

    const fetchSurveys = async (page = 1) => {
        try {
            setLoading(true);
            // Por ahora usamos una implementación mock, luego se puede crear un endpoint específico
            const response = await fetch(`/api/admin/surveys?page=${page}&limit=${itemsPerPage}`, {
                headers: {
                    'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'admin-key-2024',
                },
            });

            if (!response.ok) {
                throw new Error('Error al cargar datos');
            }

            const data = await response.json();
            if (data.success) {
                setSurveys(data.data.surveys);
                setTotalPages(Math.ceil(data.data.total / itemsPerPage));
                setError('');
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error de conexión');
            // Mock data para demostración
            const mockData = Array.from({ length: itemsPerPage }, (_, i) => ({
                id: `survey-${i + 1}`,
                ticketId: `TK${String(i + 1).padStart(6, '0')}`,
                csatScore: Math.floor(Math.random() * 5) + 1,
                npsScore: Math.floor(Math.random() * 11),
                salespersonRating: Math.floor(Math.random() * 5) + 1,
                foundEverything: Math.random() > 0.3,
                waitTimeRange: ['less2', '2to5', '5to10', 'more10'][Math.floor(Math.random() * 4)],
                comment: Math.random() > 0.5 ? 'Comentario de ejemplo del cliente' : null,
                submittedAt: new Date(
                    Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                pointsStatus: ['PROCESSED', 'ERROR', 'NOT_ELIGIBLE'][Math.floor(Math.random() * 3)],
                pointsEarned: Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 10 : null,
                rewardStatus: ['PROCESSED', 'ERROR'][Math.floor(Math.random() * 2)],
                voucherId: Math.random() > 0.3 ? `V-${i + 1}-Q` : null,
                voucherAmount: Math.random() > 0.3 ? 5.00 : null,
            }));
            setSurveys(mockData);
            setTotalPages(5);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurveys(currentPage);
    }, [currentPage]);

    const exportToCSV = () => {
        const headers = [
            'ID Ticket',
            'CSAT',
            'NPS',
            'Valoración Vendedor',
            'Encontró Todo',
            'Tiempo Espera',
            'Comentario',
            'Fecha Envío',
            'Estado Vale',
            'Importe Vale',
            'Codi Vale',
            'Estado Puntos',
            'Puntos Ganados',
        ];

        const csvContent = [
            headers.join(','),
            ...surveys.map((survey) =>
                [
                    survey.ticketId,
                    survey.csatScore,
                    survey.npsScore,
                    survey.salespersonRating,
                    survey.foundEverything ? 'Sí' : 'No',
                    survey.waitTimeRange,
                    survey.comment ? `"${survey.comment.replace(/"/g, '""')}"` : '',
                    new Date(survey.submittedAt).toLocaleDateString('es-ES'),
                    survey.rewardStatus || '',
                    survey.voucherAmount || '',
                    survey.voucherId || '',
                    survey.pointsStatus || '',
                    survey.pointsEarned || '',
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `encuestas-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const waitTimeLabels: Record<string, string> = {
        less2: '< 2min',
        '2to5': '2-5min',
        '5to10': '5-10min',
        more10: '> 10min',
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'PROCESSED':
                return 'bg-green-100 text-green-800';
            case 'ERROR':
                return 'bg-red-100 text-red-800';
            case 'NOT_ELIGIBLE':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

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
                                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mr-3">
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
                                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                        Datos Detallados
                                    </h1>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Vista completa de encuestas
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={exportToCSV}
                                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
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
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Exportar CSV
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <div className="text-red-600 mb-4">{error}</div>
                        <button
                            onClick={() => fetchSurveys(currentPage)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filtros */}
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
                                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Filtros</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CSAT Mínimo
                                    </label>
                                    <select
                                        value={filters.minCsat}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                minCsat: e.target.value,
                                            }))
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="1">1+</option>
                                        <option value="2">2+</option>
                                        <option value="3">3+</option>
                                        <option value="4">4+</option>
                                        <option value="5">5</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        NPS Mínimo
                                    </label>
                                    <select
                                        value={filters.minNps}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                minNps: e.target.value,
                                            }))
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="0">0+</option>
                                        <option value="6">6+ (Pasivos)</option>
                                        <option value="9">9+ (Promotores)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado Puntos
                                    </label>
                                    <select
                                        value={filters.pointsStatus}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                pointsStatus: e.target.value,
                                            }))
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="PROCESSED">Procesados</option>
                                        <option value="ERROR">Error</option>
                                        <option value="NOT_ELIGIBLE">No Elegible</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado Vale
                                    </label>
                                    <select
                                        value={filters.rewardStatus}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                rewardStatus: e.target.value,
                                            }))
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="PROCESSED">Procesados</option>
                                        <option value="ERROR">Error</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                dateFrom: e.target.value,
                                            }))
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <button
                                    onClick={() => {
                                        setFilters({
                                            minCsat: '',
                                            maxCsat: '',
                                            minNps: '',
                                            maxNps: '',
                                            rewardStatus: '',
                                            pointsStatus: '',
                                            dateFrom: '',
                                            dateTo: '',
                                        });
                                        setCurrentPage(1);
                                        fetchSurveys(1);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Limpiar Filtros
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentPage(1);
                                        fetchSurveys(1);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                                >
                                    Aplicar Filtros
                                </button>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="bg-white/70 backdrop-blur-sm shadow-lg overflow-hidden rounded-2xl border border-white/20">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200/60">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Ticket
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                CSAT
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                NPS
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vendedor
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Encontró
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Espera
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vale / Recompensa
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Puntos (Legacy)
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Fecha
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {surveys.map((survey) => (
                                            <tr key={survey.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {survey.ticketId}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            survey.csatScore >= 4
                                                                ? 'bg-green-100 text-green-800'
                                                                : survey.csatScore >= 3
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {survey.csatScore}/5
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            survey.npsScore >= 8
                                                                ? 'bg-green-100 text-green-800'
                                                                : survey.npsScore >= 6
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {survey.npsScore}/10
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {survey.salespersonRating}/5
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            survey.foundEverything
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {survey.foundEverything ? 'Sí' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {waitTimeLabels[survey.waitTimeRange] ||
                                                        survey.waitTimeRange}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-1 ${getStatusColor(
                                                                survey.rewardStatus
                                                            )}`}
                                                        >
                                                            {survey.rewardStatus || 'N/A'}
                                                        </span>
                                                        {survey.voucherId && (
                                                            <span className="text-xs font-mono text-gray-600">
                                                                {survey.voucherId} ({survey.voucherAmount}€)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-1 ${getStatusColor(
                                                                survey.pointsStatus
                                                            )}`}
                                                        >
                                                            {survey.pointsStatus || 'N/A'}
                                                        </span>
                                                        {survey.pointsEarned && (
                                                            <span className="text-xs text-gray-600">
                                                                {survey.pointsEarned} pts
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(
                                                        survey.submittedAt
                                                    ).toLocaleDateString('es-ES')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Paginación */}
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() =>
                                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Mostrando página{' '}
                                        <span className="font-medium">{currentPage}</span> de{' '}
                                        <span className="font-medium">{totalPages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() =>
                                                setCurrentPage(Math.max(1, currentPage - 1))
                                            }
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <svg
                                                className="h-5 w-5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() =>
                                                setCurrentPage(
                                                    Math.min(totalPages, currentPage + 1)
                                                )
                                            }
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <svg
                                                className="h-5 w-5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
