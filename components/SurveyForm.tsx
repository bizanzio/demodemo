'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SurveyData, WaitTimeOption, APP_CONFIG } from '@/lib/types';
import ProgressBar from './ProgressBar';
import { ChevronLeft, ChevronRight, Star, MessageSquare } from 'lucide-react';

// Schema de validació amb Zod
const surveySchema = z.object({
    csat: z.number().min(1).max(5),
    nps: z.number().min(0).max(10),
    salesperson_rating: z.number().min(1).max(5),
    found_everything: z.boolean(),
    wait_time: z.enum(['less2', '2to5', '5to10', 'more10']),
    comment: z.string().max(APP_CONFIG.MAX_COMMENT_LENGTH).optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyFormProps {
    onSubmit: (answers: SurveyData['answers'], recaptchaToken?: string) => Promise<void>;
    sessionStartTime: number;
}

const STEPS = [
    'csat',
    'nps',
    'salesperson_rating',
    'found_everything',
    'wait_time',
    'comment',
] as const;

type Step = (typeof STEPS)[number];

export default function SurveyForm({ onSubmit, sessionStartTime }: SurveyFormProps) {
    const t = useTranslations();
    const [currentStep, setCurrentStep] = useState<Step>('csat');
    const [timeLeft, setTimeLeft] = useState<number>(APP_CONFIG.SESSION_TIMEOUT);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
        trigger,
    } = useForm<SurveyFormData>({
        resolver: zodResolver(surveySchema),
        mode: 'onTouched', // Cambiado de 'onChange' a 'onTouched' para evitar validaciones automáticas
    });

    const watchedValues = watch();

    // Compte enrere per timeout de sessió
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - sessionStartTime;
            const remaining = APP_CONFIG.SESSION_TIMEOUT - elapsed;
            setTimeLeft(Math.max(0, remaining));
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionStartTime]);

    const currentStepIndex = STEPS.indexOf(currentStep);
    const totalSteps = STEPS.length;
    const isLastStep = currentStepIndex === totalSteps - 1;
    const isFirstStep = currentStepIndex === 0;

    const nextStep = async () => {
        const isValid = await trigger(currentStep);
        if (isValid && !isLastStep) {
            // Si vamos a cambiar al último paso (comment), asegurarnos de que no se active el submit automático
            if (currentStepIndex === totalSteps - 2) {
                // Estamos a punto de pasar al último paso (comment)
                console.log('⚠️ Cambiando al paso de comentario...');

                // Pequeño retraso para asegurar que React tenga tiempo de actualizar el estado
                setTimeout(() => {
                    setCurrentStep(STEPS[currentStepIndex + 1]);
                }, 10);
            } else {
                setCurrentStep(STEPS[currentStepIndex + 1]);
            }
        }
    };

    const prevStep = () => {
        if (!isFirstStep) {
            setCurrentStep(STEPS[currentStepIndex - 1]);
        }
    };

    const onFormSubmit = async (data: SurveyFormData) => {
        // Només permetre submit si estem en l'últim pas (comment)
        if (!isLastStep) {
            console.warn('⚠️ Form submit attempted before last step');
            return;
        }

        // Ya no necesitamos esta verificación, ya que el modo 'onTouched' y el setTimeout
        // en el cambio al paso comment son suficientes para prevenir el envío automático
        console.log('✅ Procesando envío del formulario...');

        let recaptchaToken: string | undefined;

        // Obtenir token de reCAPTCHA v3 si està disponible
        if (
            typeof window !== 'undefined' &&
            window.grecaptcha &&
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
        ) {
            try {
                recaptchaToken = await window.grecaptcha.execute(
                    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
                    { action: 'survey_submit' }
                );
                console.log('✅ reCAPTCHA token obtained');
            } catch (error) {
                console.warn('⚠️ reCAPTCHA token generation failed:', error);
                // Continuar sense reCAPTCHA en cas d'error
            }
        }

        await onSubmit(data, recaptchaToken);
    };

    // Component Star Rating amb accessibilitat WCAG
    const StarRating = ({
        value,
        onChange,
        max = 5,
        name,
        label,
    }: {
        value: number;
        onChange: (value: number) => void;
        max?: number;
        name: string;
        label: string;
    }) => {
        const handleKeyDown = (event: React.KeyboardEvent, rating: number) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChange(rating);
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                const nextRating = Math.min(rating + 1, max);
                onChange(nextRating);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                const prevRating = Math.max(rating - 1, 1);
                onChange(prevRating);
            }
        };

        return (
            <fieldset className="my-6">
                <legend className="sr-only">{label}</legend>
                <div className="flex gap-2 justify-center" role="radiogroup" aria-label={label}>
                    {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
                        <button
                            key={rating}
                            type="button"
                            role="radio"
                            aria-checked={rating === value}
                            aria-label={`${rating} de ${max} estreles`}
                            tabIndex={rating === (value || 1) ? 0 : -1}
                            onClick={() => onChange(rating)}
                            onKeyDown={(e) => handleKeyDown(e, rating)}
                            className={`p-2 rounded-xl transition-all duration-300 vl-hover-lift focus:outline-none focus:ring-2 focus:ring-vl-blue focus:ring-offset-2 ${
                                rating <= value
                                    ? 'text-vl-blue scale-110 bg-vl-blue/10'
                                    : 'text-vl-black/30 hover:text-vl-blue hover:scale-105 hover:bg-vl-blue/5'
                            }`}
                        >
                            <Star size={28} fill={rating <= value ? 'currentColor' : 'none'} />
                        </button>
                    ))}
                </div>
            </fieldset>
        );
    };

    // Component NPS Rating amb accessibilitat WCAG
    const NPSRating = ({
        value,
        onChange,
        label,
    }: {
        value: number;
        onChange: (value: number) => void;
        label: string;
    }) => {
        const handleKeyDown = (event: React.KeyboardEvent, rating: number) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChange(rating);
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                const nextRating = Math.min(rating + 1, 10);
                onChange(nextRating);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                const prevRating = Math.max(rating - 1, 0);
                onChange(prevRating);
            }
        };

        return (
            <fieldset className="my-6">
                <legend className="sr-only">{label}</legend>
                <div
                    className="grid grid-cols-6 sm:grid-cols-11 gap-2"
                    role="radiogroup"
                    aria-label={label}
                >
                    {Array.from({ length: 11 }, (_, i) => i).map((rating) => (
                        <button
                            key={rating}
                            type="button"
                            role="radio"
                            aria-checked={rating === value}
                            aria-label={`Puntuació ${rating} de 10`}
                            tabIndex={rating === (value >= 0 ? value : 0) ? 0 : -1}
                            onClick={() => onChange(rating)}
                            onKeyDown={(e) => handleKeyDown(e, rating)}
                            className={`h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all duration-300 vl-hover-lift focus:outline-none focus:ring-2 focus:ring-vl-blue focus:ring-offset-2 ${
                                rating === value
                                    ? 'bg-vl-black text-vl-white scale-105 shadow-lg'
                                    : 'bg-vl-white border-2 border-vl-black/20 text-vl-black hover:border-vl-blue hover:text-vl-blue hover:scale-105'
                            }`}
                        >
                            {rating}
                        </button>
                    ))}
                </div>
            </fieldset>
        );
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'csat':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-2 font-marsden">
                            {t('questions.csat.title')}
                        </h2>
                        <p className="text-vl-black/70 mb-6 text-sm sm:text-base">
                            {t('questions.csat.scale')}
                        </p>
                        <StarRating
                            value={watchedValues.csat || 0}
                            onChange={(value) => setValue('csat', value)}
                            name="csat"
                            label={t('questions.csat.title')}
                        />
                        {errors.csat && (
                            <p
                                className="text-red-500 text-sm mt-4 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.required')}
                            </p>
                        )}
                    </div>
                );

            case 'nps':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-2 font-marsden">
                            {t('questions.nps.title')}
                        </h2>
                        <p className="text-vl-black/70 mb-6 text-sm sm:text-base">
                            {t('questions.nps.scale')}
                        </p>
                        <NPSRating
                            value={watchedValues.nps ?? -1}
                            onChange={(value) => setValue('nps', value)}
                            label={t('questions.nps.title')}
                        />
                        {errors.nps && (
                            <p
                                className="text-red-500 text-sm mt-4 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.required')}
                            </p>
                        )}
                    </div>
                );

            case 'salesperson_rating':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-2 font-marsden">
                            {t('questions.salesperson.title')}
                        </h2>
                        <p className="text-vl-black/70 mb-6 text-sm sm:text-base">
                            {t('questions.salesperson.scale')}
                        </p>
                        <StarRating
                            value={watchedValues.salesperson_rating || 0}
                            onChange={(value) => setValue('salesperson_rating', value)}
                            name="salesperson_rating"
                            label={t('questions.salesperson.title')}
                        />
                        {errors.salesperson_rating && (
                            <p
                                className="text-red-500 text-sm mt-4 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.required')}
                            </p>
                        )}
                    </div>
                );

            case 'found_everything':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-6 font-marsden">
                            {t('questions.foundEverything.title')}
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                            <button
                                type="button"
                                onClick={() => setValue('found_everything', true)}
                                className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 vl-hover-lift ${
                                    watchedValues.found_everything === true
                                        ? 'bg-vl-black text-vl-white scale-105 shadow-xl'
                                        : 'bg-vl-white border-2 border-vl-black/20 text-vl-black hover:border-vl-blue hover:text-vl-blue hover:scale-105'
                                }`}
                            >
                                {t('questions.foundEverything.yes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('found_everything', false)}
                                className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 vl-hover-lift ${
                                    watchedValues.found_everything === false
                                        ? 'bg-vl-black text-vl-white scale-105 shadow-xl'
                                        : 'bg-vl-white border-2 border-vl-black/20 text-vl-black hover:border-vl-blue hover:text-vl-blue hover:scale-105'
                                }`}
                            >
                                {t('questions.foundEverything.no')}
                            </button>
                        </div>
                        {errors.found_everything && (
                            <p
                                className="text-red-500 text-sm mt-6 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.required')}
                            </p>
                        )}
                    </div>
                );

            case 'wait_time':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-6 font-marsden">
                            {t('questions.waitTime.title')}
                        </h2>
                        <div className="grid gap-3">
                            {(['less2', '2to5', '5to10', 'more10'] as WaitTimeOption[]).map(
                                (option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setValue('wait_time', option)}
                                        className={`p-3 rounded-xl font-bold text-base transition-all duration-300 vl-hover-lift ${
                                            watchedValues.wait_time === option
                                                ? 'bg-vl-black text-vl-white scale-105 shadow-xl'
                                                : 'bg-vl-white border-2 border-vl-black/20 text-vl-black hover:border-vl-blue hover:text-vl-blue hover:scale-105'
                                        }`}
                                    >
                                        {t(`questions.waitTime.options.${option}`)}
                                    </button>
                                )
                            )}
                        </div>
                        {errors.wait_time && (
                            <p
                                className="text-red-500 text-sm mt-6 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.required')}
                            </p>
                        )}
                    </div>
                );

            case 'comment':
                return (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-vl-black mb-6 font-marsden">
                            {t('questions.comment.title')}
                        </h2>
                        <div className="relative">
                            <textarea
                                {...register('comment')}
                                placeholder={t('questions.comment.placeholder')}
                                className="vl-input w-full p-4 rounded-xl resize-none text-base font-medium"
                                rows={4}
                                maxLength={APP_CONFIG.MAX_COMMENT_LENGTH}
                            />
                            <div className="flex justify-between items-center mt-4 text-sm text-vl-black/60 font-medium">
                                <span>{t('questions.comment.maxLength')}</span>
                                <span>
                                    {(watchedValues.comment || '').length}/
                                    {APP_CONFIG.MAX_COMMENT_LENGTH}
                                </span>
                            </div>
                        </div>
                        {errors.comment && (
                            <p
                                className="text-red-500 text-sm mt-4 font-medium"
                                role="alert"
                                aria-live="polite"
                            >
                                {t('validation.maxLength', {
                                    max: APP_CONFIG.MAX_COMMENT_LENGTH,
                                })}
                            </p>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-vl-black mb-3 font-marsden">
                    {t('survey.title')}
                </h1>
                <p className="text-vl-black/70 text-base sm:text-lg">{t('survey.subtitle')}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-10">
                <ProgressBar current={currentStepIndex + 1} total={totalSteps} />
            </div>

            {/* Form */}
            <form
                onSubmit={handleSubmit(onFormSubmit)}
                className="space-y-8"
                onKeyDown={(e) => {
                    // Prevenir submit amb Enter si no estem en l'últim pas
                    if (e.key === 'Enter' && !isLastStep) {
                        e.preventDefault();
                        nextStep(); // Anar al següent pas en lloc de fer submit
                    }
                    // Prevenir submit amb Enter en l'últim pas si l'event ve d'un textarea
                    if (
                        e.key === 'Enter' &&
                        isLastStep &&
                        e.target instanceof HTMLTextAreaElement
                    ) {
                        e.preventDefault(); // Permetre Enter normal en textarea sense fer submit
                    }
                }}
            >
                {/* Step Content */}
                <div className="vl-glass-card rounded-2xl shadow-xl border border-vl-black/10">
                    {renderStep()}
                </div>

                {/* Navigation */}
                <div className="flex flex-row justify-between items-center gap-4">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={isFirstStep}
                        className={`vl-btn-secondary flex items-center gap-2 rounded-xl font-medium transition-all duration-300 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${
                            isFirstStep ? 'opacity-40 cursor-not-allowed' : 'vl-hover-lift'
                        }`}
                    >
                        <ChevronLeft size={18} />
                        <span className="hidden sm:inline">{t('survey.previous')}</span>
                        <span className="sm:hidden">Anterior</span>
                    </button>

                    <span className="text-xs sm:text-sm text-vl-black/60 font-medium">
                        {t('survey.progress', {
                            current: currentStepIndex + 1,
                            total: totalSteps,
                        })}
                    </span>

                    {isLastStep ? (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="vl-btn-primary flex items-center gap-2 rounded-xl font-medium transition-all duration-300 vl-hover-lift disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
                        >
                            <MessageSquare size={18} />
                            {isSubmitting ? '...' : t('survey.submit')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="vl-btn-primary flex items-center gap-2 rounded-xl font-medium transition-all duration-300 vl-hover-lift px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
                        >
                            <span className="hidden sm:inline">{t('survey.next')}</span>
                            <span className="sm:hidden">Següent</span>
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </form>

            {/* Session timeout warning */}
            {timeLeft < 60000 && timeLeft > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800 text-sm text-center font-medium">
                    ⚠️ La sessió expira en {Math.ceil(timeLeft / 1000)} segons
                </div>
            )}
        </div>
    );
}
