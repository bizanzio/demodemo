'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface ProgressBarProps {
    current: number;
    total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
    const t = useTranslations();
    const percentage = Math.round((current / total) * 100);

    return (
        <div className="w-full">
            <div className="flex justify-between text-sm text-vl-black/70 mb-4 font-medium">
                <span>{t('progress.question', { current, total })}</span>
                <span>{t('progress.completed', { percentage })}</span>
            </div>
            <div className="w-full bg-vl-black/10 rounded-full h-3 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-vl-blue to-vl-black h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
