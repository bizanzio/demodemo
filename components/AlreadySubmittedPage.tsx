'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle } from 'lucide-react';

export default function AlreadySubmittedPage() {
    const t = useTranslations();

    return (
        <div className="w-full max-w-xl mx-auto">
            <div className="space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-8">
                        <CheckCircle className="w-24 h-24 text-vl-blue" />
                    </div>

                    <h2 className="text-3xl font-bold text-vl-black mb-6 font-marsden">
                        {t('alreadySubmitted.title')}
                    </h2>

                    <div className="vl-glass-card rounded-2xl shadow-xl p-10 space-y-6">
                        <p className="text-xl text-vl-black/80 leading-relaxed font-medium">
                            {t('alreadySubmitted.message')}
                        </p>
                    </div>
                </div>

                <div className="vl-glass-card rounded-2xl shadow-lg border border-vl-blue/20 p-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-vl-black mb-4 font-marsden">
                            {t('alreadySubmitted.importantOpinion')}
                        </h3>
                        <p className="text-lg text-vl-black/70 font-medium">
                            {t('alreadySubmitted.continueWorking')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
