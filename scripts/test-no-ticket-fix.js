#!/usr/bin/env node

/**
 * Script para probar la corrección del problema NO_TICKET
 * 
 * Simula el escenario:
 * 1. Se crea una encuesta para un ticket que no existe aún
 * 2. Se actualiza con pointsStatus = 'NO_TICKET'
 * 3. Se intenta crear una nueva encuesta para el mismo ticket (debería permitirse)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNoTicketFix() {
    const testTicketId = `TEST_NO_TICKET_${Date.now()}`;
    
    console.log('🧪 Iniciando test de corrección NO_TICKET...');
    console.log(`📋 Ticket ID de prueba: ${testTicketId}`);
    
    try {
        // Paso 1: Simular creación de encuesta inicial
        console.log('\n1️⃣ Creando encuesta inicial...');
        
        const initialSurvey = await prisma.survey.create({
            data: {
                ticketId: testTicketId,
                csatScore: 4,
                npsScore: 8,
                salespersonRating: 5,
                foundEverything: true,
                waitTimeRange: 'less2',
                comment: 'Encuesta inicial de prueba',
                locale: 'es'
            }
        });
        
        const initialSubmission = await prisma.surveySubmission.create({
            data: {
                ticketId: testTicketId,
                surveyId: initialSurvey.id,
                status: 'completed'
            }
        });
        
        console.log(`✅ Encuesta inicial creada: ${initialSurvey.id}`);
        
        // Paso 2: Simular actualización con NO_TICKET
        console.log('\n2️⃣ Simulando respuesta NO_TICKET del ERP...');
        
        await prisma.surveySubmission.update({
            where: { id: initialSubmission.id },
            data: {
                pointsStatus: 'NO_TICKET',
                pointsProcessedAt: new Date()
            }
        });
        
        console.log('✅ Estado actualizado a NO_TICKET');
        
        // Paso 3: Verificar que checkExistingSubmission permite nueva encuesta
        console.log('\n3️⃣ Verificando checkExistingSubmission...');
        
        // Importar el servicio dinámicamente
        const { SurveyService } = await import('../lib/survey-service.ts');
        
        const existingCheck = await SurveyService.checkExistingSubmission(testTicketId);
        
        console.log('📊 Resultado de checkExistingSubmission:', existingCheck);
        
        if (!existingCheck.exists) {
            console.log('✅ ¡Perfecto! checkExistingSubmission permite nueva encuesta');
        } else {
            console.log('❌ Error: checkExistingSubmission aún bloquea la encuesta');
            return false;
        }
        
        // Paso 4: Intentar crear nueva encuesta
        console.log('\n4️⃣ Intentando crear nueva encuesta...');
        
        const newSurveyData = {
            ticketId: testTicketId,
            csat: 5,
            nps: 9,
            salespersonRating: 4,
            foundEverything: false,
            waitTime: '2to5',
            comment: 'Nueva encuesta después de NO_TICKET',
            locale: 'es'
        };
        
        try {
            const newSurvey = await SurveyService.createSurvey(newSurveyData);
            console.log(`✅ ¡Nueva encuesta creada exitosamente! ID: ${newSurvey.id}`);
            
            // Verificar que se actualizó la encuesta existente
            const updatedSubmission = await prisma.surveySubmission.findUnique({
                where: { ticketId: testTicketId },
                include: { survey: true }
            });
            
            console.log('📊 Estado final de la submission:', {
                pointsStatus: updatedSubmission.pointsStatus,
                surveyData: {
                    csatScore: updatedSubmission.survey.csatScore,
                    comment: updatedSubmission.survey.comment
                }
            });
            
            if (updatedSubmission.pointsStatus === null && 
                updatedSubmission.survey.csatScore === 5) {
                console.log('✅ ¡Encuesta actualizada correctamente!');
                return true;
            } else {
                console.log('❌ Error: La encuesta no se actualizó como esperado');
                return false;
            }
            
        } catch (error) {
            console.log('❌ Error creando nueva encuesta:', error.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en el test:', error);
        return false;
    } finally {
        // Limpiar datos de prueba
        console.log('\n🧹 Limpiando datos de prueba...');
        try {
            await prisma.surveySubmission.deleteMany({
                where: { ticketId: testTicketId }
            });
            await prisma.survey.deleteMany({
                where: { ticketId: testTicketId }
            });
            console.log('✅ Datos de prueba eliminados');
        } catch (cleanupError) {
            console.warn('⚠️ Error limpiando datos de prueba:', cleanupError.message);
        }
        
        await prisma.$disconnect();
    }
}

// Ejecutar test
testNoTicketFix()
    .then((success) => {
        if (success) {
            console.log('\n🎉 ¡TEST EXITOSO! La corrección NO_TICKET funciona correctamente');
            process.exit(0);
        } else {
            console.log('\n💥 TEST FALLIDO. Revisar la implementación');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('\n💥 ERROR EJECUTANDO TEST:', error);
        process.exit(1);
    });


