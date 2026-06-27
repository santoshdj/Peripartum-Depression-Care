# ADR 0001 — Foundational Architecture: SMART on FHIR Peripartum Depression Care Platform

**Project:** Peripartum Depression Care Platform  
**Date:** 2026-06-21  
**Status:** Accepted  
**Deciders:** Product owner (via structured design interview, 2026-06-21)

---

## Context

The Peripartum Depression Care Platform is a greenfield SMART on FHIR patient-facing standalone app. All foundational decisions were made during a structured design interview prior to any code being written. This ADR records the complete set of architectural choices so that future contributors understand the reasoning and do not re-litigate settled decisions.

---

## Decision 1 — SMART Launch Type: Standalone (Patient-Facing)

**Options considered:**

| Option | Launch type | Notes |
|---|---|---|
| **A — Standalone (chosen)** | Patient opens app directly; authenticates via EPIC MyChart patient portal | Standard for patient-facing apps; uses `launch/patient` scope |
| **B — EHR Launch** | Clinician launches app from within EPIC's EHR interface | Appropriate for clinician-facing tools; adds complexity for patient self-service |

**Decision:** Option A. The app is patient-facing — patients self-manage their peripartum depression care between clinical encounters. Standalone launch aligns with the SMART on FHIR patient access profile and maps cleanly to EPIC's patient portal authentication flow.

---

## Decision 2 — Backend Role: FHIR Orchestration Layer (not thin proxy)

**Options considered:**

| Option | Approach | Notes |
|---|---|---|
| **A — Orchestration layer (chosen)** | FastAPI owns SMART OAuth2 PKCE flow, stores tokens server-side, exposes own REST API to frontend | Server-side token storage, business logic, AI features |
| **B — Thin proxy** | Frontend holds FHIR token, FastAPI only adds CORS headers | Simpler but insecure for PHI; no server-side business logic |

**Decision:** Option A. The platform requires server-side logic for EPDS risk scoring, LLM narrative generation, session auditing, and FHIR token security. The FHIR access token must never be exposed to the browser. The SMART authorization code exchange, token storage, and all FHIR API calls are handled exclusively by FastAPI. The Next.js frontend holds only an HttpOnly session UUID cookie.

**Consequence:** The SMART OAuth2 PKCE flow runs entirely on the FastAPI backend. `/auth/launch` initiates the flow; `/auth/callback` exchanges the code, stores the token in Postgres, and sets the session cookie.

---

## Decision 3 — Session Strategy: Postgres-Backed (HttpOnly Cookie)

**Options considered:**

| Option | Storage | Notes |
|---|---|---|
| **A — Postgres sessions (chosen)** | `sessions` table: UUID → FHIR token + patient ID + expiry | No extra service; auditable; fits existing DB |
| **B — Redis sessions** | Token in Redis, UUID in cookie | Scales better; adds operational dependency |
| **C — Signed JWT cookie** | Encrypted FHIR token in JWT | Stateless but token revocation is difficult |

**Decision:** Option A. Postgres is already provisioned for EPDS caching and LLM audit logging. Storing sessions there avoids a Redis dependency, keeps infrastructure minimal for Railway deployment, and makes session records auditable. The browser cookie contains only the UUID session identifier (HttpOnly, Secure, SameSite=Lax).

---

## Decision 4 — Screening Instrument: EPDS (not PHQ-9)

**Options considered:**

| Option | Instrument | LOINC | Notes |
|---|---|---|---|
| **A — EPDS (chosen)** | Edinburgh Postnatal Depression Scale | `89049-6` | Gold standard for peripartum populations; 10 items |
| **B — PHQ-9** | Patient Health Questionnaire | `44249-1` | More general; already in most EHRs |
| **C — Both** | EPDS primary + PHQ-9 secondary | — | More comprehensive; more complex |

**Decision:** Option A. EPDS is the clinical gold standard for peripartum depression screening. It is specifically validated for pregnancy and postpartum populations, maps cleanly to a FHIR `QuestionnaireResponse` + `Observation` pair, and EPIC's sandbox supports LOINC `89049-6`. PHQ-9 deferred to phase 2 for ongoing monitoring.

**Risk threshold:** EPDS total score ≥ 10 triggers a risk alert. This is rule-based logic — no LLM is involved in this determination.

---

## Decision 5 — AI Features: Risk Scoring + Narrative Summary

**Options considered:**

| Option | Feature | Approach |
|---|---|---|
| **A — Risk scoring (chosen)** | EPDS threshold flagging | Rule-based; EPDS ≥ 10 → alert |
| **B — Narrative summary (chosen)** | Plain-language dashboard summary | Anthropic Claude API call per dashboard load |
| **C — Conversational agent** | In-app chat about care plan | LangGraph agent; deferred |

**Decision:** Options A + B for v1. Risk scoring is rule-based (no LLM, no latency, no hallucination risk for a safety-critical threshold). The narrative summary uses Anthropic Claude to synthesise the patient's active conditions, medications, upcoming appointments, and latest EPDS score into a plain-language paragraph — reusing the `AsyncAnthropic` + `call_anthropic` wrapper pattern from the `Clinical-notes-summarizer` project in this workspace.

**Safety constraint:** The narrative summary prompt explicitly instructs the model not to add diagnostic interpretation, clinical advice, or medication recommendations. It is a synthesis tool only.

**Consequence:** The `llm_audit_log` Postgres table records every summary generation (timestamp, FHIR patient ID, model, token counts, prompt hash) for cost tracking and compliance. No PHI beyond the FHIR patient ID is stored in this table.

---

## Decision 6 — LLM Provider: Anthropic Claude

**Options considered:**

| Option | Provider | Notes |
|---|---|---|
| **A — Anthropic Claude (chosen)** | `anthropic` Python SDK | Prior integration in `Clinical-notes-summarizer`; strong clinical language |
| **B — OpenAI GPT-4o** | `openai` Python SDK | Widely used; new dependency |
| **C — MedGemma (local)** | Vertex AI / HuggingFace | Medically fine-tuned; requires GPU infra |

**Decision:** Option A. Reuses the `AsyncAnthropic` client and `call_anthropic` wrapper already proven in this workspace. Introduces no new SDK dependency. Claude's strength at plain-language clinical communication suits patient-facing copy.

---

## Decision 7 — Database: Lightweight Postgres

**Options considered:**

| Option | Storage | Notes |
|---|---|---|
| **A — Postgres (chosen)** | SQLAlchemy + Alembic | Sessions, EPDS cache, LLM audit log; clinical data written back to EPIC via FHIR |
| **B — No DB** | In-memory / Redis only | Sessions only; cannot cache or audit |
| **C — Full DB** | Above + care plan tasks outside FHIR | Duplicates clinical records; FHIR is source of truth |

**Decision:** Option A. Three tables in scope for v1:
- `sessions` — SMART session state (UUID, FHIR token, patient ID, expiry)
- `epds_cache` — Cached EPDS submission history per patient (reduces FHIR round-trips)
- `llm_audit_log` — Per-generation record for the narrative summary feature

**Invariant:** All canonical clinical data (QuestionnaireResponse, Observation scores, CarePlan) is written to and read from EPIC via FHIR. The Postgres DB never duplicates clinical records — it holds only app-specific operational data.

---

## Decision 8 — FHIR Resources in Scope (v1)

**Decision:** Seven FHIR R4 resource types, all against the EPIC FHIR sandbox:

| Resource | Operations | Purpose |
|---|---|---|
| `Patient` | Read | Demographics |
| `Observation` | Read + Write | EPDS scores (LOINC `89049-6`), vitals (`category=vital-signs`), labs (`category=laboratory`) |
| `Condition` | Read | Active diagnoses |
| `MedicationRequest` | Read | Current medications |
| `Appointment` | Read | Upcoming OB/MH appointments |
| `QuestionnaireResponse` | Read + Write | EPDS form submissions |
| `CarePlan` | Read | Current care plan goals |

---

## Decision 9 — Frontend: Next.js App Router + shadcn/ui + Tailwind

**Options considered:**

| Option | Framework | Notes |
|---|---|---|
| **A — Next.js 14+ App Router (chosen)** | React Server Components + Client Components | Modern Next.js; works well with Railway |
| **B — Vite + React SPA** | Client-side only | Simpler; no SSR |
| **C — Remix** | Full-stack React | Less ecosystem momentum |

**Decision:** Option A with shadcn/ui + Tailwind. shadcn/ui provides accessible, composable components (critical for a health app), integrates with `recharts` for the EPDS history chart, and produces a calm neutral aesthetic suited to mental health content.

**Frontend pages (v1):**

| Route | Purpose |
|---|---|
| `/` | Landing / SMART login |
| `/dashboard` | Patient overview with narrative summary + risk alert |
| `/screening` | EPDS 10-question form |
| `/history` | EPDS score timeline (recharts line chart) |
| `/care-plan` | Active care plan goals and tasks |
| `/resources` | Crisis lines, psychoeducation (static; no FHIR dependency) |
| `/labs` | Lab results (Observation, laboratory category) |
| `/vitals` | Vital signs (Observation, vital-signs category) |

---

## Decision 10 — Deployment: Docker Compose (dev) + Railway (cloud)

**Options considered:**

| Option | Approach | Notes |
|---|---|---|
| **A — Docker Compose + Railway (chosen)** | Compose for local dev; Railway for cloud | Existing Railway deploy scripts in workspace |
| **B — Docker Compose + AWS ECS** | Production-grade; more ops | Overkill for sandbox/demo phase |
| **C — Vercel + Railway split** | Next.js on Vercel edge; FastAPI on Railway | More config; CORS complexity |

**Decision:** Option A. EPIC's sandbox requires a publicly reachable redirect URI even for sandbox testing — Railway provides this in minutes. The existing `deploy-railway.ps1` pattern from `Patient-Management-App/` will be adapted. A single `docker-compose.yml` at the repo root orchestrates `frontend`, `backend`, and `postgres` services for local development.

---

## Decision 11 — Python Package Manager: uv

**Decision:** `uv` with `pyproject.toml` and `uv.lock`, following the pattern established in `Clinical-notes-summarizer/`. Faster Docker builds (cached layer for `uv sync`) and reproducible lockfiles.

---

## Decision 12 — Testing Strategy

**Decision:** Three layers:
1. **Backend unit tests** — pytest, testing FHIR service functions, EPDS risk scoring logic, and LLM service in isolation using `respx` to mock EPIC FHIR API responses
2. **Backend integration tests** — pytest with `httpx.AsyncClient` against a live FastAPI test app with a test Postgres DB, mocked EPIC FHIR endpoints
3. **Frontend E2E tests** — Playwright testing the full SMART auth flow, EPDS form submission, and dashboard rendering

---

## Consequences

- The SMART auth flow is the critical path. All other features depend on a valid session. The first vertical slice to implement is: `/auth/launch` → EPIC auth → `/auth/callback` → session creation → `/dashboard` shell.
- EPIC sandbox test patients with postpartum data must be identified before FHIR integration testing begins.
- The `REDIRECT_URI` environment variable governs which registered URI is sent in the auth request (`http://localhost:8000/auth/callback` in dev, Railway URL in cloud).
- Crisis resources (`/resources` page) must be present and accessible before any patient-facing deployment, regardless of feature completeness.
