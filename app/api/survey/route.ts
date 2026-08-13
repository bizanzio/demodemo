import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { jwtVerify } from 'jose';
import { SurveyData } from '@/lib/types';
import { SurveyService } from '@/lib/survey-service';
import { verifyRecaptcha, getRecaptchaAction } from '@/lib/recaptcha';
import { headers } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

export async function POST(request: NextRequest) {
    const requestId = nanoid(8);
    let maskedTicketId = 'unknown'; // Inicializar fuera del try para que esté disponible en catch

    try {
        console.log(`[${requestId}] Survey submission request`);

        const surveyData: SurveyData = await request.json();

        // Validar datos obligatorios
        if (!surveyData.ticket_id || !surveyData.answers) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: ticket_id, answers',
                    code: 'MISSING_FIELDS',
                },
                { status: 400 }
            );
        }

        // Enmascarar ticket_id en logs
        maskedTicketId =
            surveyData.ticket_id.length > 5
                ? `${surveyData.ticket_id.substring(0, 5)}...`
                : surveyData.ticket_id;
        console.log(`[${requestId}] Processing survey for ticket: ${maskedTicketId}`);

        // Validar token JWT en header Authorization
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const { payload } = await jwtVerify(token, JWT_SECRET, {
                    algorithms: ['HS256'],
                    audience: 'vl-survey',
                    issuer: 'vl-survey-system',
                });

                // Verificar que el ticket_id del token coincideix amb el de les dades
                if (payload.ticket_id !== surveyData.ticket_id) {
                    console.log(`[${requestId}] ❌ Token ticket_id mismatch`);
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Token and data ticket_id mismatch',
                            code: 'TOKEN_MISMATCH',
                        },
                        { status: 401 }
                    );
                }

                console.log(`[${requestId}] ✅ JWT validated for survey submission`);
            } catch (jwtError) {
                console.log(`[${requestId}] ❌ JWT verification failed in survey: ${jwtError}`);

                // En desenvolupament, permetre continuar sense JWT vàlid
                if (process.env.NODE_ENV !== 'development') {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Invalid authorization token',
                            code: 'INVALID_AUTH',
                        },
                        { status: 401 }
                    );
                }
                console.log(`[${requestId}] 🔄 Development mode: continuing without valid JWT`);
            }
        } else if (process.env.NODE_ENV !== 'development') {
            // En producció, exigir token JWT
            console.log(`[${requestId}] ❌ Missing authorization header`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authorization token required',
                    code: 'MISSING_AUTH',
                },
                { status: 401 }
            );
        }

        // Verificar reCAPTCHA v3
        const recaptchaToken = request.headers.get('x-recaptcha-token');
        if (recaptchaToken) {
            const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'survey_submit');

            if (!recaptchaResult.success) {
                console.log(
                    `[${requestId}] ❌ reCAPTCHA verification failed: ${recaptchaResult.error}`
                );
                return NextResponse.json(
                    {
                        success: false,
                        error: 'reCAPTCHA verification failed',
                        code: 'RECAPTCHA_FAILED',
                    },
                    { status: 400 }
                );
            }

            const action = getRecaptchaAction(recaptchaResult.score);
            console.log(
                `[${requestId}] 🤖 reCAPTCHA score: ${recaptchaResult.score}, action: ${action.action}`
            );

            if (action.action === 'block') {
                console.log(
                    `[${requestId}] 🚫 Blocked due to low reCAPTCHA score: ${recaptchaResult.score}`
                );
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Request blocked due to suspicious activity',
                        code: 'SUSPICIOUS_ACTIVITY',
                    },
                    { status: 429 }
                );
            }

            if (action.action === 'challenge') {
                // En el futur, podríem mostrar un CAPTCHA explícit
                console.log(
                    `[${requestId}] ⚠️ Low reCAPTCHA score, but allowing: ${recaptchaResult.score}`
                );
            }
        } else if (process.env.NODE_ENV === 'production') {
            // En producció, exigir reCAPTCHA
            console.log(`[${requestId}] ❌ Missing reCAPTCHA token in production`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'reCAPTCHA token required',
                    code: 'MISSING_RECAPTCHA',
                },
                { status: 400 }
            );
        }

        // Validar estructura de las respuestas
        const { answers } = surveyData;
        if (
            typeof answers.csat !== 'number' ||
            answers.csat < 1 ||
            answers.csat > 5 ||
            typeof answers.nps !== 'number' ||
            answers.nps < 0 ||
            answers.nps > 10 ||
            typeof answers.salesperson_rating !== 'number' ||
            answers.salesperson_rating < 1 ||
            answers.salesperson_rating > 5 ||
            typeof answers.found_everything !== 'boolean' ||
            !['less2', '2to5', '5to10', 'more10'].includes(answers.wait_time)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid answer values',
                },
                { status: 400 }
            );
        }

        // Validar comentario (opcional)
        if (answers.comment && answers.comment.length > 250) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Comment exceeds maximum length of 250 characters',
                },
                { status: 400 }
            );
        }

        // Obtener locale del header Accept-Language si está disponible
        const headersList = await headers();
        const acceptLanguage = headersList.get('accept-language');
        const locale = acceptLanguage?.split(',')[0]?.split('-')[0] || undefined;

        // Obtenir IP i User-Agent per tracking antifraude
        const ip =
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || undefined;

        // Convertir datos al formato de entrada del servicio
        const surveyInput = SurveyService.mapSurveyDataToInput(surveyData);
        surveyInput.locale = locale;
        surveyInput.ipHash = ip !== 'unknown' ? ip : undefined;
        surveyInput.userAgent = userAgent;

        // Guardar en base de datos con control de idempotencia
        const survey = await SurveyService.createSurvey(surveyInput);

        console.log(
            `[${requestId}] ✅ Survey submitted successfully for ticket: ${maskedTicketId}, surveyId: ${survey.id}`
        );

        return NextResponse.json({
            success: true,
            message: 'Survey submitted successfully',
            code: 'SUBMITTED',
            data: {
                surveyId: survey.id,
                submittedAt: survey.submittedAt,
            },
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ Survey submission error:`, error.message);

        // Manejar error de duplicado específicamente
        if (error instanceof Error && error.message.includes('already submitted')) {
            console.log(
                `[${requestId}] ⚠️ Duplicate submission attempt for ticket: ${maskedTicketId}`
            );
            return NextResponse.json(
                {
                    success: false,
                    error: 'Survey already submitted for this ticket',
                    code: 'DUPLICATE_SUBMISSION',
                },
                { status: 409 }
            );
        }

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
