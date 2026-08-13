'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Gift, Star } from 'lucide-react';
import { GiftCardResponse } from '@/lib/types';

interface SuccessPageProps {
    rewardData?: GiftCardResponse | null;
}

export default function SuccessPage({ rewardData }: SuccessPageProps) {
    const t = useTranslations();

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="space-y-8">
                <div className="text-center">
                    {/* Títol principal */}
                    <h1 className="text-4xl font-bold text-vl-black mb-6 font-marsden">
                        {t('survey.thankYou')}
                    </h1>

                    {/* Missatge principal */}
                    <div className="vl-glass-card rounded-2xl shadow-xl p-10 space-y-8">
                        <p className="text-xl text-vl-black/80 leading-relaxed font-medium">
                            {t('success.thankYouMessage')}
                        </p>

                        {/* Informació del vale */}
                        {rewardData && rewardData.code_message && (
                            <div
                                className={`bg-gradient-to-r border rounded-lg p-6 ${
                                    rewardData.code_message === 'PROCESSED' ||
                                    rewardData.code_message === 'ALREADY_PROCESSED'
                                        ? 'from-green-50 to-emerald-50 border-green-200'
                                        : rewardData.code_message === 'ERROR'
                                        ? 'from-red-50 to-pink-50 border-red-200'
                                        : 'from-orange-50 to-yellow-50 border-orange-200'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <Gift
                                        className={`w-8 h-8 ${
                                            rewardData.code_message === 'PROCESSED' ||
                                            rewardData.code_message === 'ALREADY_PROCESSED'
                                                ? 'text-green-600'
                                                : rewardData.code_message === 'ERROR'
                                                ? 'text-red-600'
                                                : 'text-orange-600'
                                        }`}
                                    />
                                    <h3
                                        className={`text-xl font-bold ${
                                            rewardData.code_message === 'PROCESSED' ||
                                            rewardData.code_message === 'ALREADY_PROCESSED'
                                                ? 'text-green-800'
                                                : rewardData.code_message === 'ERROR'
                                                ? 'text-red-800'
                                                : 'text-orange-800'
                                        }`}
                                    >
                                        {rewardData.code_message === 'PROCESSED' &&
                                            t('survey.voucherEarned')}
                                        {rewardData.code_message === 'ALREADY_PROCESSED' &&
                                            t('survey.voucherAlreadyProcessed')}
                                        {rewardData.code_message === 'NOT_ELIGIBLE' &&
                                            t('survey.voucherNotEligible')}
                                        {rewardData.code_message === 'EXPIRED' &&
                                            t('survey.voucherExpired')}
                                        {rewardData.code_message === 'ERROR' &&
                                            t('survey.voucherError')}
                                        {(rewardData.code_message === 'NO_TICKET' ||
                                            rewardData.code_message === 'CANCELED_OR_RETURNED') &&
                                            t('survey.voucherNotAvailable')}
                                    </h3>
                                </div>

                                <div className="text-center space-y-4">
                                    {/* Mostrar vale només si s'ha generat */}
                                    {(rewardData.code_message === 'PROCESSED' ||
                                        rewardData.code_message === 'ALREADY_PROCESSED') &&
                                        rewardData.result?.voucherId && (
                                            <>
                                                <div className="bg-white/80 border-2 border-dashed border-green-300 rounded-xl p-4 my-2">
                                                    <p className="text-sm text-green-600 font-bold uppercase tracking-wider mb-1">
                                                        {t('survey.voucherCode')}
                                                    </p>
                                                    <p className="text-3xl font-mono font-black text-vl-black">
                                                        {rewardData.result.voucherId}
                                                    </p>
                                                </div>

                                                {rewardData.result.amount > 0 && (
                                                    <p className="text-2xl font-bold text-green-700">
                                                        {rewardData.result.amount.toFixed(2)}€ {t('survey.discount')}
                                                    </p>
                                                )}
                                                
                                                <p className="text-sm text-green-600 mt-2">
                                                    {t('survey.voucherInstructions')}
                                                </p>
                                            </>
                                        )}

                                    {rewardData.code_message === 'NOT_ELIGIBLE' && (
                                        <p className="text-sm text-orange-600">
                                            {t('survey.voucherNotEligibleMessage')}
                                        </p>
                                    )}

                                    {rewardData.code_message === 'ERROR' && (
                                        <p className="text-sm text-red-600">
                                            {t('survey.voucherErrorMessage')}
                                        </p>
                                    )}

                                    {(rewardData.code_message === 'NO_TICKET' ||
                                        rewardData.code_message === 'CANCELED_OR_RETURNED') && (
                                        <p className="text-sm text-orange-600">
                                            {t('survey.voucherNotAvailableMessage')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Missatge addicional */}
                <div className="vl-glass-card rounded-2xl shadow-lg border border-vl-blue/20 p-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-vl-black mb-4 font-marsden">
                            {t('success.seeYouSoon')}
                        </h3>
                        <p className="text-lg text-vl-black/70 font-medium">
                            {t('success.qualityMessage')}
                        </p>
                    </div>
                </div>

                {/* Animació decorativa */}
                <div className="flex justify-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className="w-8 h-8 text-vl-blue fill-current animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
