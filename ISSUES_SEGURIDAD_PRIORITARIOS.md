# Issues de Seguridad Prioritarios

## 1. Implementación de reCAPTCHA v3 para protección invisible

**Prioridad**: Alta
**Esfuerzo**: Medio (1 sprint)
**Impacto**: Alto (protección sin fricción)

### Descripción

Implementar Google reCAPTCHA v3 para detectar bots y comportamientos automatizados sin añadir fricción al usuario. A diferencia de reCAPTCHA v2 (con captchas visuales), la v3 genera una puntuación de riesgo (0.0 a 1.0) basada en comportamiento, permitiendo acciones adaptativas según nivel de riesgo.

### Tareas

-   [ ] Registrar sitio en [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
-   [ ] Obtener par de claves (site key + secret key)
-   [ ] Añadir claves a variables de entorno:
    ```
    RECAPTCHA_SITE_KEY=6LxxxxxxxxxxxxxxxxxxxXXX
    RECAPTCHA_SECRET_KEY=6LxxxxxxxxxxxxxxxxxxxXXX_XXXXXXXX
    ```
-   [ ] Integrar script en `layout.tsx`:
    ```tsx
    <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
    />
    ```
-   [ ] Modificar `SurveyForm.tsx` para obtener token antes de submit:
    ```tsx
    const onFormSubmit = async (data: SurveyFormData) => {
        // @ts-ignore - window.grecaptcha es añadido por el script
        const recaptchaToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: 'survey_submit' }
        );

        await onSubmit(data, recaptchaToken);
    };
    ```
-   [ ] Actualizar `lib/api.ts` para enviar token reCAPTCHA:
    ```tsx
    export async function submitSurvey(
        surveyData: SurveyData,
        jwtToken?: string,
        recaptchaToken?: string
    ): Promise<void> {
        // ...código existente con recaptchaToken en headers
    }
    ```
-   [ ] Implementar verificación en servidor (`app/api/survey/route.ts`):
    ```tsx
    // Verificar reCAPTCHA
    const recaptchaToken = request.headers.get('x-recaptcha-token');
    if (recaptchaToken) {
        const score = await verifyRecaptcha(recaptchaToken);
        if (score < 0.5) {
            // Acción según score: CAPTCHA adicional, rate-limit, bloqueo...
        }
    }
    ```
-   [ ] Crear helper `lib/recaptcha.ts` para verificación:
    ```tsx
    export async function verifyRecaptcha(token: string): Promise<number> {
        const response = await fetch(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
            { method: 'POST' }
        );
        const data = await response.json();
        return data.success ? data.score : 0;
    }
    ```
-   [ ] Implementar acciones adaptativas según puntuación:
    -   0.0-0.3: Bloquear/mostrar CAPTCHA explícito
    -   0.3-0.5: Rate-limit más estricto
    -   0.5-0.7: Logging adicional
    -   0.7-1.0: Permitir normalmente

### Criterios de aceptación

-   reCAPTCHA v3 funciona en todos los navegadores modernos sin errores
-   No añade fricción visible al usuario (invisible)
-   Puntuación de reCAPTCHA se registra en logs para análisis
-   Se implementan acciones adaptativas según puntuación
-   Funciona correctamente en todos los idiomas/rutas
-   Cumple GDPR (aviso en política de privacidad)

---

## 2. Implementación de Redis para rate-limiting y tracking antifraude

**Prioridad**: Alta
**Esfuerzo**: Medio (1 sprint)
**Impacto**: Alto (persistencia y escalabilidad)

### Descripción

Migrar el sistema actual de rate-limiting y tracking antifraude basado en memoria (Maps) a Redis, permitiendo persistencia entre reinicios y escalabilidad horizontal.

### Tareas

-   [ ] Añadir dependencia Upstash/Redis:
    ```bash
    npm install @upstash/redis ioredis
    ```
-   [ ] Configurar variables de entorno:
    ```
    REDIS_URL=redis://username:password@host:port
    REDIS_PREFIX=vl-survey
    ```
-   [ ] Crear cliente Redis (`lib/redis.ts`):

    ```typescript
    import { Redis } from '@upstash/redis';

    export const redis = new Redis({
        url: process.env.REDIS_URL || '',
        token: process.env.REDIS_TOKEN,
    });
    ```

-   [ ] Migrar rate-limiting a Redis:
    ```typescript
    async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
        const key = `${process.env.REDIS_PREFIX}:ratelimit:${ip}`;
        const current = await redis.incr(key);

        if (current === 1) {
            await redis.expire(key, RATE_LIMIT_WINDOW);
        }

        return { allowed: current <= RATE_LIMIT_MAX };
    }
    ```
-   [ ] Migrar tracking antifraude a Redis:
    ```typescript
    async function trackSuspiciousActivity(ip: string, ticketId?: string): Promise<void> {
        const key = `${process.env.REDIS_PREFIX}:fraud:${ip}`;

        // Pipeline para operaciones atómicas
        await redis
            .pipeline()
            .hincrby(key, 'attempts', 1)
            .hset(key, 'lastAttempt', Date.now())
            .sadd(`${key}:tickets`, ticketId || 'unknown')
            .expire(key, 24 * 60 * 60) // 24h
            .exec();

        // Obtener datos actualizados
        const [attempts, tickets] = await Promise.all([
            redis.hget(key, 'attempts'),
            redis.scard(`${key}:tickets`),
        ]);

        // Lógica de detección...
    }
    ```
-   [ ] Implementar ban temporal en Redis:

    ```typescript
    async function banIP(ip: string, duration: number): Promise<void> {
        const key = `${process.env.REDIS_PREFIX}:banned:${ip}`;
        await redis.set(key, Date.now(), { ex: Math.floor(duration / 1000) });
    }

    async function isIPBanned(ip: string): Promise<boolean> {
        const key = `${process.env.REDIS_PREFIX}:banned:${ip}`;
        return (await redis.exists(key)) > 0;
    }
    ```

-   [ ] Añadir monitorización y métricas:
    ```typescript
    async function incrementMetric(name: string, value = 1): Promise<void> {
        await redis.hincrby(`${process.env.REDIS_PREFIX}:metrics`, name, value);
    }
    ```

### Criterios de aceptación

-   Rate-limiting funciona entre reinicios de servidor
-   Tracking antifraude persiste entre despliegues
-   Rendimiento aceptable (<50ms overhead)
-   Funciona en múltiples instancias (escalabilidad horizontal)
-   Monitorización de uso de Redis implementada
-   Pruebas de carga superadas (>100 req/s)

---

## 3. Tokens de un solo uso con nonce y firma HMAC

**Prioridad**: Alta
**Esfuerzo**: Alto (1-2 sprints)
**Impacto**: Alto (seguridad fundamental)

### Descripción

Implementar tokens JWT de un solo uso con nonce, expiración, firma HMAC y registro de canje para prevenir ataques de replay y fuerza bruta.

### Tareas

-   [ ] Crear estructura de token JWT:
    ```typescript
    interface TokenPayload {
        ticket_id: string;
        exp: number; // Timestamp expiración
        nbf: number; // Not before (timestamp)
        iat: number; // Issued at (timestamp)
        jti: string; // Identificador único (nonce)
        aud: string; // Audience ('vl-survey')
        iss: string; // Issuer ('vl-survey-system')
        sub: string; // Subject (hash del email)
        store_id?: string; // ID de tienda opcional
    }
    ```
-   [ ] Implementar generación de token (`lib/token.ts`):

    ```typescript
    import { SignJWT } from 'jose';
    import { nanoid } from 'nanoid';

    export async function generateToken(ticketId: string, email: string): Promise<string> {
        const jti = nanoid(16);
        const now = Math.floor(Date.now() / 1000);

        const token = await new SignJWT({
            ticket_id: ticketId,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt(now)
            .setNotBefore(now)
            .setExpirationTime('72h')
            .setAudience('vl-survey')
            .setIssuer('vl-survey-system')
            .setJti(jti)
            .setSubject(createHash('sha256').update(email).digest('hex'))
            .sign(JWT_SECRET);

        // Registrar nonce en Redis para prevenir replay
        await redis.set(`${process.env.REDIS_PREFIX}:nonce:${jti}`, ticketId, {
            ex: 72 * 60 * 60, // 72h
            nx: true, // Solo si no existe
        });

        return token;
    }
    ```

-   [ ] Implementar verificación con comprobación de nonce:
    ```typescript
    export async function verifyToken(token: string): Promise<TokenValidation> {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET, {
                algorithms: ['HS256'],
                audience: 'vl-survey',
                issuer: 'vl-survey-system',
            });

            // Verificar nonce no usado (prevenir replay)
            const jti = payload.jti as string;
            const nonceExists = await redis.exists(`${process.env.REDIS_PREFIX}:nonce:${jti}`);

            if (!nonceExists) {
                return { valid: false, error: 'TOKEN_ALREADY_USED' };
            }

            // Marcar como usado (atómico)
            const deleted = await redis.del(`${process.env.REDIS_PREFIX}:nonce:${jti}`);
            if (deleted !== 1) {
                return { valid: false, error: 'RACE_CONDITION' };
            }

            return {
                valid: true,
                ticket_id: payload.ticket_id as string,
            };
        } catch (error) {
            return { valid: false, error: 'INVALID_TOKEN' };
        }
    }
    ```
-   [ ] Implementar endpoint para generar tokens (solo interno):
    ```typescript
    // app/api/admin/generate-token/route.ts (protegido por API key)
    export async function POST(request: NextRequest) {
        // Verificar API key
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== process.env.ADMIN_API_KEY) {
            return NextResponse.json({ success: false }, { status: 401 });
        }

        const { ticket_id, email } = await request.json();
        const token = await generateToken(ticket_id, email);

        return NextResponse.json({ success: true, token });
    }
    ```

### Criterios de aceptación

-   Tokens incluyen todos los campos de seguridad (exp, nbf, jti, etc.)
-   Tokens usados una vez no pueden reutilizarse
-   Tokens expirados son rechazados automáticamente
-   Sistema resistente a race conditions
-   Rendimiento aceptable (<100ms para verificación)
-   Logs detallados de éxito/fracaso de validación

---

## 4. Sistema asíncrono de puntos con cola y idempotencia

**Prioridad**: Alta
**Esfuerzo**: Alto (1-2 sprints)
**Impacto**: Alto (robustez y seguridad)

### Descripción

Migrar el sistema de puntos a una arquitectura asíncrona con colas, garantizando idempotencia y resistencia a fallos.

### Tareas

-   [ ] Añadir dependencia de colas:
    ```bash
    npm install bullmq
    ```
-   [ ] Configurar worker y cola (`lib/queue.ts`):

    ```typescript
    import { Queue, Worker } from 'bullmq';

    export const pointsQueue = new Queue('points', {
        connection: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        },
    });

    // Worker (en proceso separado en producción)
    const worker = new Worker(
        'points',
        async (job) => {
            const { ticketId } = job.data;

            // Generar clave de idempotencia única
            const idempotencyKey = `${ticketId}-${Date.now()}`;

            try {
                // Llamar a ERP con clave de idempotencia
                const result = await callERP(ticketId, idempotencyKey);
                return result;
            } catch (error) {
                // Circuit breaker pattern
                if (job.attemptsMade >= 2) {
                    await logFailedJob(ticketId, error);
                }
                throw error;
            }
        },
        {
            connection: {
                /* ... */
            },
            concurrency: 5,
        }
    );

    worker.on('completed', (job) => {
        console.log(`Points job ${job.id} completed for ticket ${job.data.ticketId}`);
    });

    worker.on('failed', (job, error) => {
        console.error(`Points job ${job.id} failed: ${error.message}`);
    });
    ```

-   [ ] Modificar endpoint para encolar trabajo:
    ```typescript
    // app/api/survey/route.ts
    // Después de guardar encuesta exitosamente:
    await pointsQueue.add(
        'process-points',
        {
            ticketId: surveyData.ticket_id,
            surveyId: survey.id,
            timestamp: new Date().toISOString(),
        },
        {
            jobId: `points-${surveyData.ticket_id}`, // Garantiza unicidad
            removeOnComplete: true,
            removeOnFail: 1000, // Mantener 1000 trabajos fallidos para análisis
        }
    );
    ```
-   [ ] Implementar endpoint para consultar estado:
    ```typescript
    // app/api/points-status/route.ts
    export async function GET(request: NextRequest) {
        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticket_id');

        if (!ticketId) {
            return NextResponse.json({ success: false }, { status: 400 });
        }

        const job = await pointsQueue.getJob(`points-${ticketId}`);

        if (!job) {
            // Buscar en histórico de completados
            const status = await redis.get(`${process.env.REDIS_PREFIX}:points:${ticketId}`);
            if (status) {
                return NextResponse.json({ success: true, status: JSON.parse(status) });
            }
            return NextResponse.json({ success: false, error: 'JOB_NOT_FOUND' });
        }

        return NextResponse.json({
            success: true,
            status: {
                state: await job.getState(),
                progress: job.progress,
                attempts: job.attemptsMade,
            },
        });
    }
    ```

### Criterios de aceptación

-   Los puntos se procesan de forma asíncrona tras submit exitoso
-   Sistema resistente a fallos de ERP (reintentos exponenciales)
-   Idempotencia garantizada (no duplicados)
-   Monitorización y logging completo
-   Dashboard de estado de la cola
-   Procesamiento de backlog automático tras caídas

---

## 5. Detección de comportamiento sospechoso en cliente

**Prioridad**: Media
**Esfuerzo**: Medio (1 sprint)
**Impacto**: Medio (detección avanzada)

### Descripción

Implementar detección de comportamiento sospechoso en cliente para identificar bots y automatización.

### Tareas

-   [ ] Crear módulo de fingerprinting ligero:
    ```typescript
    // lib/client/fingerprint.ts
    export async function generateFingerprint(): Promise<string> {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            !!navigator.plugins.length,
            !!navigator.cookieEnabled,
        ];

        // Hash simple para fingerprint
        const fingerprint = components.join('###');
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));

        return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, 16);
    }
    ```
-   [ ] Implementar tracking de interacciones:

    ```typescript
    // lib/client/behavior.ts
    interface Interaction {
        type: 'click' | 'move' | 'key' | 'scroll';
        timestamp: number;
        data?: any;
    }

    const interactions: Interaction[] = [];
    let startTime = Date.now();

    export function initBehaviorTracking(): void {
        startTime = Date.now();

        document.addEventListener('click', (e) => {
            interactions.push({
                type: 'click',
                timestamp: Date.now() - startTime,
                data: { x: e.clientX, y: e.clientY },
            });
        });

        document.addEventListener(
            'mousemove',
            throttle((e) => {
                interactions.push({
                    type: 'move',
                    timestamp: Date.now() - startTime,
                    data: { x: e.clientX, y: e.clientY },
                });
            }, 200)
        ); // Throttle para no sobrecargar

        // Más eventos...
    }

    export function getBehaviorMetrics(): Record<string, number> {
        if (interactions.length < 5) return { score: 0.5 }; // No hay suficientes datos

        // Métricas
        const clicks = interactions.filter((i) => i.type === 'click').length;
        const moves = interactions.filter((i) => i.type === 'move').length;
        const totalTime = Date.now() - startTime;
        const movesPerSecond = moves / (totalTime / 1000);

        // Patrones sospechosos
        const tooFastClicks = interactions
            .filter((i) => i.type === 'click')
            .some((click, i, arr) => {
                if (i === 0) return false;
                return click.timestamp - arr[i - 1].timestamp < 300; // Menos de 300ms entre clicks
            });

        const straightLineMovement = detectStraightLineMovement(interactions);

        // Puntuación (0-1, menor = más sospechoso)
        let score = 0.5;
        if (movesPerSecond > 50) score -= 0.2;
        if (tooFastClicks) score -= 0.3;
        if (straightLineMovement) score -= 0.3;
        if (clicks === 0) score -= 0.2;

        return {
            score: Math.max(0, Math.min(1, score)),
            movesPerSecond,
            totalInteractions: interactions.length,
            totalTime,
        };
    }
    ```

-   [ ] Integrar en `SurveyForm.tsx`:

    ```tsx
    useEffect(() => {
        initBehaviorTracking();
    }, []);

    const onFormSubmit = async (data: SurveyFormData) => {
        const metrics = getBehaviorMetrics();
        const fingerprint = await generateFingerprint();

        await onSubmit(data, undefined, undefined, {
            behavior: metrics,
            fingerprint,
        });
    };
    ```

-   [ ] Enviar datos al servidor y usar para decisiones:
    ```typescript
    // app/api/survey/route.ts
    const behaviorData = request.headers.get('x-behavior-data');
    if (behaviorData) {
        const metrics = JSON.parse(behaviorData);
        if (metrics.score < 0.3) {
            // Acción según score bajo (posible bot)
            console.log(`[${requestId}] ⚠️ Suspicious behavior detected: ${metrics.score}`);
            // Incrementar contadores, logging, etc.
        }
    }
    ```

### Criterios de aceptación

-   Fingerprinting funciona en navegadores modernos
-   Tracking de comportamiento no afecta rendimiento
-   Métricas de comportamiento son enviadas al servidor
-   Sistema detecta patrones sospechosos básicos
-   Falsos positivos < 1%
-   Datos recopilados cumplen GDPR

---

## Backlog adicional (próximas iteraciones)

1. **Geoblocking configurable**

    - Filtrar por país según configuración
    - Whitelist/blacklist de países

2. **Circuit breaker para ERP**

    - Detección automática de fallos
    - Fallback graceful

3. **Honeypots para bots**

    - Campos ocultos para detectar automatización
    - Rutas trampa

4. **Dashboards de seguridad**

    - Visualización de intentos/bloqueos
    - Alertas en tiempo real

5. **Auditoría y trazabilidad**
    - Logs estructurados
    - Correlación de eventos
