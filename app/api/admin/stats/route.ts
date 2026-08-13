import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { SurveyService } from '@/lib/survey-service';

export async function GET(request: NextRequest) {
    const requestId = nanoid(8);

    try {
        console.log(`[${requestId}] Admin stats request`);

        // Verificar API key per seguretat (opcional)
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

        // Obtenir estadístiques completes
        const stats = await SurveyService.getStats();

        console.log(
            `[${requestId}] ✅ Stats retrieved: ${stats.totalSurveys} surveys, ${stats.totalPointsEarned} points earned`
        );

        return NextResponse.json({
            success: true,
            data: stats,
            code: 'STATS_RETRIEVED',
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ Stats error:`, error.message);
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
