'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, XCircle, Clock } from 'lucide-react';

interface ErrorPageProps {
    type: 'missing-token' | 'invalid-token' | 'rate-limited' | 'general' | 'timeout';
}

export default function ErrorPage({ type }: ErrorPageProps) {
    const t = useTranslations();

    const getErrorInfo = () => {
        switch (type) {
            case 'missing-token':
                return {
                    icon: <AlertCircle className="w-16 h-16 text-amber-500" />,
                    title: t('errorPage.missingToken.title'),
                    message: t('errorPage.missingToken.message'),
                };
            case 'invalid-token':
                return {
                    icon: <XCircle className="w-16 h-16 text-red-500" />,
                    title: t('errorPage.invalidToken.title'),
                    message: t('errorPage.invalidToken.message'),
                };
            case 'rate-limited':
                return {
                    icon: <Clock className="w-16 h-16 text-amber-500" />,
                    title: t('errorPage.rateLimited.title'),
                    message: t('errorPage.rateLimited.message'),
                };
            case 'timeout':
                return {
                    icon: <AlertCircle className="w-16 h-16 text-orange-500" />,
                    title: t('errorPage.timeout.title'),
                    message: t('errorPage.timeout.message'),
                };
            case 'general':
            default:
                return {
                    icon: <XCircle className="w-16 h-16 text-red-500" />,
                    title: t('errorPage.general.title'),
                    message: t('errorPage.general.message'),
                };
        }
    };

    const errorInfo = getErrorInfo();

    return (
        <div className="w-full max-w-xl mx-auto">
            <div className="space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-8">{errorInfo.icon}</div>
                    <h2 className="text-3xl font-bold text-vl-black mb-6 font-marsden">
                        {errorInfo.title}
                    </h2>
                    <p className="text-xl text-vl-black/70 leading-relaxed font-medium">
                        {errorInfo.message}
                    </p>
                </div>

                <div className="mt-10">
                    <div className="vl-glass-card rounded-2xl shadow-lg border border-vl-blue/20 p-8">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-6 w-6 text-vl-blue" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-vl-black font-marsden mb-2">
                                    {t('errorPage.needHelp')}
                                </h3>
                                <p className="text-vl-black/70 font-medium">
                                    {t('errorPage.contactSupport')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
