// Tipos simplificados para el schema optimizado de Prisma
import { Survey, SurveySubmission } from '@prisma/client';

// Exportar tipos base de Prisma
export type { Survey, SurveySubmission } from '@prisma/client';

// Tipos para crear nuevos registros (omitiendo campos auto-generados)
export type CreateSurveyData = Omit<Survey, 'id' | 'submittedAt'>;
export type CreateSurveySubmissionData = Omit<SurveySubmission, 'id' | 'createdAt'>;

// Tipos para actualizar registros
export type UpdateSurveyData = Partial<Omit<Survey, 'id' | 'ticketId' | 'submittedAt'>>;
export type UpdateSurveySubmissionData = Partial<
    Omit<SurveySubmission, 'id' | 'ticketId' | 'createdAt'>
>;

// Tipo para datos de entrada de la encuesta (desde el frontend)
export interface SurveyInput {
    ticketId: string;
    csat: number; // 1-5
    nps: number; // 0-10
    salespersonRating: number; // 1-5
    foundEverything: boolean;
    waitTime: 'less2' | '2to5' | '5to10' | 'more10';
    comment?: string;
    locale?: string;
    // Campos antifraude opcionales
    ipHash?: string;
    userAgent?: string;
}

// Tipo para actualizar información de recompensa (Vales)
export interface RewardUpdate {
    rewardStatus: string; // 'PROCESSED'|'NOT_ELIGIBLE'|'ERROR'|etc
    voucherId?: string;
    voucherAmount?: number;
    rewardProcessedAt: Date;
}

// Tipo para actualizar información de puntos
export interface PointsUpdate {
    pointsStatus: string; // 'PROCESSED'|'NOT_ELIGIBLE'|'ERROR'|etc
    pointsEarned?: number;
    pointsTotal?: number;
    pointsProcessedAt: Date;
}

// Estados de envío simplificados
export enum SubmissionStatus {
    COMPLETED = 'completed',
    FAILED = 'failed',
}

// Estadísticas básicas de encuestas
export interface SurveyStats {
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
    rewardDistribution: Record<string, number>;
    totalVoucherAmount: number | any;
    rewardSuccessRate: number;
    // Legacy
    pointsDistribution: Record<string, number>;
    totalPointsEarned: number | any;
    pointsSuccessRate: number;
}
