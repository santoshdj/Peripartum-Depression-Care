# PRD — MathruMaitri

**Date:** 2026-06-21 (updated 2026-08-11)  
**Status:** Ready for implementation  
**Authors:** Product owner (via structured design interview)

**Brand Name:** MathruMaitri (Sanskrit: मातृमैत्री — "Mother-Friendship")  
**Internal Technical Name:** Peripartum Depression Care Platform

---

## Problem Statement

Peripartum depression affects 1 in 5 pregnant and postpartum individuals, yet it remains severely underdiagnosed and undertreated. Patients face three compounding barriers:

1. **Fragmented care access** — clinical depression screening (EPDS) happens only at scheduled OB visits; there is no mechanism for patients to self-screen or track their emotional health between encounters.
2. **No visibility into their own data** — patients cannot see their EPDS scores over time, their care plan, their medications, or upcoming appointments without calling the clinic or navigating complex EHR patient portals.
3. **Delayed support** — when a patient's score crosses the clinical threshold (≥ 10), there is no immediate, patient-facing signal prompting them to act before their next appointment.

The result is that patients living through one of the highest-risk periods for depression have no digital tool that meets them where they are, connects to their real clinical data, and guides them toward care.

---

## Solution

A patient-facing SMART on FHIR standalone web application that:

- Authenticates the patient through their existing EHR patient portal credentials (MyChart, PowerChart, FollowMyHealth, etc. — no new account required)
- Supports multiple FHIR R4-compliant EHR providers (Epic, Cerner, Allscripts, athenahealth, and more)
- Surfaces their real clinical data — conditions, medications, appointments, labs, vitals, care plan — in plain language
- Enables self-administered EPDS screening at any time, with results written directly back to their EHR
- Generates an AI-powered (Anthropic Claude) plain-language summary of their health context on every dashboard visit
- Flags elevated EPDS scores (≥ 10) immediately with a prompt to contact their care team
- Provides always-accessible crisis resources and psychoeducation, regardless of session state

The app requires no new registration — EHR credentials are the identity. Clinical data flows through the FHIR standard. Screening results are written back to the patient's EHR, keeping the care team's record current.

---

## User Stories

### Authentication & Onboarding

1. As a postpartum patient, I want to launch the app from a link and log in with my EHR patient portal credentials, so that I do not need to create a separate account.
2. As a patient, I want to select my EHR provider from a dropdown (Epic, Cerner, Allscripts, athenahealth, etc.) before signing in, so that the app can connect to the correct health system.
3. As a patient, I want the app to request only the minimum necessary permissions to my health data, so that I understand and trust what I am sharing.
4. As a patient, I want to be automatically redirected to my dashboard after logging in, so that I can access my health information without additional steps.
5. As a patient, I want my session to remain active across page refreshes during a single visit, so that I do not have to log in repeatedly.
6. As a patient, I want to log out of the app securely, so that my health data is not accessible on a shared device.
7. As a patient, I want to see a clear error message if my EHR authentication fails, so that I know what to do next.

### Dashboard

7. As a patient, I want to see a plain-language summary of my current health context when I open my dashboard, so that I can quickly understand where things stand without reading through medical records.
8. As a patient, I want to see my most recent EPDS score prominently on my dashboard, so that I always know my current screening status.
9. As a patient, I want to see a risk alert with instructions to contact my care team if my EPDS score is ≥ 10, so that I know when to seek help urgently.
10. As a patient, I want to see my upcoming appointments on my dashboard, so that I can plan around my care schedule.
11. As a patient, I want to see my active diagnoses on my dashboard, so that I have a clear picture of my current health conditions.
12. As a patient, I want to see my current medications on my dashboard, so that I can verify my prescription information is current.
13. As a patient, I want to navigate from my dashboard to any detailed section with a single click, so that I can explore my data without getting lost.

### EPDS Screening

14. As a patient, I want to complete the Edinburgh Postnatal Depression Scale questionnaire in the app at any time, so that I can screen myself between clinical appointments.
15. As a patient, I want to see the 10 EPDS questions presented clearly one section at a time, so that the screening process does not feel overwhelming.
16. As a patient, I want to see my total score immediately after completing the EPDS, so that I have immediate feedback.
17. As a patient, I want my EPDS responses and score to be saved to my EHR automatically on submission, so that my care team can see my results without me calling the clinic.
18. As a patient, I want to be shown the EPDS risk alert and care team contact instructions if my score is ≥ 10, so that I know to seek help.
19. As a patient, I want to be shown a supportive, non-alarming message if my score is below the threshold, so that I feel supported regardless of my result.
20. As a patient, I want to see crisis line information (National Maternal Mental Health Hotline) on the EPDS results screen, so that I always have access to immediate support.

### Screening History

21. As a patient, I want to see all my past EPDS scores displayed on a timeline chart, so that I can understand how my mood has changed over time.
22. As a patient, I want the history chart to show the date of each assessment alongside the score, so that I can relate my scores to events in my life.
23. As a patient, I want the clinical threshold (score 10) marked on the chart as a reference line, so that I can interpret my scores in context.
24. As a patient, I want to see how many screenings I have completed, so that I can track my engagement with the program.

### Care Plan

25. As a patient, I want to see my current peripartum care plan goals and activities, so that I understand what my care team has planned for me.
26. As a patient, I want care plan items to be displayed in plain language (not clinical jargon), so that I can understand and act on them.
27. As a patient, I want to see the status of each care plan activity (active, completed, on hold), so that I know what is expected of me.

### Labs & Vitals

28. As a patient, I want to see my recent lab results in a clear, readable format, so that I can monitor relevant health markers.
29. As a patient, I want lab results to show the normal reference range alongside my value, so that I can interpret whether my result is in range.
30. As a patient, I want to see my recent vital signs (blood pressure, weight, heart rate) over time, so that I can track physical health markers during my peripartum period.
31. As a patient, I want vitals displayed with the date of each measurement, so that I can see trends over recent weeks.

### Resources

32. As a patient, I want to access the `/resources` page without being logged in, so that crisis information is always reachable.
33. As a patient, I want to see the National Maternal Mental Health Hotline number (1-833-943-5746) prominently on the resources page, so that I can call for help immediately.
34. As a patient, I want to see evidence-based coping strategies for peripartum depression on the resources page, so that I have practical tools between appointments.
35. As a patient, I want to see information about what peripartum depression is and how it is treated, so that I can reduce stigma and understand my condition.
36. As a patient, I want crisis line information to also appear on the EPDS results screen when my score is elevated, so that support is contextually placed where I am most likely to need it.

### AI Narrative Summary

37. As a patient, I want the dashboard summary to be written in plain, friendly language (not medical jargon), so that I can understand it without a medical background.
38. As a patient, I want the summary to reflect my most up-to-date FHIR data (conditions, meds, appointments, latest EPDS score), so that it is clinically accurate.
39. As a patient, I want the summary to make clear it is informational and not a medical diagnosis, so that I understand its purpose.
40. As a patient, I want the summary to load quickly (within 3 seconds), so that it does not block me from using the rest of the dashboard.

### My Diary (Self-Monitoring)

41. As a patient, I want to submit a daily check-in with mood score (1-5), sleep hours (0-12), anxiety score (1-5), and an optional note, so that I can track my emotional health between appointments.
42. As a patient, I want my diary entries to be private by default (visible only to me, not my care team), so that I can journal honestly without fear of judgment.
43. As a patient, I want to see my diary entries displayed as a chronological list with a trend chart, so that I can visualize my mood patterns over time.
44. As a patient, I want to receive AI-generated plain-language weekly patterns when I have ≥3 entries in the last 7 days, so that I can understand my symptom trends without manual analysis.
45. As a patient, I want to see writing prompts (e.g., "Today I noticed...", "One thing I'm grateful for...") to reduce blank-page friction, so that I always have a starting point for my note.
46. As a patient, I want to see my check-in streak (consecutive days journaling), so that I stay motivated to maintain the habit.
47. As a patient, I want to complete a quick check-in from my dashboard without navigating to `/diary`, so that daily tracking feels frictionless.

### Diary Sharing (Patient-Controlled)

48. As a patient, I want to share specific diary entries with my care team by writing them to my EPIC record, so that my provider can see symptom trends when I choose to disclose them.
49. As a patient, I want to select which entries to share (individual entries or date ranges), so that I maintain control over what my care team sees.
50. As a patient, I want shared entries to display a "Shared with care team" badge in the UI, so that I always know which entries are visible to providers.
51. As a patient, I want to share retroactively at any time (no time window restriction), so that I can decide to disclose past patterns during a provider visit.
52. As a patient, I want to understand that shared entries become part of my permanent medical record and cannot be deleted, so that I can make informed consent decisions.

### Mom Talk (Peer Support Forum)

53. As a patient, I want to create a pseudonym (e.g., "MamaBear2024") on first use of Mom Talk, so that I can participate anonymously without revealing my real name.
54. As a patient, I want to post discussion threads and reply to other patients' posts, so that I can share experiences and receive peer support.
55. As a patient, I want to see one unified community feed (not cohort-matched by EPDS score), so that I can connect with the full range of peripartum experiences.
56. As a patient, I want posts to be filtered by AI content moderation before publishing, so that harmful content (suicide/self-harm/violence keywords) is blocked and I am redirected to crisis resources.
57. As a patient, I want a "Report" button on every post, so that I can flag inappropriate content for manual review.
58. As a patient, I want to receive message notifications when someone replies to my thread, so that I stay engaged in conversations.
59. As a patient, I want to see a clinical disclaimer ("Peer support is not professional care"), so that I understand Mom Talk's purpose and limitations.
60. As a patient, I want Mom Talk to be accessible without logging in (read-only), so that I can browse before deciding to participate.

### Provider Notifications

61. As a patient, I want my care team to be automatically notified in my EHR when my EPDS score ≥ 10, so that they can follow up without me needing to call.
62. As a patient, I want the notification to include my EPDS score and timestamp, so that my provider has context for urgency.
63. As a patient, I want the notification to appear in my provider's EHR inbox as a Task, so that it surfaces in their existing workflow.

### Care Plan Suggestions (AI)

64. As a patient, I want to see 3-5 AI-generated actionable next steps when my EPDS score ≥ 10, so that I have concrete guidance while waiting to speak with my provider.
65. As a patient, I want care plan suggestions to be based on my EPDS score, diary trends, and FHIR data (diagnoses, medications, appointments), so that recommendations are personalized to my situation.
66. As a patient, I want suggestions to include examples like "Consider scheduling intake with perinatal therapist" or "Contact National Maternal Mental Health Hotline: 1-833-943-5746", so that I have specific actions to take.
67. As a patient, I want suggestions to be clearly labeled "AI-generated suggestions · Not a treatment plan · Discuss with your care team", so that I understand they are informational and not medical advice.
68. As a patient, I want care plan suggestions to not be written to my EPIC record, so that my official care plan remains authored exclusively by my provider.

### Security & Privacy

41. As a patient, I want my FHIR access token to never be exposed in the browser, so that my health data cannot be intercepted by client-side scripts.
42. As a patient, I want my session to expire after inactivity, so that my account is protected on shared devices.
43. As a patient, I want all data in transit to be encrypted (HTTPS), so that my health information cannot be intercepted.
44. As a patient, I want the app to only request the FHIR scopes it genuinely needs, so that I am not over-sharing my health data.

### Daily Check-In Banner

45. As a patient, I want to see a daily check-in prompt on my dashboard when I have not yet checked in today, so that I am gently reminded to track my mood without having to navigate to My Diary.
46. As a patient, I want to complete a quick check-in (mood, sleep, anxiety) directly from the dashboard banner, so that I can log how I am feeling in under 30 seconds.
47. As a patient, I want the check-in form to expand inline on the dashboard rather than opening a new page, so that I am not interrupted or disoriented mid-session.
48. As a patient, I want the check-in form to require only mood, sleep, and anxiety scores (no note), so that the daily entry is low-effort and I am more likely to complete it consistently.
49. As a patient, I want the banner to be replaced with a confirmation card showing today's scores after I submit, so that I know my entry was saved.
50. As a patient, I want the confirmation card to persist on the dashboard for the rest of the day, so that I do not see the check-in prompt again after I have already checked in.
51. As a patient, I want to be able to dismiss the check-in form without submitting, so that I can decline without disrupting my dashboard view.
52. As a patient, I want the check-in banner to show a visually distinct but non-intrusive design (not a modal overlay), so that it does not block my access to other dashboard content.

### Check-In Streak

53. As a patient, I want to see my current consecutive check-in streak on the My Diary page, so that I am motivated to maintain a daily habit.
54. As a patient, I want the streak counter to increment automatically when I submit a check-in, so that I can see immediate positive reinforcement.
55. As a patient, I want the streak counter to display differently if I haven't checked in today (e.g., showing yesterday's streak rather than resetting immediately), so that I understand I still have time to maintain my streak today.
56. As a patient, I want the streak counter to clearly indicate when I have no current streak, so that I know where I stand and am encouraged to start.
57. As a patient, I want the streak to be displayed near the page title rather than buried in the page, so that it is visible and motivating without requiring scrolling.

### Journal Prompts

58. As a patient, I want to see suggested writing prompts above the diary note field, so that I have starting points when I am not sure what to write.
59. As a patient, I want to tap a prompt chip to insert it into the note field, so that I can use a prompt without typing it manually.
60. As a patient, I want multiple different prompt categories represented (mood, baby, sleep, support, gratitude), so that I have diverse options regardless of what kind of day I had.
61. As a patient, I want the prompts shown to vary across sessions (randomly selected), so that the suggestions feel fresh rather than repetitive over time.
62. As a patient, I want the prompts to be labelled clearly as optional suggestions, so that I do not feel obligated to follow any specific one.
63. As a patient, I want tapping a prompt to append to any existing note text rather than overwrite it, so that I do not accidentally lose what I have already written.

### Weekly Patterns Summary

64. As a patient, I want to see an AI-generated summary of my mood, sleep, and anxiety patterns for the current week after I have checked in at least 3 times, so that I can understand my trends in plain language.
65. As a patient, I want the weekly summary to be clearly labelled as AI-generated and explicitly marked as not medical advice, so that I understand its purpose and limitations.
66. As a patient, I want to see a progress message when I have fewer than 3 check-ins this week, so that I understand exactly how many more entries are needed before a summary appears.
67. As a patient, I want the summary to update when I add new check-ins this week (not be frozen from Monday), so that it reflects my most recent data.
68. As a patient, I want the summary to focus only on the numerical pattern in my scores (not my written notes), so that my private reflections are not read or processed by an AI model.
69. As a patient, I want the summary to acknowledge both good weeks and hard weeks with equal warmth, so that I do not feel judged for low scores.
70. As a patient, I want the weekly summary to load quickly on the diary page, so that it does not block me from using the check-in form or reading past entries.

---

## Implementation Decisions

### Module Architecture

**Backend modules (FastAPI):**

1. **SMART Auth module** — `app/routers/auth.py` + `app/services/smart_auth.py`
   - Implements the SMART on FHIR standalone launch (PKCE flow)
   - Routes: `GET /auth/launch`, `GET /auth/callback`, `POST /auth/logout`
   - Stores session in Postgres after callback; sets HttpOnly UUID cookie

2. **FHIR Client module** — `app/services/fhir_client.py`
   - Single async HTTP client (httpx) for all EPIC FHIR API calls
   - Accepts FHIR access token from session; constructs FHIR REST requests
   - Handles FHIR pagination, error mapping, and resource parsing

3. **FHIR Resources module** — `app/services/fhir_resources.py`
   - High-level functions per resource type: `get_patient()`, `get_conditions()`, `get_medications()`, `get_appointments()`, `get_observations(category)`, `get_care_plan()`, `submit_epds()`
   - `submit_epds()` writes both `QuestionnaireResponse` and `Observation` to EPIC

4. **EPDS module** — `app/services/epds_service.py`
   - Holds the EPDS questionnaire definition (10 questions, scoring keys)
   - `calculate_score(responses)` → integer 0–30
   - `assess_risk(score)` → `{"risk": "elevated" | "normal", "threshold": 10, "message": str}`
   - Rule-based only; no LLM

5. **Narrative Summary module** — `app/services/summary_service.py`
   - Assembles FHIR context into a structured prompt
   - Calls Anthropic Claude via `AsyncAnthropic` (reuses `Clinical-notes-summarizer` pattern)
   - Writes result to `llm_audit_log`

6. **Session middleware** — `app/middleware/session.py`
   - FastAPI dependency that resolves the session UUID cookie to a `Session` DB row
   - Returns 401 if session is missing, expired, or revoked

7. **Database models** — `app/models/` (SQLAlchemy)
   - `Session` — `id (UUID PK), fhir_access_token, fhir_patient_id, expires_at, created_at`
   - `EpdsCache` — `id, fhir_patient_id, score, submitted_at, fhir_observation_id`
   - `LlmAuditLog` — `id, fhir_patient_id, model, prompt_tokens, completion_tokens, prompt_hash, created_at`
   - `JournalEntry` — `id (UUID PK), patient_fhir_id (indexed), mood_score (SmallInt 1–5), sleep_hours (SmallInt 0–12), anxiety_score (SmallInt 1–5), note (Text nullable), created_at`
   - `WeeklySummary` — `id (UUID PK), patient_fhir_id (indexed), week_start_date (Date), summary_text (Text), entry_count (Integer), generated_at`

8. **API routers** — `app/routers/`
   - `dashboard.py` — `GET /api/dashboard` (assembles all FHIR data + narrative summary)
   - `screening.py` — `GET /api/screening/questionnaire`, `POST /api/screening/submit`
   - `history.py` — `GET /api/history/epds`
   - `fhir.py` — resource-specific endpoints (`/api/fhir/conditions`, `/api/fhir/medications`, etc.)
   - `diary.py` — diary entries, today query, streak, weekly summary (see Diary Engagement below)

**Diary Engagement modules (added 2026-06-23):**

9. **Daily Check-In API** — Three new endpoints on the diary router:
   - `GET /api/diary/today` — queries `journal_entries` for today UTC; returns the most recent entry or `null`.
   - `GET /api/diary/streak` — computes consecutive check-in days by querying distinct entry dates descending; returns `{ streak, checked_in_today }`.
   - `GET /api/diary/weekly-summary` — returns a cached or freshly generated Weekly Patterns Summary (see below).

10. **Diary Summary Service** — `app/services/diary_summary_service.py`
    - Accepts a list of `JournalEntry` ORM objects for the current week.
    - Computes aggregated statistics: average/best/worst mood, average sleep, average anxiety, entry count. Note text is never read.
    - Constructs a Claude prompt from these numbers only (no PHI beyond patient ID, no free text).
    - Calls `AsyncAnthropic` using the same `ANTHROPIC_MODEL` config as the Narrative Summary service.
    - Caches the result to `weekly_summaries` Postgres table, replacing any existing row for the same `(patient_fhir_id, week_start_date)`.

11. **Weekly Summaries table** — new Postgres table:
    - `id` (UUID PK), `patient_fhir_id` (indexed), `week_start_date` (DATE — always the Monday of the week), `summary_text` (Text), `entry_count` (Integer), `generated_at` (TIMESTAMPTZ).
    - Composite index on `(patient_fhir_id, week_start_date)`.
    - Cache invalidation: if the current entry count for the week differs from `entry_count` in the cached row, a fresh summary is generated and the old row is replaced.
    - Minimum 3 entries required before any summary is generated.

**Frontend modules (added 2026-06-23):**

12. **DailyCheckInCard component** — `components/DailyCheckInCard.tsx`
    - Receives `todayEntry` (DiaryEntry or null) and an `onCheckedIn` callback as props.
    - When `todayEntry === null`: renders an indigo banner with a "Check in now" button; clicking expands an inline form with mood score buttons, a sleep range slider, and anxiety score buttons. No note textarea (speed optimisation).
    - On successful save: calls `onCheckedIn(entry)` which causes the dashboard to replace the banner with a green confirmation card.
    - Dashboard fetches `api.diary.today()` in parallel with `api.dashboard.get()` on mount.

13. **Diary page updates** — three additions to `app/diary/page.tsx`:
    - Streak badge: fetches `api.diary.streak()` and renders a flame badge with the count in the page header.
    - Journal prompt chips: a static bank of 25 prompts, 6 selected via `useMemo` on mount; each chip appends to the note textarea on click.
    - Weekly summary card: fetches `api.diary.weeklySummary()`; renders a blue card with AI disclaimer if available, or a progress message if fewer than 3 check-ins this week.

**Frontend modules (Next.js App Router):**

1. **Auth flow** — `/app/page.tsx` (landing + SMART login button → redirects to `GET /auth/launch`)
2. **Dashboard** — `/app/dashboard/page.tsx` — summary card, risk alert, condition/med/appointment tiles
3. **Screening** — `/app/screening/page.tsx` — EPDS form with `react-hook-form`, submit handler
4. **History** — `/app/history/page.tsx` — recharts `LineChart` of EPDS scores over time
5. **Care Plan** — `/app/care-plan/page.tsx` — care plan activity list
6. **Labs** — `/app/labs/page.tsx` — lab results table with reference ranges
7. **Vitals** — `/app/vitals/page.tsx` — vitals table/chart
8. **Resources** — `/app/resources/page.tsx` — static content; no auth required
9. **API client** — `lib/api.ts` — typed fetch wrapper for all FastAPI endpoints; reads session cookie automatically (credentials: "include")

### SMART OAuth2 Flow

```
Patient → GET /auth/launch
FastAPI → redirect to EPIC auth URL with:
  - client_id (env var EPIC_CLIENT_ID)
  - redirect_uri (env var REDIRECT_URI)
  - scope (SMART scopes, see CONTEXT.md)
  - response_type=code
  - code_challenge (PKCE)
  - state (CSRF nonce, stored in Postgres)

Patient authenticates at EPIC MyChart →
EPIC → GET /auth/callback?code=...&state=...
FastAPI → verify state, exchange code for token
FastAPI → store session in Postgres
FastAPI → set HttpOnly session UUID cookie
FastAPI → redirect to /dashboard
```

### FHIR Base URL

EPIC Sandbox: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`

### EPDS FHIR Representation

On submission, FastAPI writes two resources to EPIC:
1. `QuestionnaireResponse` — full 10 Q/A pairs, `questionnaire: "http://loinc.org/89049-6"`
2. `Observation` — `code.coding[0].code: "89049-6"`, `valueInteger: <total_score>`, `status: "final"`, `subject: Patient/<fhir_patient_id>`

### Environment Variables

```
# EPIC / SMART
EPIC_CLIENT_ID=
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_AUTH_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2
REDIRECT_URI=http://localhost:8000/auth/callback   # or Railway URL in prod

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/peripartum_db

# Security
SESSION_SECRET_KEY=   # 32-byte random hex
COOKIE_SECURE=false   # true in production
```

### API Contracts

All API routes under `/api/*` require a valid session cookie and return JSON.

Key contracts:
- `GET /api/dashboard` → `{ patient, conditions, medications, appointments, latest_epds, narrative_summary, risk_alert }`
- `GET /api/screening/questionnaire` → `{ questions: [{id, text, options: [{value, label}]}] }`
- `POST /api/screening/submit` → `{ body: {responses: {q1..q10: 0|1|2|3}} }` → `{ score, risk, message, fhir_observation_id }`
- `GET /api/history/epds` → `{ submissions: [{date, score, risk}] }`
- `GET /api/fhir/observations?category=laboratory` → `{ observations: [{code, display, value, unit, date, reference_range}] }`
- `GET /api/diary/entries` → `{ entries: DiaryEntry[] }` (newest first)
- `POST /api/diary/entries` → `{ mood_score, sleep_hours, anxiety_score, note? }` → `DiaryEntry`
- `GET /api/diary/today` → `{ entry: DiaryEntry | null }`
- `GET /api/diary/streak` → `{ streak: number, checked_in_today: boolean }`
- `GET /api/diary/weekly-summary` → `{ available: boolean, summary?: string, week_start?: string, entry_count?: number, generated_at?: string, min_entries_required?: number, entries_so_far?: number }`

---

## Testing Decisions

### What makes a good test

Tests should assert **external behaviour** — what the module returns given specific inputs — not implementation details (which internal functions were called, in what order). A test that breaks when you rename a private function is a bad test. A test that breaks when the EPDS risk threshold changes from 10 to 12 is a good test.

### Backend tests (pytest + httpx + respx)

**Modules to test:**
- `epds_service.py` — unit tests for `calculate_score()` (boundary values: 0, 9, 10, 30) and `assess_risk()` (threshold logic)
- `summary_service.py` — unit tests with a mocked Anthropic client; assert prompt construction includes all required FHIR context fields; assert PHI not stored in audit log
- `fhir_resources.py` — integration tests with `respx` mocking EPIC FHIR API; assert correct FHIR queries constructed; assert `submit_epds()` posts both `QuestionnaireResponse` and `Observation`
- `auth router` — integration tests with `httpx.AsyncClient`; assert `/auth/launch` redirects with correct PKCE params; assert `/auth/callback` stores session and sets cookie; assert `/auth/logout` deletes session
- `session middleware` — unit tests; assert 401 on missing/expired/invalid session; assert valid session resolves correctly

**Prior art:** `resume-analyzer-agent/tests/` for `pytest` + `httpx.AsyncClient` patterns.

### Frontend E2E tests (Playwright)

**Scenarios to test:**
- Full SMART auth flow: landing → login button → (mocked EPIC callback) → dashboard renders
- EPDS form submission: navigate to `/screening` → fill all 10 questions → submit → score displayed
- Risk alert: submit with score ≥ 10 → risk alert and crisis line visible on results screen
- `/resources` accessible without session (no login required)
- Session expiry: expired session cookie → redirect to `/` (login page)

---

## Out of Scope

- **PHQ-9 screening** — deferred to phase 2
- **Conversational AI agent** — in-app chat deferred; safety/liability complexity too high for v1
- **Condition write-back** — app is read-only for Condition, CarePlan, MedicationRequest
- **Care plan authoring** — patients cannot create or modify care plans; EHR remains the authoring system
- **Push notifications / reminders** — no proactive outreach in v1
- **Multi-EHR support** — EPIC sandbox only; Cerner/Athena integration deferred
- **Clinician-facing views** — this is a patient-only app; clinician dashboards are a separate product
- **Offline support** — no service worker / PWA in v1
- **Accessibility audit (WCAG 2.1 AA)** — shadcn/ui provides baseline accessibility; full audit deferred
- **HIPAA Business Associate Agreement** — sandbox only; BAA required before any production PHI
- **Weekly summary personalisation** — prompts are static and randomly selected; no ML-based personalisation in v1
- **Diary "Share with care team"** — explicit patient consent flow for sharing diary data with providers is deferred (see ADR 0002)
- **LLM audit log for diary summaries** — the `llm_audit_log` currently covers only the Narrative Summary; diary summary Claude calls are not audited in v1
- **Streak gamification beyond counter** — no badges, achievements, or push nudges; the streak number only

---

## Further Notes

- The `/resources` page (crisis lines, psychoeducation) must be the first page implemented and must remain accessible without authentication at all times. This is a patient safety requirement, not a nice-to-have.
- EPIC sandbox test patients with postpartum data should be identified before beginning FHIR integration work. EPIC provides test patient credentials at `fhir.epic.com` under the "Test Patients" section.
- The SMART PKCE state parameter (CSRF nonce) must be stored in Postgres (not in-memory) to survive server restarts and horizontal scaling on Railway.
- The narrative summary prompt must include an explicit instruction: "Do not provide diagnosis, clinical recommendations, or medication advice. You are summarising existing clinical records in plain language for the patient."
- Railway deployment will require two services: `backend` (FastAPI) and `frontend` (Next.js) with separate Railway service configs, sharing a Railway Postgres plugin. The `deploy-railway.ps1` pattern from `Patient-Management-App/` should be adapted.
