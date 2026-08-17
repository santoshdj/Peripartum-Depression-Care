# MathruMaitri

**Sanskrit:** मातृमैत्री (Mother-Friendship)

A patient-facing **SMART on FHIR standalone app** for peripartum depression screening, monitoring, peer support, and care coordination — **compatible with any FHIR R4-compliant EHR** (Epic, Cerner, Allscripts, athenahealth, and more).
Patients log in with their existing EHR credentials (MyChart, Patient Portal, etc.), complete validated EPDS screenings that write back to their clinical record, share diary entries with their care team, connect with other mothers anonymously, and receive AI-generated care plan guidance.
_Formerly: Peripartum Depression Care Platform (internal technical name)_

> **Multi-Provider Support:** Works with any FHIR R4-compliant EHR. See [docs/EHR_PROVIDER_SETUP.md](docs/EHR_PROVIDER_SETUP.md) for provider-specific configuration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Patient's Browser                      │
│                                                          │
│  Next.js 14 (App Router)                                │
│  shadcn/ui + Tailwind CSS                               │
│  ← HttpOnly session cookie only; no FHIR token →        │
└───────────────────┬─────────────────────────────────────┘
                    │ REST (credentials: include)
                    ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.12)               │
│                                                          │
│  SMART OAuth2 PKCE flow          EPDS risk scoring       │
│  Multi-provider config           Anthropic Claude        │
│  FHIR orchestration layer        narrative summary       │
│  Session management (Postgres)                           │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────┐    ┌──────────────────────────────┐
│   Postgres DB       │    │   EHR FHIR Server             │
│                    │    │   (Epic, Cerner, etc.)        │
│   sessions         │    │                              │
│   auth_states      │    │   Patient / Observation       │
│   epds_cache       │    │   Condition / Medication      │
│   journal_entries  │    │   Appointment / CarePlan      │
│   llm_audit_log    │    │   QuestionnaireResponse       │
└────────────────────┘    └──────────────────────────────┘
```

**Key principle:** The FHIR access token never reaches the browser. FastAPI owns the entire SMART OAuth2 PKCE flow and proxies all FHIR calls server-side.

## Features

| Feature | Description |
|---|---|
| **SMART on FHIR login** | Standalone launch via patient portal — no separate account |
| **AI Health Summary** | Anthropic Claude generates a plain-language dashboard summary on every visit |
| **EPDS Screening** | Self-administer the Edinburgh Postnatal Depression Scale at any time |
| **EHR Write-Back** | EPDS responses and scores written back to the patient's clinical record as FHIR resources |
| **Risk Alerting** | Immediate flag + care team contact prompt when EPDS score ≥ 10 |
| **Score History** | Interactive timeline chart of all past EPDS scores |
| **Full FHIR Data** | Conditions, medications, appointments, labs, vitals, care plan — all from patient's EHR |
| **Crisis Resources** | Always-accessible page with National Maternal Mental Health Hotline and coping resources |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, shadcn/ui, Tailwind CSS, recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| Package manager | `uv` + `pyproject.toml` |
| Database | Postgres 16 |
| AI | Anthropic Claude (`claude-3-5-sonnet-20241022`) |
| FHIR | Any FHIR R4-compliant EHR — SMART on FHIR standalone |
| Auth | SMART on FHIR OAuth2 PKCE, HttpOnly session cookies |
| Dev infra | Docker Compose |
| Cloud | Railway (backend + frontend + Postgres plugin) |
| Testing | pytest, httpx, respx, Playwright |

---

## Project Structure

```
Peripartum-Depression-Care-Platform/
├── docker-compose.yml          # Local dev: frontend + backend + postgres
├── CONTEXT.md                  # Domain glossary (canonical terms)
├── .env.example                # Environment variable template
│
├── backend/
│   ├── pyproject.toml          # uv project config + dependencies
│   ├── uv.lock
│   ├── Dockerfile
│   ├── railway.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── middleware/
│   │   │   └── session.py      # Session cookie → DB row resolution
│   │   ├── models/
│   │   │   ├── session.py      # SQLAlchemy Session model
│   │   │   ├── epds_cache.py
│   │   │   └── llm_audit_log.py
│   │   ├── routers/
│   │   │   ├── auth.py         # /auth/launch, /auth/callback, /auth/logout
│   │   │   ├── dashboard.py    # GET /api/dashboard
│   │   │   ├── screening.py    # GET /api/screening/questionnaire, POST /api/screening/submit
│   │   │   ├── history.py      # GET /api/history/epds
│   │   │   └── fhir.py         # /api/fhir/conditions, /medications, /appointments, etc.
│   │   ├── services/
│   │   │   ├── smart_auth.py   # PKCE flow, token exchange
│   │   │   ├── fhir_client.py  # httpx async FHIR HTTP client
│   │   │   ├── fhir_resources.py # Per-resource FHIR fetch/write functions
│   │   │   ├── epds_service.py # Questionnaire definition, scoring, risk assessment
│   │   │   └── summary_service.py # Anthropic Claude narrative summary
│   │   └── utils/
│   │       └── config.py       # Pydantic Settings
│   └── tests/
│       ├── unit/
│       │   ├── test_epds_service.py
│       │   └── test_summary_service.py
│       └── integration/
│           ├── test_auth.py
│           ├── test_screening.py
│           └── test_fhir_resources.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── components.json         # shadcn/ui config
│   ├── Dockerfile
│   ├── railway.toml
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # / — Landing + SMART login
│   │   ├── dashboard/
│   │   │   └── page.tsx        # /dashboard
│   │   ├── screening/
│   │   │   └── page.tsx        # /screening — EPDS form
│   │   ├── history/
│   │   │   └── page.tsx        # /history — EPDS timeline chart
│   │   ├── care-plan/
│   │   │   └── page.tsx        # /care-plan
│   │   ├── labs/
│   │   │   └── page.tsx        # /labs
│   │   ├── vitals/
│   │   │   └── page.tsx        # /vitals
│   │   └── resources/
│   │       └── page.tsx        # /resources — no auth required
│   ├── components/
│   │   ├── ui/                 # shadcn/ui generated components
│   │   ├── RiskAlert.tsx
│   │   ├── NarrativeSummary.tsx
│   │   ├── EpdsForm.tsx
│   │   ├── ScoreHistoryChart.tsx
│   │   └── NavBar.tsx
│   ├── lib/
│   │   └── api.ts              # Typed fetch wrapper for FastAPI endpoints
│   └── e2e/
│       └── tests/
│           ├── auth.spec.ts
│           ├── screening.spec.ts
│           └── resources.spec.ts
│
└── docs/
    ├── PRD.md
    └── adr/
        └── 0001-foundational-architecture.md
```

---

## Local Development Setup

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.12+
- `uv` — install with `curl -LsSf https://astral.sh/uv/install.sh | sh`

### 1. Clone and configure environment

```bash
git clone <repo>
cd Peripartum-Depression-Care-Platform
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Multi-provider support: Configure your EHR providers in backend/app/utils/config.py
# Default provider configurations included: Epic, Cerner, Allscripts, athenahealth
REDIRECT_URI=http://localhost:8000/auth/callback
ANTHROPIC_API_KEY=<your Anthropic API key>
SESSION_SECRET_KEY=<32-byte random hex: python -c "import secrets; print(secrets.token_hex(32))">
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- `backend` — FastAPI on `http://localhost:8000`
- `frontend` — Next.js on `http://localhost:3000`
- `postgres` — Postgres 16 on `localhost:5432`

### 3. Run database migrations

```bash
docker compose exec backend uv run alembic upgrade head
```

### 4. Open the app

Navigate to `http://localhost:3000`. Select your EHR provider from the dropdown and click **Sign in with EHR Provider** to begin the SMART on FHIR flow.

> **Test Patients:** Most EHR sandboxes provide pre-populated test patients. For Epic, visit `fhir.epic.com` → Developer Resources → Test Patients. For Cerner, visit `code.cerner.com/developer/smart-on-fhir/apps`. Look for patients with pregnancy or postpartum-related conditions. See [docs/EHR_PROVIDER_SETUP.md](docs/EHR_PROVIDER_SETUP.md) for detailed setup instructions for each provider.

---

## Backend Development (without Docker)

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Run backend tests

```bash
cd backend
uv run pytest tests/ -v
```

---

## Frontend Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Run Playwright E2E tests

```bash
cd frontend
npm run playwright install
npm run test:e2e
```

---

## SMART on FHIR Auth Flow

```
1. Patient visits http://localhost:3000
2. Selects EHR provider from dropdown (Epic, Cerner, Allscripts, athenahealth)
3. Clicks "Sign in with EHR Provider"
4. Frontend calls GET http://localhost:8000/auth/launch?provider=<selected>
5. FastAPI retrieves provider-specific config (auth URLs, client ID, scopes)
6. FastAPI builds PKCE challenge, stores state + provider in Postgres
7. FastAPI redirects patient to provider's authorization URL
8. Patient authenticates via their patient portal (MyChart, PowerChart, etc.)
9. EHR redirects to GET http://localhost:8000/auth/callback?code=...&state=...
10. FastAPI verifies state (CSRF), retrieves stored provider
11. FastAPI exchanges code for FHIR access token using provider config
12. FastAPI stores session in Postgres, sets HttpOnly session UUID cookie
13. FastAPI redirects to http://localhost:3000/dashboard
14. Next.js calls GET /api/dashboard (session cookie sent automatically)
15. FastAPI resolves session → FHIR token → fetches all FHIR resources
16. FastAPI calls Anthropic Claude for narrative summary
17. Dashboard renders with real patient data
```

---

## FHIR Resources & Scopes

| Resource | Operations | SMART Scope |
|---|---|---|
| `Patient` | Read | `patient/Patient.read` |
| `Observation` | Read + Write | `patient/Observation.read patient/Observation.write` |
| `Condition` | Read | `patient/Condition.read` |
| `MedicationRequest` | Read | `patient/MedicationRequest.read` |
| `Appointment` | Read | `patient/Appointment.read` |
| `QuestionnaireResponse` | Read + Write | `patient/QuestionnaireResponse.read patient/QuestionnaireResponse.write` |
| `CarePlan` | Read | `patient/CarePlan.read` |
| `Task` | Write | `patient/Task.write` |

> **Note:** Task.write creates provider alerts when EPDS score ≥ 10. Verify your EHR supports Task resources. See [docs/EHR_PROVIDER_SETUP.md](docs/EHR_PROVIDER_SETUP.md) for provider-specific capabilities.

---

## EPDS Screening

The Edinburgh Postnatal Depression Scale (EPDS) is a 10-item self-report questionnaire validated for peripartum populations.

- **Scoring:** Each item scores 0–3; total range 0–30
- **Risk threshold:** Score ≥ 10 → elevated risk alert + care team contact prompt
- **FHIR write-back:** On submission, FastAPI writes:
  - `QuestionnaireResponse` — full question/answer pairs
  - `Observation` — total score, LOINC `89049-6`, `status: final`
- **History:** All past scores retrievable via `GET /api/history/epds` and displayed as a line chart

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `REDIRECT_URI` | Yes | OAuth2 callback URI (must match EHR provider registration) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for narrative summary |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-3-5-sonnet-20241022` |
| `DATABASE_URL` | Yes | Postgres async connection string |
| `SESSION_SECRET_KEY` | Yes | 32-byte hex secret for session signing |
| `COOKIE_SECURE` | No | Set `true` in production (HTTPS only) |

**Multi-Provider Configuration:**  
EHR provider configurations (client IDs, FHIR base URLs, auth endpoints, scopes) are managed in [backend/app/utils/config.py](backend/app/utils/config.py) in the `PROVIDER_CONFIGS` dictionary. Default configurations included for Epic, Cerner, Allscripts, and athenahealth.

---

## Railway Deployment

**Full deployment guide**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for step-by-step instructions.

**Quick start** (using automated deployment scripts):

1. **Prerequisites:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Set up backend environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your Anthropic API key and session secret
   ```

3. **Run Phase 1 (create services + Postgres):**
   ```bash
   # Windows:
   .\deploy-railway.ps1
   
   # Unix/macOS:
   ./deploy-railway.sh
   ```

4. **Connect GitHub repo in Railway dashboard** for both backend and frontend services (set root directories: `backend` and `frontend`)

5. **Get backend URL** from Railway dashboard after deployment completes

6. **Run Phase 2 (link frontend to backend):**
   ```bash
   # Windows:
   .\deploy-railway.ps1 -Phase2 -BackendUrl "https://your-backend.railway.app"
   
   # Unix/macOS:
   ./deploy-railway.sh --phase2 --backend-url https://your-backend.railway.app
   ```

7. **Update EHR provider credentials:**
   - Edit `backend/app/utils/config.py` → `PROVIDER_CONFIGS` with production client IDs
   - Register Railway redirect URI (`https://your-backend.railway.app/auth/callback`) with each EHR provider
   - See [docs/EHR_PROVIDER_SETUP.md](docs/EHR_PROVIDER_SETUP.md) for provider registration instructions

**Manual setup**: If automated scripts fail, see the "Manual Railway Dashboard Configuration" section in [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

---

## Safety & Clinical Notes

> **This application is for informational and educational purposes only. It does not provide medical diagnosis, clinical recommendations, or treatment advice.**

- The AI narrative summary is explicitly instructed not to provide diagnosis or medical advice
- The EPDS risk alert is a screening flag — not a diagnosis. It prompts the patient to contact their care team
- The `/resources` page with crisis line information (National Maternal Mental Health Hotline: **1-833-943-5746**) is always accessible without authentication
- This app uses the EPIC **sandbox** with synthetic test data. A HIPAA BAA is required before using with real patient data

---

## Documentation

- [CONTEXT.md](./CONTEXT.md) — Domain glossary and canonical terminology
- [docs/PRD.md](./docs/PRD.md) — Product Requirements Document with full user stories and API contracts
- [docs/adr/0001-foundational-architecture.md](./docs/adr/0001-foundational-architecture.md) — Architecture Decision Record covering all foundational choices
