import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed simplificado...');

    // Limpiar datos existentes en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Limpiando datos existentes...');
        await prisma.surveySubmission.deleteMany();
        await prisma.survey.deleteMany();
    }

    // Datos de ejemplo mínimos
    console.log('📊 Creando encuestas de ejemplo...');

    const sampleSurveys = [
        {
            ticketId: 'TKT001',
            csatScore: 5,
            npsScore: 9,
            salespersonRating: 5,
            foundEverything: true,
            waitTimeRange: 'less2' as const,
            comment: 'Excelente servicio, muy satisfecho con la compra.',
            locale: 'es',
        },
        {
            ticketId: 'TKT002',
            csatScore: 4,
            npsScore: 8,
            salespersonRating: 4,
            foundEverything: true,
            waitTimeRange: 'to5' as const,
            comment: 'Buen servicio en general.',
            locale: 'ca',
        },
        {
            ticketId: 'TKT003',
            csatScore: 3,
            npsScore: 6,
            salespersonRating: 3,
            foundEverything: false,
            waitTimeRange: 'to10' as const,
            comment: 'No encontré todo lo que buscaba.',
            locale: 'es',
        },
        {
            ticketId: 'TKT004',
            csatScore: 5,
            npsScore: 10,
            salespersonRating: 5,
            foundEverything: true,
            waitTimeRange: 'less2' as const,
            locale: 'en',
        },
        {
            ticketId: 'TKT005',
            csatScore: 2,
            npsScore: 3,
            salespersonRating: 2,
            foundEverything: false,
            waitTimeRange: 'more10' as const,
            comment: 'Experiencia decepcionante.',
            locale: 'fr',
        },
    ];

    // Crear encuestas y registros de idempotencia
    for (const surveyData of sampleSurveys) {
        const survey = await prisma.survey.create({
            data: surveyData,
        });

        // Crear entrada de idempotencia
        await prisma.surveySubmission.create({
            data: {
                ticketId: surveyData.ticketId,
                status: 'completed',
                surveyId: survey.id,
            },
        });
    }

    console.log('✅ Seed completado!');

    // Estadísticas simples
    const totalSurveys = await prisma.survey.count();
    const totalSubmissions = await prisma.surveySubmission.count();

    console.log(
        `\n📈 Creadas ${totalSurveys} encuestas con ${totalSubmissions} registros de idempotencia`
    );
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
