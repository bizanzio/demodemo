## Casuísticas adicionales de fuerza bruta, fraude y abuso

### 1) Enumeración de tickets (patrones predecibles)

-   Señales:
    -   Muchas respuestas `NO_TICKET` en poco tiempo; secuencias incrementales (E/12190, E/12191...)
    -   Cambios rápidos de `ticket_id` desde misma IP/UA
-   Mitigaciones:
    -   Tokens de un solo uso firmados (HMAC/RS256) con `ticket_id` ofuscado o hasheado con sal
    -   Límite de tickets distintos por IP/UA por día (p. ej. 3)
    -   Tarpitting (pequeño retraso incremental tras errores repetidos)
    -   Respuestas con tiempo constante para evitar inferencias por timing
-   Severidad: Alta. Prioridad: Alta

### 2) Reintentos coordinados multi-IP (botnet)

-   Señales:
    -   Múltiples IPs con mismo UA/proxy, picos simultáneos, países atípicos
-   Mitigaciones:
    -   Fingerprint ligero (IP + UA + hints) y reputación IP
    -   CAPTCHA adaptable/Turnstile si señal de automatización
    -   Geo-restricción opcional según negocio
-   Severidad: Alta. Prioridad: Media-Alta

### 3) Reaprovechamiento de token (replay)

-   Señales:
    -   Mismo token/`ticket_id` usado desde distintas IPs/UA
-   Mitigaciones:
    -   Nonce/one-time token; marcar canjeo y expirar
    -   TTL corto (48–72h) y binding suave a fingerprint
-   Severidad: Alta. Prioridad: Alta

### 4) Escáneres de correo (email link scanners)

-   Señales:
    -   Accesos GET sin interacción humana, UAs de gateways (Proofpoint, Barracuda…)
-   Mitigaciones:
    -   No invalidar token en GET; sólo tras submit válido
    -   Lista de UAs de bots; diferir validación hasta interacción (JS/humano)
-   Severidad: Media. Prioridad: Alta (impacta conversión)

### 5) Abuso del endpoint de puntos antes del submit

-   Señales:
    -   Llamadas a `/earn-points` sin encuesta previa
-   Mitigaciones:
    -   Disparar puntos desde el servidor tras persistencia (job cola)
    -   Clave de idempotencia por `ticket_id` en ERP
-   Severidad: Alta. Prioridad: Alta

### 6) Automatización headless (bots de UI)

-   Señales:
    -   Ritmos de clic uniformes, tiempos demasiado bajos, sin eventos de input naturales
-   Mitigaciones:
    -   Turnstile/hCaptcha adaptativo, tiempos mínimos entre pasos, detección heurística
-   Severidad: Media. Prioridad: Media

### 7) Ataques de timing para inferir existencia

-   Señales:
    -   Medición de latencias para distinguir tokens válidos/ inválidos
-   Mitigaciones:
    -   Normalizar latencia de respuestas y mensajes genéricos
-   Severidad: Media. Prioridad: Media

### 8) Saturación por payloads o campos (comentarios)

-   Señales:
    -   Intentos con comentarios máximos/repetidos
-   Mitigaciones:
    -   Límite server-side (ya 250), WAF y size limits (body-parser)
-   Severidad: Baja-Media. Prioridad: Media

### 9) Evasión de rate-limit cambiando IP/UA (proxies/TOR)

-   Señales:
    -   Muchas IPs con baja persistencia; UAs genéricos
-   Mitigaciones:
    -   Combinar cuotas IP+UA+cookie; reputación; listas grises
    -   Tarpit y escalado de costes (puzzles ligeros)
-   Severidad: Alta. Prioridad: Media-Alta

### 10) Envíos fuera de ventana temporal/horario

-   Señales:
    -   Tokens usados fuera de 48–72h o en horarios anómalos
-   Mitigaciones:
    -   Validar `purchase_datetime`/`exp` y rechazar tras ventana; logs y alertas
-   Severidad: Media. Prioridad: Media

### 11) Compartición de enlace (forward)

-   Señales:
    -   Múltiples accesos a mismo token desde ubicaciones distintas
-   Mitigaciones:
    -   One-time token + fingerprint suave; opción OTP por email/SMS si crítico
-   Severidad: Media. Prioridad: Media

### 12) Fuzzing de API y verbos no permitidos

-   Señales:
    -   Solicitudes con métodos inesperados, rutas anómalas
-   Mitigaciones:
    -   Validación estricta de esquema; 405/404 uniformes; WAF
-   Severidad: Media. Prioridad: Media

### 13) CSRF-like y CORS

-   Señales:
    -   POST cross-site; formularios externos
-   Mitigaciones:
    -   CORS same-origin (implementado), sin cookies/sesión en API pública
-   Severidad: Media. Prioridad: Ya mitigado

### 14) Falsos positivos por NAT/CGNAT

-   Señales:
    -   Muchas solicitudes desde misma IP compartida (red corporativa)
-   Mitigaciones:
    -   Umbrales por IP flexibles; combinar con UA/cookies; whitelists contextuales
-   Severidad: Media. Prioridad: Media

### 15) Bypass de límites por reinicios (rate-limit en memoria)

-   Señales:
    -   Reseteos de contadores al reiniciar instancias
-   Mitigaciones:
    -   Almacenar límites/antifraude en Redis/KV distribuido
-   Severidad: Media. Prioridad: Alta (operativa)

### 16) Diferencias de idioma/ruta para evadir reglas

-   Señales:
    -   Accesos a variantes de ruta/idioma inusuales
-   Mitigaciones:
    -   Middleware de routing estricto; normalizar paths/idiomas
-   Severidad: Baja. Prioridad: Baja

### 17) Agotamiento de ERP (DoS lógico)

-   Señales:
    -   Pico de llamadas a ERP sin encuesta válida
-   Mitigaciones:
    -   Orquestar puntos asíncrono con colas; circuit breaker y backoff
-   Severidad: Alta. Prioridad: Alta

---

## Matriz de priorización

-   Alta/Alta: Tokens de un solo uso; puntos server-side; Redis para límites; rate-limit multi-dimensional
-   Alta/Media: Tarpit; normalización de tiempos; Turnstile adaptativo
-   Media: Fingerprint suave; whitelists contextuales; geoblocking selectivo

## KPIs de detección y eficacia

-   Falsos positivos < 0.1%; tiempo de detección < 5 min; eficacia de ban > 95%
-   Ratio tokens válidos/inválidos; tickets únicos por IP/UA; latencia media por código de error

## Roadmap técnico

1. Redis/Upstash per rate-limit i antifraude (2 sprints)
2. Orquestració de punts asíncrona + idempotència ERP (2 sprints)
3. Turnstile/CAPTCHA adaptatiu + heurística de comportament (1 sprint)
4. Observabilitat (ELK/OTel) + alertes (1 sprint)
