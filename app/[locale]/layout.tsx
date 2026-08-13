import React from 'react';
import Script from 'next/script';
import Image from 'next/image';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export const metadata = {
    title: 'Viladomat - Valoració de la teva experiència',
    description: "Ajuda'ns a millorar amb la teva opinió sobre la teva experiència a Viladomat",
    robots: 'noindex, nofollow', // No indexar formularis privats
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
};

interface RootLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
    const { locale } = await params;

    // Validar que l'idioma sigui suportat
    const isValidLocale = routing.locales.some((l: string) => l === locale);
    if (!isValidLocale) {
        notFound();
    }

    // Habilitar renderitzat estàtic
    setRequestLocale(locale);

    // Carregar les traduccions
    const messages = await getMessages();

    return (
        <html lang={locale} className="h-full">
            <body className="h-full bg-vl-white font-marsden antialiased">
                <NextIntlClientProvider messages={messages}>
                    <div className="min-h-full flex flex-col bg-gradient-to-br from-vl-white via-vl-gray to-vl-white">
                        {/* Header con logo */}
                        <header className="bg-vl-white border-b border-vl-black shadow-sm">
                            <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
                                <div className="flex justify-center">
                                    <Image
                                        src="/viladomat-logo.svg"
                                        alt="Viladomat"
                                        width={200}
                                        height={48}
                                        className="h-8 sm:h-12 w-auto"
                                        priority
                                    />
                                </div>
                            </div>
                        </header>

                        {/* Contenido principal */}
                        <main className="flex-1 flex items-center justify-center p-4">
                            {children}
                        </main>

                        {/* Footer minimalista */}
                        <footer className="bg-vl-black text-vl-white py-4">
                            <div className="max-w-4xl mx-auto px-4 text-center">
                                <p className="text-sm font-medium">
                                    © 2024 Viladomat - Valoració de la teva experiència
                                </p>
                            </div>
                        </footer>
                    </div>
                </NextIntlClientProvider>

                {/* reCAPTCHA v3 Script */}
                {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                    <Script
                        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
                        strategy="afterInteractive"
                    />
                )}
            </body>
        </html>
    );
}
