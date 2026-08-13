export interface SurveyData {
    ticket_id: string;
    customer_id?: string;
    answers: {
        csat: number; // 1-5
        nps: number; // 0-10
        salesperson_rating: number; // 1-5
        found_everything: boolean;
        wait_time: 'less2' | '2to5' | '5to10' | 'more10';
        comment?: string; // max 250 chars
    };
    timestamp: string;
}

export type TokenInvalidReason = 'invalid' | 'rate_limited' | 'network';

export interface TokenValidation {
    valid: boolean;
    ticket_id?: string;
    // Motiu del fracàs quan valid === false, per mostrar el missatge adequat
    reason?: TokenInvalidReason;
}

export interface SurveyStatus {
    exists: boolean;
    completed_at?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Interfícies per l'API d'ERP (GiftCardSurvey)
export interface GiftCardResult {
    voucherIssued: boolean;
    voucherId: string;
    amount: number;
    code_message: string;
}

export interface GiftCardResponse {
    result: GiftCardResult;
    success: boolean;
    code_message?: string; // Para compatibilidad con el manejador de errores
}

// Interfícies per l'API d'ERP (EarnPoints - Mantingut per retrocompatibilitat)
export interface EarnPointsDetail {
    description: string;
    amt: number;
}

export interface EarnPointsResult {
    businessPartnerId: string;
    totalpoints: string;
    earnedpoints: string;
    details: EarnPointsDetail[];
}

export interface EarnPointsResponse {
    result: EarnPointsResult;
    success: boolean;
    code_message?:
        | 'PROCESSED'
        | 'ALREADY_PROCESSED'
        | 'NOT_ELIGIBLE'
        | 'NO_TICKET'
        | 'CANCELED_OR_RETURNED'
        | 'EXPIRED'
        | 'ERROR';
    purchase_datetime?: string;
}

// Configuració de timeouts
export const APP_CONFIG = {
    SESSION_TIMEOUT: 5 * 60 * 1000, // 5 minuts
    API_TIMEOUT: 10000, // 10 segons
    MAX_COMMENT_LENGTH: 250,
} as const;

export type Locale = 'ca' | 'es' | 'en' | 'fr';
export type WaitTimeOption = 'less2' | '2to5' | '5to10' | 'more10';

// Mapeo para convertir entre UI y Prisma enum
export const WAIT_TIME_MAPPING = {
    less2: 'less2',
    '2to5': 'to5',
    '5to10': 'to10',
    more10: 'more10',
} as const;
