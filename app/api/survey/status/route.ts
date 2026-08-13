import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { SurveyService } from '@/lib/survey-service';

export async function GET(request: NextRequest) {
    const requestId = nanoid(8);

    try {
        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticket_id');

        console.log(`[${requestId}] Survey status check request`);

        if (!ticketId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ticket_id parameter is required',
                    code: 'MISSING_TICKET_ID',
                },
                { status: 400 }
            );
        }

        // Enmascarar ticket_id en logs
        const maskedTicketId = ticketId.length > 5 ? `${ticketId.substring(0, 5)}...` : ticketId;
        console.log(`[${requestId}] Checking status for ticket: ${maskedTicketId}`);

        // Verificar si la encuesta existe en la base de datos
        const submission = await SurveyService.checkExistingSubmission(ticketId);

        let completedAt: string | undefined;
        if (submission.exists && submission.surveyId) {
            // Obtener la fecha de envío de la encuesta
            const survey = await SurveyService.getSurveyByTicketId(ticketId);
            completedAt = survey?.submittedAt.toISOString();
        }

        console.log(
            `[${requestId}] ✅ Status check completed for ticket: ${maskedTicketId}, exists: ${submission.exists}`
        );

        return NextResponse.json({
            success: true,
            data: {
                exists: submission.exists,
                completed: submission.completed,
                ...(completedAt && { completed_at: completedAt }),
            },
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ Survey status check error:`, error.message);
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
