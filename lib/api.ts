import axios from 'axios';
import {
    SurveyData,
    TokenValidation,
    TokenInvalidReason,
    SurveyStatus,
    ApiResponse,
    GiftCardResponse,
    EarnPointsResponse,
    APP_CONFIG,
} from './types';

// Configuració de l'API client
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    timeout: APP_CONFIG.API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor per gestionar errors globals
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);

        // Gestió específica d'errors
        if (error.response?.status === 409) {
            const conflictError = new Error(
                error.response?.data?.error || 'Resource already exists'
            );
            (conflictError as ApiError).status = 409;
            (conflictError as ApiError).code = error.response?.data?.code;
            throw conflictError;
        }

        // Conservar status i codi per poder distingir el tipus d'error (ex: 429 antifrau)
        const apiError = new Error(
            error.response?.data?.message || error.response?.data?.error || 'Network error'
        ) as ApiError;
        apiError.status = error.response?.status;
        apiError.code = error.response?.data?.code;
        throw apiError;
    }
);

interface ApiError extends Error {
    status?: number;
    code?: string;
}

/**
 * Simulació de validació local per desenvolupament
 * (En producció aquest mètode no seria necessari)
 */
export function validateTokenLocally(token: string): TokenValidation {
    try {
        // Decodificar un JWT simple (això és només per desenvolupament)
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false };
        }

        // Decodificar el payload (intentem base64 estàndard per al navegador)
        let payload;
        try {
            // En el navegador usem atob, però el base64url pot tenir caràcters diferents
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            payload = JSON.parse(atob(base64));
        } catch (e) {
            console.error('Error decoding local token:', e);
            return { valid: false };
        }

        // Verificar que tingui els camps obligatoris
        if (!payload.ticket_id) {
            console.log('❌ Token sense ticket_id');
            return { valid: false };
        }

        return {
            valid: true,
            ticket_id: payload.ticket_id,
        };
    } catch (error) {
        console.error('Local token validation failed:', error);
        return { valid: false };
    }
}

/**
 * Valida un token JWT
 */
export async function validateToken(token: string): Promise<TokenValidation> {
    try {
        // En desenvolupament, acceptar token placeholder
        if (process.env.NODE_ENV === 'development') {
            // Token placeholder per desenvolupament
            if (token === 'dev-token' || token === 'test' || token === 'placeholder') {
                console.log('✅ Token placeholder de desenvolupament acceptat');
                return {
                    valid: true,
                    ticket_id: 'DEV_TICKET_12345',
                };
            }

            // Intentar validació local de JWT
            const localValidation = validateTokenLocally(token);
            if (localValidation.valid) {
                console.log('✅ Token JWT vàlid (desenvolupament):', localValidation);
                return localValidation;
            }
        }

        const response = await apiClient.get<ApiResponse<TokenValidation>>(
            `/validate-token?t=${encodeURIComponent(token)}`
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Invalid token response');
    } catch (error: any) {
        console.error('Token validation failed:', error);

        // Fallback complet en desenvolupament
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Mode desenvolupament: acceptant qualsevol token com a vàlid');
            return {
                valid: true,
                ticket_id: `DEV_FALLBACK_${Date.now()}`,
            };
        }

        // Determinar el motiu per mostrar el missatge correcte a l'usuari
        let reason: TokenInvalidReason = 'invalid';
        if (error?.status === 429 || error?.code === 'SUSPICIOUS_ACTIVITY') {
            reason = 'rate_limited';
        } else if (error?.status === undefined) {
            // Sense resposta del servidor (timeout, sense connexió, etc.)
            reason = 'network';
        }

        return { valid: false, reason };
    }
}

/**
 * Comprova si ja existeix una resposta per al ticket
 */
export async function checkSurveyStatus(ticketId: string): Promise<SurveyStatus> {
    try {
        const response = await apiClient.get<ApiResponse<SurveyStatus>>(
            `/survey/status?ticket_id=${encodeURIComponent(ticketId)}`
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        return { exists: false };
    } catch (error) {
        console.error('Survey status check failed:', error);

        // En desenvolupament, simular que no existeix mai
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Mode desenvolupament: simulant enquesta no existent');
            return { exists: false };
        }

        return { exists: false };
    }
}

/**
 * Envia les respostes de l'enquesta
 */
export async function submitSurvey(
    surveyData: SurveyData,
    token?: string,
    recaptchaToken?: string
): Promise<void> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Afegir token JWT si està disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Afegir token reCAPTCHA si està disponible
        if (recaptchaToken) {
            headers['X-Recaptcha-Token'] = recaptchaToken;
        }

        const response = await apiClient.post<ApiResponse>('/survey', surveyData, { headers });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Survey submission failed');
        }
    } catch (error: any) {
        console.error('Survey submission failed:', error);

        // Si és un error 409 (ja existeix), llançar error específic
        if (
            error.message?.includes('already exists') ||
            error.message?.includes('already submitted')
        ) {
            console.log('ℹ️ Enquesta ja enviada anteriorment');
            throw new Error('SURVEY_ALREADY_SUBMITTED');
        }

        // En desenvolupament, simular èxit per altres errors
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Mode desenvolupament: simulant enviament exitós');
            console.log('📊 Dades enviades:', surveyData);
            return; // Simular èxit
        }

        throw error;
    }
}

/**
 * Genera un vale de descuento para el cliente después de completar la encuesta
 */
export async function generateVoucher(ticketId: string): Promise<GiftCardResponse> {
    try {
        console.log('🎯 Cridant API interna per generar vale:', ticketId);

        // Cridar la nostra API interna que fa de proxy cap a l'ERP
        const response = await apiClient.post<{
            success: boolean;
            data: GiftCardResponse;
            code: string;
        }>('/generate-voucher', {
            ticket_id: ticketId,
        });

        const voucherData = response.data.data;
        console.log('📊 ERP voucher response data:', JSON.stringify(voucherData, null, 2));
        return voucherData;
    } catch (error) {
        console.error('Generate voucher failed:', error);

        // Retornar resposta d'error per mostrar a la UI
        return {
            result: {
                voucherIssued: false,
                voucherId: '',
                amount: 0,
                code_message: 'ERROR',
            },
            success: false,
            code_message: 'ERROR',
        };
    }
}

/**
 * Afegeix punts al client després de completar l'enquesta
 * @deprecated Use generateVoucher instead
 */
export async function earnPoints(ticketId: string): Promise<EarnPointsResponse> {
    try {
        console.log('🎯 Cridant API interna per afegir punts (legacy):', ticketId);

        // Redirigir a generateVoucher y adaptar respuesta para compatibilidad si es necesario
        const response = await generateVoucher(ticketId);
        
        return {
            result: {
                businessPartnerId: 'LEGACY',
                totalpoints: '0',
                earnedpoints: response.result.amount.toString(),
                details: [],
            },
            success: response.success,
            code_message: response.code_message as any,
        };
    } catch (error) {
        console.error('Earn points failed:', error);
        return {
            result: {
                businessPartnerId: 'ERROR',
                totalpoints: '0',
                earnedpoints: '0',
                details: [],
            },
            success: false,
            code_message: 'ERROR',
        };
    }
}
