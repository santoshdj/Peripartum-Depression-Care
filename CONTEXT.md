# MathruMaitri — Domain Glossary

**Product focus:** Patient-facing SMART on FHIR standalone app for peripartum depression screening, monitoring, and care plan access. Supports multiple FHIR R4-compliant EHR providers (Epic, Cerner, Allscripts, athenahealth, and more).

**Brand name:** MathruMaitri (Sanskrit: मातृमैत्री — "Mother-Friendship"). Chosen for culturally resonant, stigma-neutral patient-facing branding. Technical/internal documentation may still reference "Peripartum Depression Care Platform."

This file defines the canonical terms used across the codebase, ADRs, and PRD.  
Update here first; code naming follows this glossary.

---

## SMART on FHIR

A profile of OAuth2 used for authorising health apps against FHIR servers. **Standalone launch** means the patient opens the app directly (e.g. via a link) and authenticates through the EHR's patient portal (MyChart, PowerChart, FollowMyHealth, etc.). The app receives a FHIR access token scoped to the authenticated patient and a `patient` context ID.

## EHR Provider

Any FHIR R4-compliant electronic health record system that implements SMART on FHIR standalone launch. MathruMaitri supports Epic, Cerner, Allscripts, athenahealth, and other standards-compliant vendors. Provider-specific configurations (OAuth endpoints, client IDs, FHIR base URLs) are stored in `backend/app/utils/config.py` in the `PROVIDER_CONFIGS` dictionary.

## Provider Configuration

A backend data structure (`ProviderConfig` class) containing the OAuth2 and FHIR endpoints specific to each EHR vendor: `client_id`, `client_secret`, `base_url` (FHIR server), `auth_url`, `token_url`, and `scopes`. Stored in `PROVIDER_CONFIGS` dictionary keyed by provider identifier ("epic", "cerner", "allscripts", "athenahealth"). The auth flow retrieves the appropriate config based on the provider selected by the patient at sign-in.

## FHIR Sandbox

A developer testing environment provided by EHR vendors for SMART on FHIR app development. Pre-populated with synthetic test patients including pregnancy and postpartum clinical data. Examples:
- Epic: `https://fhir.epic.com/interconnect-fhir-oauth/`
- Cerner: `https://fhir-ehr-code.cerner.com/`
- Allscripts: `https://fhirpub.cloud.pcysolutions.com/`
- athenahealth: Developer portal at `docs.athenahealth.com`

Used for all development and testing. Supports SMART on FHIR standalone launch with registered Client IDs.

## EPDS (Edinburgh Postnatal Depression Scale)

The gold-standard 10-item validated screening questionnaire for peripartum depression. Scores 0–30. A score ≥ 10 is the clinical threshold flagging moderate-to-severe risk. LOINC code: `89049-6`. Each submission is stored as a FHIR `QuestionnaireResponse` resource; the total score is stored as a FHIR `Observation` with the same LOINC code.

## EPDS Risk Threshold

An EPDS total score ≥ 10. Triggers two automated responses: (1) a risk alert displayed on the patient dashboard with a prompt to contact their care team, and (2) a FHIR `Task` resource written back to the patient's EHR with `status=requested`, `priority=urgent`, and `code.text="Review peripartum depression screening"`. The Task is assigned to the patient's primary care team via `Task.owner` reference and includes the EPDS score and timestamp in `Task.description`. This surfaces an alert in the provider's EHR inbox (Epic "In Basket", Cerner PowerChart tasks, etc.) for timely intervention. Both actions are rule-based — no LLM involved in risk determination.

## Narrative Summary

An LLM-generated (Anthropic Claude) plain-language paragraph summarising the patient's current health context (conditions, medications, upcoming appointments, latest EPDS score) displayed at the top of the dashboard. Generated server-side by FastAPI; never includes diagnostic interpretation or clinical advice.

## FHIR Orchestration Layer

The FastAPI backend's primary role: it owns the SMART OAuth2 PKCE flow, exchanges the auth code for a FHIR access token, stores that token server-side in Postgres, and exposes its own REST API to the Next.js frontend. The frontend never holds or sends a FHIR token.

## Patient Session

A Postgres-persisted record (`sessions` table) mapping a UUID session ID to a FHIR access token, FHIR patient ID, and expiry timestamp. The UUID is stored in an HttpOnly cookie on the patient's browser. Destroyed on logout or token expiry.

## EPDS Submission

The act of a patient completing the 10-question EPDS form in the app. On submission, FastAPI writes two FHIR resources back to the patient's EHR:
1. A `QuestionnaireResponse` — full question/answer pairs
2. An `Observation` — the total score with LOINC `89049-6`

The submission is also cached in Postgres for dashboard performance.

## FHIR Resources in Scope

The eight FHIR R4 resource types this app reads from and/or writes to the patient's EHR:

| Resource | Read | Write | Purpose |
|---|---|---|---|
| `Patient` | ✓ | — | Demographics displayed on dashboard |
| `Observation` | ✓ | ✓ | EPDS scores, vitals, lab results |
| `Condition` | ✓ | — | Active diagnoses |
| `MedicationRequest` | ✓ | — | Current medications |
| `Appointment` | ✓ | — | Upcoming OB/MH appointments |
| `QuestionnaireResponse` | ✓ | ✓ | EPDS questionnaire submissions |
| `CarePlan` | ✓ | — | Current care plan goals and tasks |
| `Task` | — | ✓ | Provider alerts for high EPDS scores |

## SMART Scopes

The OAuth2 scopes requested during standalone launch:

```
launch/patient
patient/Patient.read
patient/Observation.read
patient/Observation.write
patient/Condition.read
patient/MedicationRequest.read
patient/Appointment.read
patient/QuestionnaireResponse.read
patient/QuestionnaireResponse.write
patient/CarePlan.read
patient/Task.write
openid
fhirUser
```

## LLM Audit Log

A Postgres table (`llm_audit_log`) recording each Anthropic Claude narrative summary generation: timestamp, patient FHIR ID (not name), model used, token counts, and a hash of the prompt. Used for cost tracking and debugging. No PHI stored in this table beyond the FHIR patient ID.

## Care Plan

A FHIR `CarePlan` resource retrieved from the patient's EHR representing their current peripartum care plan goals and activities authored by their provider. Displayed read-only on the `/my-care` page. Authoring and modification of official care plans remains exclusively in the EHR.

## Care Plan Suggestions

An AI-generated (Anthropic Claude) set of 3–5 actionable next steps displayed to patients when their EPDS score ≥ 10 or symptom patterns indicate escalating risk. Generated server-side based on EPDS score, diary mood/anxiety trends, and existing FHIR data (active diagnoses, current medications, upcoming appointments). Examples: "Consider scheduling intake with perinatal therapist," "Discuss medication options at next OB visit," "Contact National Maternal Mental Health Hotline: 1-833-943-5746." Always labelled "AI-generated suggestions · Not a treatment plan · Discuss with your care team." Does not write to FHIR — patient discusses suggestions with provider, who authors the official CarePlan in the EHR. Logged to `llm_audit_log` table for transparency.

## EPDS History

The time-series view of a patient's EPDS total scores across all past submissions, displayed as a line chart on the `/history` page. Sourced from FHIR `Observation` resources filtered by LOINC `89049-6` and `subject=Patient/<id>`.

## Crisis Resources

Static psychoeducation and crisis contact content displayed on the `/resources` page. Includes the National Maternal Mental Health Hotline (1-833-943-5746), local crisis lines, and coping strategy content. No FHIR dependency. Always accessible regardless of session state.

## My Care

A hub page at `/my-care` that consolidates all clinical data views under a single entry point. Displays summary cards linking to the existing individual pages: Medications, Visits, Labs/Test Results, Vitals, Care Plan, and Appointments. Also contains a static "Contact Your Care Team" section with MyChart portal link and provider phone numbers. Does not fetch or store any data itself — it is a navigation and summary surface over existing pages.

## My Diary

A patient-private self-monitoring feature at `/diary`. Patients submit a structured daily check-in containing mood score (1–5), sleep hours (0–12), anxiety score (1–5), and an optional free-text note. All entries are stored in the app-owned Postgres `journal_entries` table — not written to FHIR. Entries are private to the patient and never visible to providers unless an explicit share mechanism is built in future. Historical entries are displayed as a trend chart alongside the entry list.

## Diary Entry

A single self-monitoring check-in submitted by a patient via My Diary. Schema: `patient_fhir_id`, `mood_score` (1–5), `sleep_hours` (0–12), `anxiety_score` (1–5), `note` (nullable text), `created_at` (timestamp). Mood and anxiety use a 5-point scale consistent with validated patient-reported outcome instruments. Sleep is measured in whole hours.

## Mom Talk

An anonymous peer support forum at `/mom-talk` where patients can post discussion threads and reply to others experiencing peripartum depression. Patients create a pseudonym (e.g., "MamaBear2024") on first use — real names from FHIR `Patient` resources are never displayed. All peripartum patients share one unified community feed; no cohort matching by EPDS score or pregnancy stage. Posts contain only free-text content — Diary Entries and EPDS scores remain private unless a future share mechanism is built. Content is filtered server-side by an AI moderation layer (blocks harmful keywords: suicide, self-harm, violence) before posting; flagged posts are rejected with a crisis resource redirect. Each post has a "Report" button triggering manual review. Message notifications alert patients to new replies on their threads. Stored in Postgres (`forum_posts`, `forum_replies` tables) — no FHIR write-back. Includes clinical disclaimer: peer support is not professional care. Always accessible regardless of session state.

## Daily Check-In

A quick-entry widget surfaced on the dashboard when the patient has not yet submitted a Diary Entry today. Displays a compact inline form (mood, sleep, anxiety — no note textarea) that can be completed in under 30 seconds without leaving the dashboard. On submission the widget transitions to a confirmation card showing today's scores. Powered by `GET /api/diary/today` and `POST /api/diary/entries`. Reduces friction for habit formation without requiring navigation to My Diary.

## Check-In Streak

A count of consecutive calendar days on which the patient submitted at least one Diary Entry, ending today or yesterday. Displayed as a badge on the My Diary page. Returned by `GET /api/diary/streak` as `{ streak: number, checked_in_today: boolean }`. Computed server-side from distinct dates in `journal_entries`. Resets to zero if a day is missed. Used for habit motivation — no gamification mechanics beyond the counter.

## Weekly Patterns Summary

A Claude-generated (Anthropic) 3–4 sentence plain-language description of a patient's mood, sleep, and anxiety trends over the current calendar week. Generated only when the patient has ≥ 3 Diary Entries in the last 7 days; otherwise a progress prompt is shown. Input to Claude is aggregated numbers only (averages, best/worst day by mood score, entry count) — note text is never passed to the LLM. Cached per patient per week in the `weekly_summaries` Postgres table; regenerated when the entry count changes. Always labelled "AI · Your week · Not medical advice" in the UI.

## Journal Prompts

A static bank of 25 short writing prompts (e.g. "Today I noticed…", "My baby and I…", "One thing I'm grateful for…") displayed as tappable chip buttons above the note textarea on the My Diary page. Six prompts are selected at random on page load using `useMemo`. Tapping a chip appends its text to the note field. Prompts are client-side only — no server state, no personalisation, no storage. Purpose: reduce blank-page friction for patients who want to write but do not know where to start.

## Multilingual Support

**Status:** Deferred to Phase 2 (see ADR 0004). The app currently supports English only. Phase 2 will add Spanish support using `react-i18next` with professional medical translation for UI strings, static content (crisis resources, EPDS-S questionnaire, journal prompts, Mom Talk guidelines), and a language preference selector stored in Postgres `users` table. AI-generated summaries (narrative summary, care plan suggestions, weekly patterns) remain English-only until Spanish prompt engineering is clinically validated in Phase 3. Implementation approach documented in `docs/adr/0004-multilingual-support-deferred.md`.

## Privacy and Stigma Mitigation

Design decisions to minimize mental health stigma and protect patient confidentiality:

1. **Stigma-Neutral Branding** — Patient-facing brand name "MathruMaitri" (Mother-Friendship) avoids clinical terminology like "Depression" or "Mental Health" in app name, browser history, and notifications. Technical documentation retains clinical language for accuracy.

2. **Shared Device Protection** — Current approach: Sessions persist until explicit logout or 24-hour timeout. Patients advised in onboarding to log out on shared devices. No auto-logout after inactivity to avoid disrupting journaling sessions. No biometric re-auth (out of scope for web app).

3. **Data Minimization with Patient Control** — EPDS scores cached in Postgres for performance (duplication justified). Diary entries stored app-side by default (private to patient). Patient can opt-in to share specific diary entries with care team via FHIR Observation write-back (see Diary Sharing).

4. **SMART-Only Access** — No anonymous usage mode. All users authenticate via EPIC MyChart (SMART on FHIR). This ensures continuity of care and provider visibility while maintaining patient-consented data access model.

## Diary Sharing

A patient-controlled mechanism to share My Diary entries with their care team by writing them to FHIR as Observation resources. By default, diary entries are private (stored only in Postgres `journal_entries` table, never visible to providers). When a patient opts to share:

- Patient selects specific diary entries or date ranges from `/diary` UI
- Backend writes each entry as a FHIR `Observation` with code `LA28656-4` ("Daily mood and anxiety self-report"), `valueString` containing mood/sleep/anxiety scores plus optional note text, `effectiveDateTime` set to entry's `created_at` timestamp, `status=final`, `category=survey`
- Shared entries are marked in Postgres with `shared_to_fhir=true`, `fhir_observation_id` (the FHIR resource ID returned by the EHR), and `shared_at` timestamp to prevent duplicate writes
- UI displays "Shared with care team" badge on shared entries
- Patient can share retroactively at any time — no time window restriction
- Deletion/revocation not supported — once written to FHIR, entry persists in EHR per clinical data retention policy

Purpose: Balances private self-monitoring (encourages honest journaling) with clinical utility (provider can see trends when patient consents). Implemented as opt-in to preserve diary as stigma-free safe space.

## Auth State

A temporary Postgres record (`auth_states` table) created during the SMART on FHIR OAuth2 PKCE flow. Stores the `state` parameter (CSRF protection), `code_verifier` (PKCE challenge), `code_challenge`, and `provider` (which EHR vendor was selected: "epic", "cerner", "allscripts", "athenahealth"). The `provider` field is set when the patient selects from the dropdown on the homepage and is retrieved during the callback to determine which `ProviderConfig` to use for token exchange. Auth states are short-lived — created at `/auth/launch`, consumed at `/auth/callback`, then deleted or expired within minutes.

---

## Database Schema Updates

### Recent Migrations

**Migration 0006: Add Diary Sharing Columns**  
Adds FHIR write-back tracking to `journal_entries` table:
- `shared_to_fhir` (boolean, default false) — whether entry has been shared with care team
- `fhir_observation_id` (varchar 256, nullable) — FHIR resource ID returned by EHR after write
- `shared_at` (timestamp with timezone, nullable) — when the entry was shared
- Index on `(patient_fhir_id, shared_to_fhir)` for efficient queries

**Migration 0007: Add Provider to Auth States**  
Adds provider tracking to `auth_states` table:
- `provider` (varchar 50, default "epic") — which EHR provider was selected during authentication flow

---

## Deployment Notes

### Multi-Provider Production Setup

When deploying to production:

1. **Register OAuth applications** with each EHR provider you plan to support (Epic, Cerner, Allscripts, athenahealth)
2. **Update `PROVIDER_CONFIGS`** in `backend/app/utils/config.py` with production client IDs and secrets
3. **Register your production redirect URI** (`https://<your-domain>/auth/callback`) with each provider
4. **Verify FHIR scopes** — some providers may require additional scopes or have provider-specific limitations (see [docs/EHR_PROVIDER_SETUP.md](docs/EHR_PROVIDER_SETUP.md))
5. **Test authentication flow** for each provider in your staging environment before go-live
6. **HIPAA BAA required** before using with real patient data — sandbox synthetic data only until compliance review complete

### Railway Deployment

For detailed Railway deployment instructions using automated scripts, see [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md).

**Deployment artifacts:**
- `deploy-railway.ps1` — Windows PowerShell deployment script
- `deploy-railway.sh` — Unix/macOS deployment script
- `backend/railway.toml` — Backend Railway configuration (Dockerfile builder, health check)
- `frontend/railway.toml` — Frontend Railway configuration (Dockerfile builder, health check)
- `backend/Dockerfile` — Production Docker image for FastAPI backend (includes migrations)
- `frontend/Dockerfile` — Production Docker image for Next.js frontend (standalone build)
