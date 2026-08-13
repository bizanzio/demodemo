// Servicio optimizado para gestionar encuestas con Prisma
import { prisma } from './prisma';
import { SurveyInput, SubmissionStatus, PointsUpdate } from './db-types';
import { SurveyData, EarnPointsResponse, GiftCardResponse, WAIT_TIME_MAPPING } from './types';
import { createHash } from 'crypto';

export class SurveyService {
    // Verificar si ya existe una encuesta para un ticket (idempotencia)
    static async checkExistingSubmission(ticketId: string) {
        const existing = await prisma.surveySubmission.findUnique({
            where: { ticketId },
            include: { survey: true },
        });

        // Excepción para NO_TICKET: si una encuesta fue creada antes de que el ticket existiera
        // en el ERP (pointsStatus = 'NO_TICKET'), permitir crear una nueva encuesta cuando
        // el ticket real esté disponible
        const isNoTicketException = existing?.pointsStatus === 'NO_TICKET';

        return {
            exists: !!existing && !isNoTicketException,
            completed: existing?.status === SubmissionStatus.COMPLETED && !isNoTicketException,
            surveyId: existing?.surveyId || undefined,
        };
    }

    // Crear una nueva encuesta con control de idempotencia
    static async createSurvey(data: SurveyInput) {
        // Verificar idempotencia primero
        const existing = await this.checkExistingSubmission(data.ticketId);

        if (existing.exists) {
            throw new Error('Survey already submitted for this ticket');
        }

        // Verificar si existe una entrada NO_TICKET que necesitamos actualizar
        const noTicketSubmission = await prisma.surveySubmission.findUnique({
            where: { ticketId: data.ticketId },
            include: { survey: true },
        });

        const isUpdatingNoTicket = noTicketSubmission?.pointsStatus === 'NO_TICKET';

        // Generar hash de IP si está disponible
        const ipHash = data.ipHash ? createHash('sha256').update(data.ipHash).digest('hex') : null;

        // Usar transacción para atomicidad
        const result = await prisma.$transaction(async (tx) => {
            let survey;

            if (isUpdatingNoTicket && noTicketSubmission.survey) {
                // Actualizar la encuesta existente con los nuevos datos
                survey = await tx.survey.update({
                    where: { id: noTicketSubmission.survey.id },
                    data: {
                        csatScore: data.csat,
                        npsScore: data.nps,
                        salespersonRating: data.salespersonRating,
                        foundEverything: data.foundEverything,
                        waitTimeRange: WAIT_TIME_MAPPING[data.waitTime],
                        comment: data.comment || null,
                        locale: data.locale || null,
                        ipHash: ipHash,
                        userAgent: data.userAgent || null,
                        submittedAt: new Date(), // Actualizar timestamp
                    },
                });

                // Resetear el estado de puntos para que se procese de nuevo
                await tx.surveySubmission.update({
                    where: { id: noTicketSubmission.id },
                    data: {
                        status: SubmissionStatus.COMPLETED,
                        pointsStatus: null,
                        pointsEarned: null,
                        pointsTotal: null,
                        pointsProcessedAt: null,
                    },
                });
            } else {
                // 1. Crear nueva encuesta
                survey = await tx.survey.create({
                    data: {
                        ticketId: data.ticketId,
                        csatScore: data.csat,
                        npsScore: data.nps,
                        salespersonRating: data.salespersonRating,
                        foundEverything: data.foundEverything,
                        waitTimeRange: WAIT_TIME_MAPPING[data.waitTime],
                        comment: data.comment || null,
                        locale: data.locale || null,
                        ipHash: ipHash,
                        userAgent: data.userAgent || null,
                    },
                });

                // 2. Crear registro de idempotencia
                await tx.surveySubmission.create({
                    data: {
                        ticketId: data.ticketId,
                        surveyId: survey.id,
                        status: SubmissionStatus.COMPLETED,
                    },
                });
            }

            return survey;
        });

        return result;
    }

    // Actualizar información de recompensa (Vales) después del procesamiento ERP
    static async updateRewardInfo(ticketId: string, rewardData: GiftCardResponse) {
        console.log('🔍 updateRewardInfo received data:', JSON.stringify(rewardData, null, 2));

        const voucherId = rewardData.result?.voucherId || null;
        const voucherAmount = rewardData.result?.amount || null;
        const rewardStatus = rewardData.result?.code_message || (rewardData.success ? 'PROCESSED' : 'ERROR');

        await prisma.surveySubmission.update({
            where: { ticketId },
            data: {
                rewardStatus: rewardStatus,
                voucherId: voucherId,
                voucherAmount: voucherAmount,
                rewardProcessedAt: new Date(),
            },
        });

        console.log(
            `✅ Reward info updated for ticket: ${ticketId.substring(0, 5)}..., status: ${rewardStatus}`
        );
    }

    // Actualizar información de puntos después del procesamiento ERP (Mantenido por retrocompatibilidad)
    static async updatePointsInfo(ticketId: string, pointsData: EarnPointsResponse) {
        // Añadir logging para depuración
        console.log('🔍 updatePointsInfo received data:', JSON.stringify(pointsData, null, 2));

        const pointsEarned = pointsData.result?.earnedpoints
            ? parseFloat(pointsData.result.earnedpoints)
            : null;
        const pointsTotal = pointsData.result?.totalpoints
            ? parseFloat(pointsData.result.totalpoints)
            : null;

        // Asegurarnos de que code_message siempre tenga un valor válido
        // Implementación robusta para determinar el status correcto
        let pointsStatus: string;

        // 1. Verificar si code_message existe directamente en el objeto
        if (pointsData.code_message && typeof pointsData.code_message === 'string') {
            pointsStatus = pointsData.code_message;
            console.log('✅ Using direct code_message:', pointsStatus);
        }
        // 2. Si no existe, inferir basado en el estado de success y otros datos
        else {
            if (pointsData.success === true) {
                pointsStatus = 'PROCESSED';
            } else if (pointsData.success === false) {
                pointsStatus = 'ERROR';
            } else {
                pointsStatus = 'UNKNOWN';
            }
            console.log('⚠️ Inferred code_message:', pointsStatus);
        }

        // Asegurar que nunca sea undefined o null
        if (!pointsStatus) {
            pointsStatus = 'UNKNOWN';
            console.warn('⚠️ Using fallback UNKNOWN status');
        }

        await prisma.surveySubmission.update({
            where: { ticketId },
            data: {
                pointsStatus: pointsStatus,
                pointsEarned: pointsEarned,
                pointsTotal: pointsTotal,
                pointsProcessedAt: new Date(),
            },
        });

        console.log(
            `✅ Points info updated for ticket: ${ticketId.substring(
                0,
                5
            )}..., status: ${pointsStatus}, earned: ${pointsEarned}`
        );
    }

    // Obtener una encuesta por ticket ID
    static async getSurveyByTicketId(ticketId: string) {
        return await prisma.survey.findUnique({
            where: { ticketId },
        });
    }

    // Obtener estadísticas básicas incluyendo información de recompensas
    static async getStats() {
        const [
            totalSurveys,
            avgCsat,
            avgNps,
            avgSalesperson,
            foundEverythingCount,
            waitTimeStats,
            rewardStats,
            totalVoucherAmount,
            // Mantener stats de puntos para retrocompatibilidad
            pointsStats,
            totalPointsEarned,
        ] = await Promise.all([
            prisma.survey.count(),
            prisma.survey.aggregate({ _avg: { csatScore: true } }),
            prisma.survey.aggregate({ _avg: { npsScore: true } }),
            prisma.survey.aggregate({ _avg: { salespersonRating: true } }),
            prisma.survey.count({ where: { foundEverything: true } }),
            prisma.survey.groupBy({
                by: ['waitTimeRange'],
                _count: true,
            }),
            // Estadísticas de recompensas (Vales)
            prisma.surveySubmission.groupBy({
                by: ['rewardStatus'],
                _count: true,
                where: { rewardStatus: { not: null } },
            }),
            // Total de importe en vales
            prisma.surveySubmission.aggregate({
                _sum: { voucherAmount: true },
                where: { voucherAmount: { gt: 0 } },
            }),
            // Estadísticas de puntos (Legacy)
            prisma.surveySubmission.groupBy({
                by: ['pointsStatus'],
                _count: true,
                where: { pointsStatus: { not: null } },
            }),
            // Total de puntos ganados (Legacy)
            prisma.surveySubmission.aggregate({
                _sum: { pointsEarned: true },
                where: { pointsEarned: { gt: 0 } },
            }),
        ]);

        const waitTimeDistribution = {
            less2: 0,
            '2to5': 0,
            '5to10': 0,
            more10: 0,
        };

        waitTimeStats.forEach((stat) => {
            waitTimeDistribution[stat.waitTimeRange as keyof typeof waitTimeDistribution] =
                stat._count;
        });

        // Distribución de estados de recompensas
        const rewardDistribution: Record<string, number> = {};
        rewardStats.forEach((stat) => {
            rewardDistribution[stat.rewardStatus || 'UNKNOWN'] = stat._count;
        });

        // Distribución de estados de puntos (Legacy)
        const pointsDistribution: Record<string, number> = {};
        pointsStats.forEach((stat) => {
            pointsDistribution[stat.pointsStatus || 'UNKNOWN'] = stat._count;
        });

        return {
            totalSurveys,
            averageCsat: avgCsat._avg.csatScore || 0,
            averageNps: avgNps._avg.npsScore || 0,
            averageSalespersonRating: avgSalesperson._avg.salespersonRating || 0,
            foundEverythingPercentage:
                totalSurveys > 0 ? (foundEverythingCount / totalSurveys) * 100 : 0,
            waitTimeDistribution,
            // Estadísticas de recompensas (Nuevas)
            rewardDistribution,
            totalVoucherAmount: totalVoucherAmount._sum.voucherAmount || 0,
            rewardSuccessRate: rewardDistribution['PROCESSED']
                ? (rewardDistribution['PROCESSED'] / totalSurveys) * 100
                : 0,
            // Estadísticas de puntos (Legacy)
            pointsDistribution,
            totalPointsEarned: totalPointsEarned._sum.pointsEarned || 0,
            pointsSuccessRate: pointsDistribution['PROCESSED']
                ? (pointsDistribution['PROCESSED'] / totalSurveys) * 100
                : 0,
        };
    }

    // Convertir datos del frontend al formato de entrada
    static mapSurveyDataToInput(surveyData: SurveyData): SurveyInput {
        return {
            ticketId: surveyData.ticket_id,
            csat: surveyData.answers.csat,
            nps: surveyData.answers.nps,
            salespersonRating: surveyData.answers.salesperson_rating,
            foundEverything: surveyData.answers.found_everything,
            waitTime: surveyData.answers.wait_time,
            comment: surveyData.answers.comment,
            // El locale se puede extraer de headers o contexto
            locale: undefined,
        };
    }
}
