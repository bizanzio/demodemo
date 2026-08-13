# Configuración de Base de Datos MariaDB + Prisma

## Adaptador MariaDB

Este proyecto usa el adaptador oficial de MariaDB para Prisma (`@prisma/adapter-mariadb`) que ofrece:

-   ✅ **Compatibilidad nativa** con MariaDB
-   ✅ **Pool de conexiones optimizado** para mejor rendimiento
-   ✅ **Configuraciones específicas** para MariaDB
-   ✅ **Mejor manejo de tipos** MariaDB vs MySQL

## Schema Optimizado

El schema ha sido simplificado para incluir solo lo esencial:

### Tablas

1. **`surveys`** - Datos principales de las encuestas
2. **`survey_submissions`** - Control de idempotencia

### Campos eliminados

-   ❌ `points_transactions` - Se maneja via API externa
-   ❌ `session_tokens` - Los tokens son JWT, no necesitan persistencia
-   ❌ `audit_logs` - Los logs van a archivos, no BD
-   ❌ Campos de tracking como `userAgent`, `ipAddress` - Innecesarios para MVP

## Configuración

### 1. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Base de datos MySQL
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/vl_survey_db"

# Otras variables necesarias
NODE_ENV="development"
JWT_SECRET="tu-clave-secreta-jwt-aqui"
```

### 2. Comandos de Setup

```bash
# Generar cliente Prisma
npm run db:generate

# Crear y ejecutar migración inicial
npm run db:migrate

# Poblar con datos de ejemplo (opcional)
npm run db:seed

# Ver base de datos (opcional)
npm run db:studio
```

## Scripts Disponibles

-   `db:generate` - Genera el cliente de Prisma
-   `db:migrate` - Crea y ejecuta migraciones
-   `db:push` - Push del schema sin migraciones (desarrollo)
-   `db:seed` - Poblar con datos de ejemplo
-   `db:studio` - Interfaz web para ver datos
-   `db:reset` - Resetear completamente la BD
-   `db:test` - **NUEVO**: Probar conexión con MariaDB

## Uso en el Código

```typescript
import { SurveyService } from '@/lib/survey-service';

// Verificar si existe encuesta
const existing = await SurveyService.checkExistingSubmission(ticketId);

// Crear nueva encuesta
const survey = await SurveyService.createSurvey(surveyData);

// Obtener estadísticas
const stats = await SurveyService.getStats();
```

## Estructura de Datos

### Survey

```typescript
{
  id: string;
  ticketId: string;
  csatScore: number; // 1-5
  npsScore: number; // 0-10
  salespersonRating: number; // 1-5
  foundEverything: boolean;
  waitTimeRange: 'less2' | '2to5' | '5to10' | 'more10';
  comment?: string;
  locale?: string;
  submittedAt: Date;
}
```

### SurveySubmission (Idempotencia)

```typescript
{
  id: string;
  ticketId: string;
  surveyId?: string;
  status: 'completed' | 'failed';
  createdAt: Date;
}
```

## Migración desde Sistema Actual

El `SurveyService` incluye un método `mapSurveyDataToInput()` para convertir los datos actuales del formato `SurveyData` al nuevo formato optimizado.

## Configuración Específica de MariaDB

### Dependencias Instaladas

```bash
npm install @prisma/adapter-mariadb mariadb
```

### Características del Adaptador

-   **Pool de conexiones**: Configurado con límites optimizados
-   **Compresión**: Habilitada para mejor rendimiento
-   **Timeouts**: Configurados para evitar conexiones colgadas
-   **Detección de fugas**: Deshabilitada para desarrollo

### Configuración de Conexión

```bash
# Básica
DATABASE_URL="mysql://user:pass@localhost:3306/db_name"

# Con optimizaciones MariaDB
DATABASE_URL="mysql://user:pass@host:port/db?charset=utf8mb4&collation=utf8mb4_unicode_ci&timezone=UTC"
```

### Probar Conexión

```bash
# Probar que MariaDB funciona correctamente
npm run db:test
```

Este script verificará:

-   ✅ Conexión básica
-   ✅ Versión de MariaDB
-   ✅ Funcionalidad del adaptador
-   ✅ Estado de las tablas del schema
