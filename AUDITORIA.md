## Auditoría técnica y de negocio del sistema de encuesta post‑compra con puntos

### Lista de tareas priorizadas

#### Quick wins (1–2 sprints)

-   **[OK] Token seguro en servidor**: Verificar firma JWT (RS256/HMAC), `exp`, `nbf`, `aud` en `validate-token`; eliminar validación local sin firma en producción; rechazar tokens inválidos.
-   **[OK] Ocultar token en URL**: Tras validar, eliminar `t` con `history.replaceState` o redirigir a ruta limpia y conservar un ticket de sesión en `sessionStorage`.
-   **[OK] Validación server-side en `/api/survey`**: Exigir token firmado o `HMAC(ticket_id, nonce)` en cabecera; no aceptar `ticket_id` en claro sin prueba criptográfica.
-   **[KO] Idempotencia mínima**: Compartir almacenamiento entre `status` y `submit`. En producción temporal, usar KV/Redis (SETNX con TTL) para bloquear duplicados por `ticket_id`.
-   **[OK] Contrato de API uniforme**: Estandarizar `{ success, data?, error?, code? }` en todos los endpoints (incluido `earn-points`).
-   **[OK] Endurecer `earn-points`**: Restringir a mismo origen, exigir API key interna o comprobación de procedencia; añadir rate limit; reducir logs.
-   **[OK] Logging seguro**: Enmascarar `ticket_id` en logs, no registrar headers/body completos del ERP, incluir `requestId`.
-   **[OK] Accesibilidad (WCAG 2.1)**: Cambiar estrellas/NPS a `radiogroup`/`radio` con `aria-checked`, navegación con teclado, `aria-live` para errores.
-   **[OK] i18n completa**: Mover copy hardcoded (ProgressBar, ErrorPage, AlreadySubmittedPage) a `messages/*.json`; coherencia de idiomas.
-   **[OK] Gestión de timeout coherente**: Usar estado `timeout` en cliente y mostrar ErrorPage específica; opcional: invalidar en servidor si el token expira por inactividad.
-   **[OK] Anti‑abuso**: Rate limiting por IP/ticket en `/survey` y `/earn-points`; CORS explícito (same-origin); opcional captcha si hay abuso.
-   **[KO] DB/DevOps – variables de entorno**: Alinear `env.example` con el código: añadir `NEXT_PUBLIC_API_BASE_URL`, `ERP_API_BASE_URL`, `ERP_API_USER`, `ERP_API_PWD`; deprecar `ERP_API_URL`/`ERP_API_KEY` o adaptar el código a ellas.
-   **[KO] DB/DevOps – Docker solo DEV**: Marcar `docker-compose.yml` como uso exclusivo de desarrollo; evitar `MYSQL_ROOT_HOST: '%'` y credenciales `root/password` fuera de dev.
-   **[OK] Prisma – schema mínimo**: Añadir `enum WaitTimeRange` y usarlo en `Survey.waitTimeRange`; convertir `SurveySubmission.surveyId` en relación real `@relation` a `Survey`; añadir índices (`submittedAt`, `locale`).
-   **[OK] API + Prisma**: Migrar `/api/survey` y `/api/survey/status` a Prisma y aplicar transacciones para idempotencia: `SurveySubmission.create` (llave única por `ticketId`) → `Survey.create` → actualizar `surveyId`.
-   **[OK] Dependencias**: Si no se usa `@prisma/adapter-mariadb`/Accelerate, eliminarla para reducir confusión.

#### Medio plazo (plataforma robusta)

-   **Persistencia e unicidad**: BD con `surveys` (UNIQUE `ticket_id`) y `point_events` (clave de idempotencia ERP); registro de `token_redemptions` con TTL.
-   **Orquestación de puntos server-side**: Mover la llamada al ERP a un job asíncrono (cola BullMQ/Cloud Tasks) idempotente con reintentos y circuit breaker.
-   **Observabilidad**: Trazas OTel, métricas (conversión, error rate, tiempo a completar), dashboards y alertas.
-   **Seguridad y cumplimiento**: Política de retención/anonimización, gestión de secretos, cabeceras de seguridad (CSP, HSTS), rotación de credenciales ERP.
-   **Calidad**: Tests unitarios/integración/e2e (Playwright), contract tests con stub del ERP; pruebas de carga.
-   **Modelo de datos ampliado**: Añadir campos para auditoría/antifraude (`purchaseDatetime`, `storeId`, `ipHash`, `userAgent`); constraints de longitud de `comment` (≤250) y rangos para puntuaciones.
-   **Migraciones y despliegue**: Incorporar `prisma migrate deploy` en CI/CD con backups previos y verificación post‑migración.

#### Largo plazo (roadmap)

-   **Tokens de un solo uso**: Canje e invalidación tras consumo; incluir metadatos (fecha compra, tienda, hash de email) y expiración 48–72h.
-   **Backoffice de auditoría**: Estado de encuestas, puntos y causas de no elegibilidad por `ticket_id`.
-   **Antifraude**: Detección de patrones anómalos (múltiples intentos por IP/UA), listas grises/negras.
-   **Operación avanzada**: Despliegues blue/green, SLO/SLA, rollback automatizado y reporting ejecutivo.

### Informe de auditoría

#### Hallazgos críticos

-   **Validación de tokens débil**: Se decodifica el JWT sin verificar firma ni `exp`/`nbf`. Aceptación de tokens forjados facilita abuso.
-   **Token expuesto en URL**: El parámetro `t` puede filtrarse vía Referer/historiales.
-   **Encuesta sin atar a token en servidor**: `/api/survey` acepta `ticket_id` sin prueba criptográfica; permite envíos falsos.
-   **Idempotencia no persistente**: Uso de `Set` en memoria y no compartido entre `status` y `submit`; susceptible a duplicados y pérdida en reinicios.
-   **Proxy ERP sin control**: `/api/earn-points` invocable por cualquiera; sin autenticación interna ni rate limit; logging excesivo.
-   **Accesibilidad insuficiente**: Controles personalizados sin semántica ARIA ni navegación por teclado.
-   **i18n inconsistente**: Textos hardcoded y mezcla de idiomas fuera de `messages/*.json`.
-   **Desalineación de entorno/ERP**: Variables definidas en `env.example` (`ERP_API_URL`, `ERP_API_KEY`) no coinciden con las utilizadas en código (`ERP_API_BASE_URL`, `ERP_API_USER`, `ERP_API_PWD`).
-   **Docker inseguro para prod**: `root/password` y `MYSQL_ROOT_HOST: '%'` expuestos; válido solo para desarrollo.

#### Riesgos potenciales

-   **Suplantación/fraude**: Forja de tokens/IDs para enviar encuestas o forzar puntos.
-   **Privacidad/RGPD**: Exposición del token por Referer; logs con datos sensibles; falta de política de retención.
-   **Abuso/DoS lógico**: Llamadas masivas a ERP; reintentos concurrentes sin bloqueo.
-   **XSS/CSRF**: Futuro XSS si se imprime comentario sin sanitizar; abuso cross-site en endpoints sin CORS/limitación.
-   **Observabilidad limitada**: Sin trazas/metrics/alertas que permitan respuesta rápida a incidentes.
-   **Condiciones de carrera en BD**: Sin transacciones/idempotencia persistente, dos envíos simultáneos podrían crear duplicados.

#### Recomendaciones clave (resumen)

-   Verificar firma JWT y metadatos; ocultar token en URL.
-   Validar encuesta en servidor con prueba criptográfica y unicidad persistente.
-   Mover puntos al servidor con job idempotente; proteger `/earn-points`.
-   Estandarizar contratos API y endurecer logging.
-   Mejorar accesibilidad e internacionalización.
-   Añadir rate limiting, CORS y seguridad operativa.

#### Observaciones por fichero (extracto)

-   **`app/api/validate-token/route.ts`**: Confía en validación local; requiere verificación criptográfica y rechazo estricto en producción.
-   **`app/api/survey/route.ts`** y **`app/api/survey/status/route.ts`**: Sets independientes; sin idempotencia persistente; sin validación de token en servidor.
-   **`app/api/earn-points/route.ts`**: Contrato inconsistente, sin control de acceso ni rate limit; logs verbosos.
-   **`components/SurveyForm.tsx`**: Buen flujo escalonado; faltan roles ARIA y soporte teclado.
-   **`components/SurveyContainer.tsx`**: Timeout cambia a `error`; usar tipo `timeout`; delegar puntos al servidor.
-   **`components/ProgressBar.tsx`, `AlreadySubmittedPage.tsx`, `ErrorPage.tsx`**: Copys fuera de i18n; mover a `messages/*`.
-   **`prisma/schema.prisma`**: Añadir `enum` para tiempo de espera; definir relación `SurveySubmission` → `Survey` con `@relation`; mantener `ticketId @unique` como llave de idempotencia; añadir índices (`submittedAt`, `locale`).
-   **`lib/prisma.ts`**: Correcto para dev; en prod limitar logs; valorar `@prisma/adapter-mariadb`/Accelerate si se despliega en serverless.
-   **`docker-compose.yml`**: Uso exclusivo DEV; credenciales y `MYSQL_ROOT_HOST: '%'` no aptos para prod; puerto 3310 documentado.
-   **`env.example`**: Añadir `NEXT_PUBLIC_API_BASE_URL`, `ERP_API_BASE_URL`, `ERP_API_USER`, `ERP_API_PWD` y ejemplo de URL con SSL/UTC; alinear con el código.
-   **`scripts/test-mariadb-connection.js`**: OK; enmascara credenciales y valida tablas.
-   **`DOCKER-SETUP.md`**: Correcto; añadir nota visible “solo desarrollo”.

#### Riesgos de negocio

-   **Coste de puntos**: Generación indebida por abuso; impacto económico.
-   **Sesgo de métricas**: Duplicados/encuestas falsas afectan NPS/CSAT y decisiones.
-   **Reputación**: Mensajes/idiomas inconsistentes y fallos de puntos generan fricción y contactos a soporte.

#### Riesgos legales (RGPD)

-   **Exposición de token** y **logs innecesarios**: Necesario minimizar y proteger.
-   **Retención/anonimización**: Definir plazos; anonimizar comentarios si no son necesarios a largo plazo.
-   **Base jurídica**: Documentar legitimación y relación `ticket_id` ↔ cliente si aplica.

#### Roadmap de evolución

-   Persistencia + job de puntos + observabilidad (1–2 sprints).
-   Tokens de un solo uso + antifraude + seguridad avanzada (2–3 sprints).
-   Backoffice y reporting + pruebas de carga y SLOs (3–4 sprints).

---

Este documento resume el estado actual y un plan accionable para llevar la solución a estándares de producción con foco en seguridad, idempotencia, accesibilidad y operación.
