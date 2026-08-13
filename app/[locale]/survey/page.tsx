import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import SurveyContainer from '@/components/SurveyContainer';
import ErrorPage from '@/components/ErrorPage';

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

interface SurveyPageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ t?: string }>;
}

export default async function SurveyPage({ params, searchParams }: SurveyPageProps) {
    const { locale } = await params;
    const { t: token } = await searchParams;

    // Habilitar renderitzat estàtic
    setRequestLocale(locale);

    // Si no hi ha token, mostrar error
    if (!token) {
        return <ErrorPage type="missing-token" />;
    }

    return (
        <div className="min-h-screen ">
            <SurveyContainer token={token} locale={locale} />
        </div>
    );
}
