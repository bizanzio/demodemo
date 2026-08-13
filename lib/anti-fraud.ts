import { nanoid } from 'nanoid';

// Tracking d'activitat sospitosa per IP
interface SuspiciousActivity {
    ip: string;
    attempts: number;
    invalidTokens: number;
    differentTickets: Set<string>;
    firstAttempt: number;
    lastAttempt: number;
    userAgent?: string;
}

// Mapa de tracking (en producció usar Redis)
const suspiciousActivityMap = new Map<string, SuspiciousActivity>();
const bannedIPs = new Set<string>();

// Configuració antifraude
const FRAUD_CONFIG = {
    MAX_INVALID_TOKENS_PER_HOUR: 5,
    MAX_DIFFERENT_TICKETS_PER_DAY: 3,
    MAX_ATTEMPTS_PER_HOUR: 10,
    BAN_DURATION: 24 * 60 * 60 * 1000, // 24 hores
    TRACKING_WINDOW: 60 * 60 * 1000, // 1 hora
} as const;

export function trackSuspiciousActivity(
    ip: string,
    ticketId?: string,
    isValidToken: boolean = true,
    userAgent?: string
): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const key = ip;

    // Comprovar si està banejat
    if (bannedIPs.has(ip)) {
        return { allowed: false, reason: 'IP_BANNED' };
    }

    // Obtenir o crear tracking
    let activity = suspiciousActivityMap.get(key);
    if (!activity) {
        activity = {
            ip,
            attempts: 0,
            invalidTokens: 0,
            differentTickets: new Set(),
            firstAttempt: now,
            lastAttempt: now,
            userAgent,
        };
        suspiciousActivityMap.set(key, activity);
    }

    // Netejar dades antigues (finestra lliscant)
    if (now - activity.firstAttempt > FRAUD_CONFIG.TRACKING_WINDOW) {
        // Reset comptadors per finestra lliscant
        activity.attempts = 0;
        activity.invalidTokens = 0;
        activity.differentTickets.clear();
        activity.firstAttempt = now;
    }

    // Actualitzar activitat
    activity.lastAttempt = now;
    if (userAgent) activity.userAgent = userAgent;

    // Els tokens VÀLIDS són peticions legítimes (tiquet real i signat correctament):
    // no s'han de comptar com a activitat sospitosa ni poden provocar un ban.
    // Un client amb diversos tiquets (ex: família) ha de poder fer-los tots.
    // Només seguim els intents amb token INVÀLID (enumeració/força bruta).
    if (!isValidToken) {
        activity.attempts++;
        activity.invalidTokens++;
        if (ticketId) activity.differentTickets.add(ticketId);
    }

    // Detectar patrons sospitosos
    const reasons: string[] = [];

    if (activity.invalidTokens > FRAUD_CONFIG.MAX_INVALID_TOKENS_PER_HOUR) {
        reasons.push('TOO_MANY_INVALID_TOKENS');
    }

    if (activity.differentTickets.size > FRAUD_CONFIG.MAX_DIFFERENT_TICKETS_PER_DAY) {
        reasons.push('TOO_MANY_DIFFERENT_TICKETS');
    }

    if (activity.attempts > FRAUD_CONFIG.MAX_ATTEMPTS_PER_HOUR) {
        reasons.push('TOO_MANY_ATTEMPTS');
    }

    // Si detectem activitat sospitosa, banem temporalment
    if (reasons.length > 0) {
        bannedIPs.add(ip);
        console.warn(`🚫 IP banned for suspicious activity: ${ip}`, {
            reasons,
            attempts: activity.attempts,
            invalidTokens: activity.invalidTokens,
            differentTickets: activity.differentTickets.size,
            userAgent: activity.userAgent,
        });

        // Programar eliminació del ban
        setTimeout(() => {
            bannedIPs.delete(ip);
            suspiciousActivityMap.delete(key);
            console.log(`✅ IP unbanned: ${ip}`);
        }, FRAUD_CONFIG.BAN_DURATION);

        return { allowed: false, reason: reasons[0] };
    }

    return { allowed: true };
}

export function getActivityStats(ip: string) {
    const activity = suspiciousActivityMap.get(ip);
    return activity
        ? {
              attempts: activity.attempts,
              invalidTokens: activity.invalidTokens,
              differentTickets: activity.differentTickets.size,
              userAgent: activity.userAgent,
          }
        : null;
}
