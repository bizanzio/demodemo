'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface LoadingSpinnerProps {
    text?: string;
    size?: 'small' | 'medium' | 'large';
}

export default function LoadingSpinner({ text, size = 'medium' }: LoadingSpinnerProps) {
    const t = useTranslations();
    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16',
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6">
            <div
                className={`animate-spin rounded-full border-4 border-vl-black/20 border-t-vl-blue ${sizeClasses[size]}`}
            ></div>
            {text && <p className="text-vl-black/80 text-lg font-medium font-marsden">{text}</p>}
            {!text && (
                <p className="text-vl-black/80 text-lg font-medium font-marsden">
                    {t('loading.default')}
                </p>
            )}
        </div>
    );
}
