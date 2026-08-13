/**
 * Helper per verificar tokens de reCAPTCHA v3
 */

export interface RecaptchaResponse {
    success: boolean;
    score: number;
    action: string;
    challenge_ts: string;
    hostname: string;
    'error-codes'?: string[];
}

/**
 * Verificar token de reCAPTCHA v3 amb Google
 */
export async function verifyRecaptcha(
    token: string,
    expectedAction = 'survey_submit'
): Promise<{
    success: boolean;
    score: number;
    error?: string;
}> {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;

        if (!secretKey) {
            console.warn('⚠️ RECAPTCHA_SECRET_KEY not configured, skipping verification');
            return { success: true, score: 0.9 }; // Fallback en desenvolupament
        }

        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: secretKey,
                response: token,
            }),
        });

        const data: RecaptchaResponse = await response.json();

        if (!data.success) {
            console.error('❌ reCAPTCHA verification failed:', data['error-codes']);
            return {
                success: false,
                score: 0,
                error: data['error-codes']?.[0] || 'VERIFICATION_FAILED',
            };
        }

        // Verificar que l'acció coincideix
        if (data.action !== expectedAction) {
            console.warn(
                `⚠️ reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`
            );
            return {
                success: false,
                score: data.score,
                error: 'ACTION_MISMATCH',
            };
        }

        console.log(`✅ reCAPTCHA verified: score ${data.score}, action ${data.action}`);

        return {
            success: true,
            score: data.score,
        };
    } catch (error: any) {
        console.error('❌ reCAPTCHA verification error:', error.message);
        return {
            success: false,
            score: 0,
            error: 'NETWORK_ERROR',
        };
    }
}

/**
 * Determinar acció basada en la puntuació de reCAPTCHA
 */
export function getRecaptchaAction(score: number): {
    action: 'allow' | 'challenge' | 'block';
    reason: string;
} {
    if (score >= 0.7) {
        return { action: 'allow', reason: 'HIGH_SCORE' };
    }

    if (score >= 0.5) {
        return { action: 'allow', reason: 'MEDIUM_SCORE' };
    }

    if (score >= 0.3) {
        return { action: 'challenge', reason: 'LOW_SCORE' };
    }

    return { action: 'block', reason: 'VERY_LOW_SCORE' };
}

/**
 * Declaració de tipus per window.grecaptcha
 */
declare global {
    interface Window {
        grecaptcha: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}
