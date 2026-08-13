import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { SurveyService } from '@/lib/survey-service';

// Rate limiting simple en memoria (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const key = ip;

    const current = rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (current.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
    }

    current.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

export async function POST(request: NextRequest) {
    const requestId = nanoid(8);
    let ticket_id: string = '';
    let maskedTicketId: string = '';

    try {
        // Rate limiting per IP
        const ip =
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            console.log(`[${requestId}] ❌ Rate limit exceeded for IP: ${ip}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                },
                { status: 429 }
            );
        }

        console.log(`[${requestId}] ERP points request from IP: ${ip}`);

        const requestData = await request.json();
        ticket_id = requestData.ticket_id;

        if (!ticket_id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ticket_id is required',
                    code: 'MISSING_TICKET_ID',
                },
                { status: 400 }
            );
        }

        // Enmascarar ticket_id en logs
        maskedTicketId = ticket_id.length > 5 ? `${ticket_id.substring(0, 5)}...` : ticket_id;

        // URL i credencials de l'ERP
        const erpBaseUrl =
            process.env.ERP_API_BASE_URL || 'https://viladomat-test.cloud.openbravo.com/openbravo';
        const erpUser = process.env.ERP_API_USER;
        const erpPassword = process.env.ERP_API_PWD;
        const erpUrl = `${erpBaseUrl}/ws/EarnPoints`;

        console.log(`[${requestId}] 🎯 Calling ERP for ticket: ${maskedTicketId}`);
        console.log(
            `[${requestId}] 👤 ERP User: ${
                erpUser ? `${erpUser.substring(0, 3)}***` : 'NOT_DEFINED'
            }`
        );

        // Verificar que tenim les credencials
        if (!erpUser || !erpPassword) {
            throw new Error("ERP_API_USER i ERP_API_PWD són obligatoris per l'autenticació");
        }

        // Crida a l'ERP amb autenticació Basic Auth
        const response = await axios.post(
            erpUrl,
            { ticket_id },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: erpUser,
                    password: erpPassword,
                },
                // Afegir més headers si cal
                validateStatus: function (status) {
                    return status < 500; // Acceptar tots els codis < 500 per poder veure la resposta
                },
            }
        );

        console.log(`[${requestId}] ✅ ERP response status: ${response.status}`);

        // Validar i normalitzar la resposta de l'ERP
        const erpResponse = response.data;

        // Extreure code_message tant si ve a la arrel com dins de result
        const codeMessageFromResponse =
            erpResponse.code_message ?? erpResponse.result?.code_message;

        // Normalitzar la resposta de l'ERP assegurant-nos de preservar code_message si ve dins de result
        let normalizedResponse = { ...erpResponse, code_message: codeMessageFromResponse };

        // Si segueix sense code_message o està buit, inferir-lo
        if (!codeMessageFromResponse || codeMessageFromResponse === '') {
            console.log(`[${requestId}] ⚠️ ERP response without code_message, inferring...`);

            // Inferir code_message basant-se en altres camps
            if (erpResponse.result?.message) {
                if (
                    erpResponse.result.message.includes('not found') ||
                    erpResponse.result.message.includes('No results')
                ) {
                    normalizedResponse.code_message = 'NO_TICKET';
                } else {
                    normalizedResponse.code_message = 'NOT_ELIGIBLE';
                }
            } else if (!erpResponse.success) {
                normalizedResponse.code_message = 'NOT_ELIGIBLE';
            } else {
                normalizedResponse.code_message = 'PROCESSED';
            }

            // Assegurar-nos que té l'estructura completa
            normalizedResponse.result = {
                businessPartnerId: erpResponse.result?.businessPartnerId || '',
                totalpoints: erpResponse.result?.totalpoints || '0',
                earnedpoints: erpResponse.result?.earnedpoints || '0',
                details: erpResponse.result?.details || [],
                ...erpResponse.result,
            };

            console.log(
                `[${requestId}] ✅ Code message inferred: ${normalizedResponse.code_message}`
            );
        }

        console.log(
            `[${requestId}] ✅ Points processed for ticket: ${maskedTicketId}, code: ${normalizedResponse.code_message}`
        );

        // ÚNICA EXCEPCIÓN EN DEV: Saltarse el filtro temporal (EXPIRED)
        if (process.env.NODE_ENV === 'development' && normalizedResponse.code_message === 'EXPIRED') {
            console.log(`[${requestId}] 🔄 Dev Mode: Bypassing EXPIRED filter`);
            normalizedResponse.success = true;
            normalizedResponse.code_message = 'PROCESSED';
        }

        // Guardar información de puntos en la base de datos
        try {
            await SurveyService.updatePointsInfo(ticket_id, normalizedResponse);
            console.log(
                `[${requestId}] ✅ Points info saved to database for ticket: ${maskedTicketId}`
            );
        } catch (dbError) {
            console.warn(
                `[${requestId}] ⚠️ Error saving points info to database (non-critical):`,
                dbError
            );
        }

        return NextResponse.json({
            success: true,
            data: normalizedResponse,
            code: 'ERP_RESPONSE',
        });
    } catch (error: any) {
        console.error(`[${requestId}] ❌ ERP error:`, error.message);

        // Si l'error és per credencials mancants, ser més específic
        if (error.message?.includes('ERP_API_USER') || error.message?.includes('ERP_API_PWD')) {
            const errorResponse = {
                result: {
                    businessPartnerId: '',
                    totalpoints: '0',
                    earnedpoints: '0',
                    details: [],
                },
                success: false,
                code_message: 'ERROR' as const,
            };

            // Guardar información de error en la base de datos
            try {
                await SurveyService.updatePointsInfo(ticket_id, errorResponse);
                console.log(
                    `[${requestId}] ✅ Error points info saved to database for ticket: ${maskedTicketId}`
                );
            } catch (dbError) {
                console.warn(
                    `[${requestId}] ⚠️ Error saving error points info to database (non-critical):`,
                    dbError
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    data: errorResponse,
                    error: 'ERP credentials not configured',
                    code: 'ERP_CONFIG_ERROR',
                },
                { status: 500 }
            );
        }

        // En desenvolupament, retornar resposta simulada per altres errors
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${requestId}] 🔄 Development mode: simulating ERP response`);

            const simulatedResponse = {
                result: {
                    businessPartnerId: 'DEV_SIMULATION',
                    totalpoints: '10.40',
                    earnedpoints: '1.50',
                    details: [
                        {
                            description: 'Punts generats per enquesta (simulació)',
                            amt: 1.5,
                        },
                    ],
                },
                success: true,
                code_message: 'PROCESSED' as const,
            };

            // Guardar información simulada en la base de datos
            try {
                await SurveyService.updatePointsInfo(ticket_id, simulatedResponse);
                console.log(
                    `[${requestId}] ✅ Simulated points info saved to database for ticket: ${maskedTicketId}`
                );
            } catch (dbError) {
                console.warn(
                    `[${requestId}] ⚠️ Error saving simulated points info to database (non-critical):`,
                    dbError
                );
            }

            return NextResponse.json({
                success: true,
                data: simulatedResponse,
                code: 'DEV_SIMULATION',
            });
        }

        // Error real en producció
        const productionErrorResponse = {
            result: {
                businessPartnerId: '',
                totalpoints: '0',
                earnedpoints: '0',
                details: [],
            },
            success: false,
            code_message: 'ERROR' as const,
        };

        // Guardar información de error en la base de datos
        try {
            await SurveyService.updatePointsInfo(ticket_id, productionErrorResponse);
            console.log(
                `[${requestId}] ✅ Production error points info saved to database for ticket: ${maskedTicketId}`
            );
        } catch (dbError) {
            console.warn(
                `[${requestId}] ⚠️ Error saving production error points info to database (non-critical):`,
                dbError
            );
        }

        return NextResponse.json(
            {
                success: false,
                data: productionErrorResponse,
                error: 'ERP connection failed',
                code: 'ERP_ERROR',
            },
            { status: 500 }
        );
    }
}
