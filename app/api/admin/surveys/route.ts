import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const requestId = nanoid(8);

    try {
        console.log(`[${requestId}] Admin surveys request`);

        // Verificar API key por seguridad
        const apiKey = request.headers.get('x-api-key');
        if (process.env.ADMIN_API_KEY && apiKey !== process.env.ADMIN_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    code: 'INVALID_API_KEY',
                },
                { status: 401 }
            );
        }

        // Obtener parámetros de paginación
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Filtros opcionales
        const minCsat = url.searchParams.get('minCsat');
        const maxCsat = url.searchParams.get('maxCsat');
        const minNps = url.searchParams.get('minNps');
        const maxNps = url.searchParams.get('maxNps');
        const rewardStatus = url.searchParams.get('rewardStatus');
        const pointsStatus = url.searchParams.get('pointsStatus');
        const dateFrom = url.searchParams.get('dateFrom');
        const dateTo = url.searchParams.get('dateTo');

        // Construir filtros
        const where: any = {};

        if (minCsat) where.csatScore = { ...where.csatScore, gte: parseInt(minCsat) };
        if (maxCsat) where.csatScore = { ...where.csatScore, lte: parseInt(maxCsat) };
        if (minNps) where.npsScore = { ...where.npsScore, gte: parseInt(minNps) };
        if (maxNps) where.npsScore = { ...where.npsScore, lte: parseInt(maxNps) };
        if (dateFrom) where.submittedAt = { ...where.submittedAt, gte: new Date(dateFrom) };
        if (dateTo) where.submittedAt = { ...where.submittedAt, lte: new Date(dateTo) };

        // Obtener encuestas con información de puntos
        const [surveys, total] = await Promise.all([
            prisma.survey.findMany({
                where,
                include: {
                    submission: {
                        select: {
                            rewardStatus: true,
                            voucherId: true,
                            voucherAmount: true,
                            rewardProcessedAt: true,
                            pointsStatus: true,
                            pointsEarned: true,
                            pointsTotal: true,
                            pointsProcessedAt: true,
                        },
                    },
                },
                orderBy: { submittedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.survey.count({ where }),
        ]);

        // Formatear datos para la respuesta
        const formattedSurveys = surveys.map((survey) => ({
            id: survey.id,
            ticketId: survey.ticketId,
            csatScore: survey.csatScore,
            npsScore: survey.npsScore,
            salespersonRating: survey.salespersonRating,
            foundEverything: survey.foundEverything,
            waitTimeRange: survey.waitTimeRange,
            comment: survey.comment,
            submittedAt: survey.submittedAt.toISOString(),
            rewardStatus: survey.submission?.rewardStatus || null,
            voucherId: survey.submission?.voucherId || null,
            voucherAmount: survey.submission?.voucherAmount
                ? Number(survey.submission.voucherAmount)
                : null,
            rewardProcessedAt: survey.submission?.rewardProcessedAt?.toISOString() || null,
            pointsStatus: survey.submission?.pointsStatus || null,
            pointsEarned: survey.submission?.pointsEarned
                ? Number(survey.submission.pointsEarned)
                : null,
            pointsTotal: survey.submission?.pointsTotal
                ? Number(survey.submission.pointsTotal)
                : null,
            pointsProcessedAt: survey.submission?.pointsProcessedAt?.toISOString() || null,
        }));

        console.log(`[${requestId}] ✅ Surveys retrieved: ${surveys.length} of ${total} total`);

        return NextResponse.json({
            success: true,
            data: {
                surveys: formattedSurveys,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            code: 'SURVEYS_RETRIEVED',
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ Surveys error:`, error.message);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
            },
            { status: 500 }
        );
    }
}


