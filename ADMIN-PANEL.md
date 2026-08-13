# Panel de Administración - Encuestas Post-Compra

## Descripción General

El panel de administración proporciona una interfaz completa para gestionar y analizar las encuestas post-compra. Incluye dashboards interactivos, visualización de datos, filtros avanzados y funcionalidades de exportación.

## Características Principales

### 🔐 Autenticación Segura

-   Sistema de login con usuario y contraseña
-   Sesiones con expiración automática (8 horas)
-   Protección de rutas API con middleware
-   Variables de entorno para credenciales

### 📊 Dashboard Principal

-   **Métricas Clave**: Total encuestas, CSAT promedio, NPS, valoración vendedor
-   **Visualizaciones**: Gráficos de distribución y barras de progreso
-   **Tiempo Real**: Auto-actualización cada 30 segundos
-   **Estados de Puntos**: Seguimiento del procesamiento ERP

### 📈 Gráficos Avanzados

-   **Gráficos Circulares**: Métricas de satisfacción con indicadores visuales
-   **Gráficos de Barras**: Distribución de tiempo de espera y estados
-   **Indicadores de Rendimiento**: Barras de progreso con gradientes de color
-   **Resumen de Puntos**: Estadísticas detalladas del sistema de puntos

### 📋 Tabla de Datos Detallada

-   **Paginación**: Navegación eficiente por grandes conjuntos de datos
-   **Filtros Avanzados**: Por CSAT, NPS, estado de puntos, fechas
-   **Exportación CSV**: Descarga de datos para análisis externo
-   **Vista Responsive**: Optimizada para diferentes tamaños de pantalla

## Acceso al Panel

### URL de Acceso

```
https://tu-dominio.com/[locale]/admin
```

### Credenciales por Defecto

-   **Usuario**: `admin`
-   **Contraseña**: `viladomat2024`

⚠️ **IMPORTANTE**: Cambiar estas credenciales en producción usando variables de entorno.

## Configuración

### Variables de Entorno Requeridas

```env
# Credenciales del Panel de Administración
ADMIN_USERNAME="tu-usuario-admin"
ADMIN_PASSWORD="tu-contraseña-segura"

# API Key para endpoints protegidos
ADMIN_API_KEY="tu-api-key-segura"

# Para componentes que usan variables públicas
NEXT_PUBLIC_ADMIN_USERNAME="tu-usuario-admin"
NEXT_PUBLIC_ADMIN_PASSWORD="tu-contraseña-segura"
NEXT_PUBLIC_ADMIN_API_KEY="tu-api-key-segura"
```

### Seguridad Recomendada

1. **Credenciales Fuertes**: Usar contraseñas complejas
2. **API Keys Únicas**: Generar claves aleatorias seguras
3. **HTTPS**: Siempre usar conexiones seguras en producción
4. **Firewall**: Restringir acceso por IP si es posible

## Estructura de Archivos

```
components/
├── AdminLogin.tsx          # Componente de autenticación
├── AdminDashboard.tsx      # Dashboard principal
├── AdminDataTable.tsx      # Tabla de datos con filtros
└── AdminCharts.tsx         # Gráficos avanzados

app/[locale]/admin/
└── page.tsx               # Página principal del admin

app/api/admin/
├── stats/route.ts         # Estadísticas generales
└── surveys/route.ts       # Datos de encuestas paginados

lib/
└── admin-auth.ts          # Utilidades de autenticación
```

## Funcionalidades Detalladas

### Dashboard Principal

-   **Métricas en Tiempo Real**: Actualización automática de estadísticas
-   **Indicadores Visuales**: Colores que reflejan el rendimiento
-   **Navegación Intuitiva**: Acceso rápido a diferentes vistas

### Gestión de Datos

-   **Filtros Inteligentes**: Búsqueda por múltiples criterios
-   **Exportación Flexible**: Datos en formato CSV para análisis
-   **Paginación Eficiente**: Manejo de grandes volúmenes de datos

### Visualización Avanzada

-   **Gráficos Interactivos**: Representación visual de métricas
-   **Animaciones Suaves**: Transiciones CSS para mejor UX
-   **Responsive Design**: Adaptación a todos los dispositivos

## API Endpoints

### GET `/api/admin/stats`

Obtiene estadísticas generales del sistema.

**Headers Requeridos:**

```
x-api-key: tu-api-key
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalSurveys": 1250,
    "averageCsat": 4.2,
    "averageNps": 7.8,
    "averageSalespersonRating": 4.5,
    "foundEverythingPercentage": 85.5,
    "waitTimeDistribution": {...},
    "pointsDistribution": {...},
    "totalPointsEarned": 45230,
    "pointsSuccessRate": 92.3
  }
}
```

### GET `/api/admin/surveys`

Obtiene datos detallados de encuestas con paginación y filtros.

**Parámetros de Query:**

-   `page`: Número de página (default: 1)
-   `limit`: Elementos por página (default: 20)
-   `minCsat`: CSAT mínimo
-   `minNps`: NPS mínimo
-   `pointsStatus`: Estado de puntos
-   `dateFrom`: Fecha desde

## Monitoreo y Logs

El sistema incluye logging detallado para:

-   Intentos de autenticación
-   Accesos a endpoints protegidos
-   Errores y excepciones
-   Métricas de rendimiento

Los logs se pueden encontrar en la consola del servidor con el formato:

```
[requestId] ✅ Action completed: details
[requestId] ❌ Error occurred: error details
```

## Solución de Problemas

### Error de Autenticación

-   Verificar credenciales en variables de entorno
-   Comprobar que las variables públicas coinciden
-   Revisar la configuración del middleware

### Datos No Aparecen

-   Verificar conexión a la base de datos
-   Comprobar que hay datos de encuestas
-   Revisar logs del servidor para errores

### Gráficos No Se Cargan

-   Verificar que la API responde correctamente
-   Comprobar la consola del navegador por errores JavaScript
-   Revisar la configuración de CORS si es necesario

## Actualizaciones Futuras

### Mejoras Planificadas

-   [ ] Filtros por rango de fechas más granulares
-   [ ] Exportación en múltiples formatos (Excel, PDF)
-   [ ] Notificaciones en tiempo real
-   [ ] Dashboard personalizable por usuario
-   [ ] Integración con sistemas de alertas
-   [ ] Análisis predictivo con IA

### Métricas Adicionales

-   [ ] Tendencias temporales
-   [ ] Comparativas por períodos
-   [ ] Segmentación por ubicación/vendedor
-   [ ] Análisis de sentimientos en comentarios

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contactar con el equipo de desarrollo.

---

**Última actualización**: Septiembre 2024  
**Versión**: 1.0.0


