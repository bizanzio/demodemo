'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SurveyData, TokenValidation, SurveyStatus, GiftCardResponse } from '@/lib/types';
import { validateToken, checkSurveyStatus, submitSurvey, generateVoucher } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorPage from './ErrorPage';
import AlreadySubmittedPage from './AlreadySubmittedPage';
import SurveyForm from './SurveyForm';
import SuccessPage from './SuccessPage';

interface SurveyContainerProps {
    token: string;
    locale: string;
}

type SurveyState =
    | 'loading'
    | 'invalid-token'
    | 'rate-limited'
    | 'already-submitted'
    | 'active'
    | 'submitting'
    | 'success'
    | 'timeout'
    | 'error';

export default function SurveyContainer({ token, locale }: SurveyContainerProps) {
    const t = useTranslations();
    const [state, setState] = useState<SurveyState>('loading');
    const [tokenData, setTokenData] = useState<TokenValidation | null>(null);
    const [rewardData, setRewardData] = useState<GiftCardResponse | null>(null);
    const [sessionStartTime] = useState(Date.now());
    const [originalToken, setOriginalToken] = useState<string | null>(null);

    // Timeout per inactivitat (5 minuts)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (state === 'active') {
                setState('timeout');
            }
        }, 5 * 60 * 1000); // 5 minuts

        return () => clearTimeout(timeout);
    }, [state]);

    // Validació inicial del token i neteja de URL
    useEffect(() => {
        const initializeSurvey = async () => {
            try {
                // 1. Validar token
                const validation = await validateToken(token);

                if (!validation.valid || !validation.ticket_id) {
                    setState(validation.reason === 'rate_limited' ? 'rate-limited' : 'invalid-token');
                    return;
                }

                setTokenData(validation);
                setOriginalToken(token); // Guardar token original per enviar amb l'enquesta

                // 2. Emmagatzemar ticket_id en sessionStorage i netejar URL
                sessionStorage.setItem('vl-survey-ticket', validation.ticket_id);

                // Eliminar token de la URL sense recarregar la pàgina
                const url = new URL(window.location.href);
                url.searchParams.delete('t');
                window.history.replaceState({}, '', url.toString());

                // 3. Comprovar si ja s'ha respost
                const status = await checkSurveyStatus(validation.ticket_id);

                if (status.exists) {
                    setState('already-submitted');
                    return;
                }

                // 4. Tot correcte, mostrar formulari
                setState('active');
            } catch (error) {
                console.error('Error initializing survey:', error);
                setState('error');
            }
        };

        initializeSurvey();
    }, [token]);

    // Gestió de l'enviament del formulari
    const handleSubmit = async (answers: SurveyData['answers'], recaptchaToken?: string) => {
        if (!tokenData?.ticket_id) return;

        setState('submitting');

        try {
            const surveyData: SurveyData = {
                ticket_id: tokenData.ticket_id,
                answers,
                timestamp: new Date().toISOString(),
            };

            // 1. Enviar enquesta amb token original i reCAPTCHA
            await submitSurvey(surveyData, originalToken || undefined, recaptchaToken);

            // 2. Generar vale de descuento
            try {
                const voucherResponse = await generateVoucher(tokenData.ticket_id);
                setRewardData(voucherResponse);

                // Gestionar els diferents code_message
                switch (voucherResponse.code_message) {
                    case 'PROCESSED':
                        console.log('✅ Vale generat correctament:', voucherResponse);
                        break;
                    case 'ERROR':
                        console.error('❌ Error tècnic generant vale:', voucherResponse);
                        break;
                    default:
                        console.log('✅ Resposta vale:', voucherResponse);
                }
            } catch (voucherError) {
                console.warn('⚠️ Error generant vale (no crític):', voucherError);
            }

            setState('success');
        } catch (error: any) {
            console.error('Error submitting survey:', error);

            // Si l'enquesta ja s'ha enviat, mostrar pàgina "already submitted"
            if (error.message === 'SURVEY_ALREADY_SUBMITTED') {
                setState('already-submitted');
            } else {
                setState('error');
            }
        }
    };

    // Renderitzar segons l'estat
    switch (state) {
        case 'loading':
            return (
                <div className="w-full max-w-xl mx-auto">
                    <div className="vl-glass-card rounded-2xl shadow-xl p-12 text-center">
                        <LoadingSpinner />
                    </div>
                </div>
            );

        case 'invalid-token':
            return <ErrorPage type="invalid-token" />;

        case 'rate-limited':
            return <ErrorPage type="rate-limited" />;

        case 'already-submitted':
            return <AlreadySubmittedPage />;

        case 'active':
            return <SurveyForm onSubmit={handleSubmit} sessionStartTime={sessionStartTime} />;

        case 'submitting':
            return (
                <div className="w-full max-w-xl mx-auto">
                    <div className="vl-glass-card rounded-2xl shadow-xl p-12 text-center">
                        <LoadingSpinner text={t('survey.submitting')} />
                    </div>
                </div>
            );

        case 'success':
            return <SuccessPage rewardData={rewardData} />;

        case 'timeout':
            return <ErrorPage type="timeout" />;

        case 'error':
        default:
            return <ErrorPage type="general" />;
    }
}
