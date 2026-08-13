# Viladomat - Enquesta de Satisfacció Post-Compra

Una aplicació web Next.js 15 per recollir feedback dels clients després de la compra, amb suport complet per a internacionalització, validació de tokens JWT i integració API.

## 🚀 Característiques

-   **Internacionalització completa**: Català, Castellà, Anglès i Francès
-   **Validació de tokens JWT**: Seguretat amb tokens signats
-   **6 Preguntes d'enquesta**:
    -   CSAT (Customer Satisfaction) - Estrelles 1-5
    -   NPS (Net Promoter Score) - Slider 0-10
    -   Valoració venedor - Estrelles 1-5
    -   Ha trobat tot? - Sí/No
    -   Temps d'espera - 4 opcions
    -   Comentaris opcionals - Textarea 250 chars
-   **UX optimitzat**: Mobile-first, barra de progrés, accessibilitat AA
-   **Validació robusta**: Zod + React Hook Form
-   **Timeout de sessió**: 5 minuts d'inactivitat
-   **Prevenció de duplicats**: Verificació per ticket_id

## 🛠 Stack Tecnològic

-   **Framework**: Next.js 15.4.6 (App Router)
-   **Llenguatge**: TypeScript
-   **Estilització**: TailwindCSS
-   **Internacionalització**: next-intl
-   **Formularis**: React Hook Form + Zod
-   **Icons**: Lucide React
-   **HTTP Client**: Axios
-   **JWT**: jose (opcional per validació local)

## 📋 Prerequisits

-   Node.js 18.17+
-   npm 9+

## 🔧 Instal·lació

```bash
# Clonar el repositori
git clone <repo-url>
cd vl-nextjs-purchase-survey

# Instal·lar dependències
npm install

# Configurar variables d'entorn
cp .env.example .env.local
# Editar .env.local amb la configuració correcta

# Executar en desenvolupament
npm run dev
```

## 🌐 Variables d'Entorn

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.viladomat.com

# ERP API Configuration (per EarnPoints)
# IMPORTANT: Incloure protocol (http:// o https://)
ERP_API_BASE_URL=https://erp.viladomat.com
ERP_API_USER=your-erp-username
ERP_API_PWD=your-erp-password

# Per desenvolupament local:
# ERP_API_BASE_URL=http://localhost:3001
# ERP_API_USER=admin
# ERP_API_PWD=admin

# JWT Secret (només dev)
JWT_SECRET=your-super-secret-jwt-key

# Environment
NODE_ENV=development
```

## 📖 Ús

### URL d'accés

```
https://survey.viladomat.com/ca?t=<JWT_TOKEN>
```

### Format del token

**Producció (JWT):**

```json
{
    "ticket_id": "CV0001000974"
}
```

**Desenvolupament (accepta múltiples formats):**

-   JWT: Token estàndard amb payload
-   Número de tiquet: `E/12191`, `CV/123456`
-   Tokens de test: `dev-token`, `test`, `placeholder`

### API Endpoints (implementats)

#### Validació de token

```bash
GET /api/validate-token?t=<token>
Response: {
  "success": true,
  "data": {
    "valid": true,
    "ticket_id": "123456789"
  }
}
```

#### Comprovar estat enquesta

```bash
GET /api/survey/status?ticket_id=<id>
Response: {
  "success": true,
  "data": {
    "exists": false
  }
}
```

#### Enviar enquesta

```bash
POST /api/survey
Body: {
  "ticket_id": "123456789",
  "answers": {
    "csat": 4,
    "nps": 9,
    "salesperson_rating": 5,
    "found_everything": true,
    "wait_time": "2to5",
    "comment": "Molt bon servei!"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Afegir punts (proxy a ERP)

```bash
POST /api/earn-points
Body: {
  "ticket_id": "CV0001000974"
}
Response: {
  "result": {
    "businessPartnerId": "B39FD2E7078A43A4E7D70761D43D2F16",
    "totalpoints": "10.40",
    "earnedpoints": "1.71",
    "details": [
      {
        "description": "Punts generats per enquesta",
        "amt": 1.71
      }
    ]
  },
  "success": true,
  "code_message": "PROCESSED"
}
```

_Nota: Aquest endpoint fa de proxy cap a l'ERP real (`${ERP_API_BASE_URL}/ws/EarnPoints`) amb autenticació Basic Auth_

## 🏗 Arquitectura

```
app/
├── [locale]/                 # Rutes internacionalitzades
│   ├── layout.tsx           # Layout principal amb i18n
│   ├── page.tsx             # Redirect a survey
│   └── survey/
│       └── page.tsx         # Pàgina principal enquesta
├── api/                     # API Routes (Next.js)
│   ├── validate-token/
│   │   └── route.ts         # Validació JWT
│   ├── earn-points/
│   │   └── route.ts         # Proxy cap a ERP (afegir punts)
│   └── survey/
│       ├── route.ts         # Enviar enquesta
│       └── status/
│           └── route.ts     # Estat enquesta
components/
├── SurveyContainer.tsx      # Contenidor principal
├── SurveyForm.tsx          # Formulari amb navegació
├── ProgressBar.tsx         # Barra de progrés
├── ErrorPage.tsx           # Gestió d'errors
├── AlreadySubmittedPage.tsx # Pàgina ja respost
├── SuccessPage.tsx         # Pàgina d'èxit
└── questions/              # Components preguntes
    ├── CSATQuestion.tsx
    ├── NPSQuestion.tsx
    ├── SalespersonQuestion.tsx
    ├── FoundEverythingQuestion.tsx
    ├── WaitTimeQuestion.tsx
    └── CommentQuestion.tsx
lib/
└── api.ts                  # Client API
messages/                   # Traduccions i18n
├── ca.json
├── es.json
├── en.json
└── fr.json
types/
└── global.d.ts            # Definicions TypeScript
```

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build per producció
npm run build
```

## 📱 Responsive & Accessibilitat

-   **Mobile-first design**
-   **Contrast AA compliant**
-   **Keyboard navigation**
-   **Screen reader friendly**
-   **Focus management**
-   **ARIA labels**

## ⚡ Rendiment

-   **Objectiu UX**: Completar en < 45 segons
-   **Timeout sessió**: 5 minuts
-   **Optimitzacions**:
    -   Server-side rendering (SSR)
    -   Code splitting automàtic
    -   Image optimization
    -   Tree shaking

## 🔒 Seguretat

-   **Token JWT validation**
-   **Headers de seguretat**
-   **No indexació per robots**
-   **CSRF protection**
-   **Input sanitization**

## 🚀 Desplegament

```bash
# Build per producció
npm run build

# Iniciar servidor
npm start

# O utilitzar next export per estàtic
next export
```

## 🛡 Gestió d'Errors

-   Token invàlid/expirat
-   Enquesta ja completada
-   Timeout de sessió
-   Errors de xarxa
-   Validació de formulari

## 📊 Monitorització

El sistema està preparat per integrar:

-   Google Analytics 4
-   Plausible Analytics
-   Logs estructurats
-   Error tracking (Sentry)

## 🔄 Flux d'usuari

1. Usuari clica enllaç email amb token
2. Validació automàtica del token
3. Verificació anti-duplicats
4. Presentació formulari interactiu
5. Validació pas a pas
6. Enviament a API interna
7. Confirmació + punts (si customer_id)

## 🤝 Contribució

1. Fork del projecte
2. Crear branch feature (`git checkout -b feature/nova-funcionalitat`)
3. Commit canvis (`git commit -am 'Afegir nova funcionalitat'`)
4. Push al branch (`git push origin feature/nova-funcionalitat`)
5. Crear Pull Request

## 📝 Llicència

Aquest projecte és propietat de Viladomat.

---

**Desenvolupat amb ❤️ per l'equip de Viladomat**
