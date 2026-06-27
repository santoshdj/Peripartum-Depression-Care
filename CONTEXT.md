# Peripartum Depression Care Platform — Domain Glossary

**Product focus:** Patient-facing SMART on FHIR standalone app for peripartum depression screening, monitoring, and care plan access, integrated with the EPIC FHIR sandbox.

This file defines the canonical terms used across the codebase, ADRs, and PRD.  
Update here first; code naming follows this glossary.

---

## SMART on FHIR

A profile of OAuth2 used for authorising health apps against FHIR servers. **Standalone launch** means the patient opens the app directly (e.g. via a link) and authenticates through the EHR's patient portal (EPIC MyChart). The app receives a FHIR access token scoped to the authenticated patient and a `patient` context ID.

## EPIC FHIR Sandbox

The EPIC developer sandbox at `https://fhir.epic.com/interconnect-fhir-oauth/`. Used for all development and testing. Pre-populated with synthetic test patients including pregnancy and postpartum clinical data. Supports SMART on FHIR standalone launch with a registered Client ID.

## EPDS (Edinburgh Postnatal Depression Scale)

The gold-standard 10-item validated screening questionnaire for peripartum depression. Scores 0–30. A score ≥ 10 is the clinical threshold flagging moderate-to-severe risk. LOINC code: `89049-6`. Each submission is stored as a FHIR `QuestionnaireResponse` resource; the total score is stored as a FHIR `Observation` with the same LOINC code.

## EPDS Risk Threshold

An EPDS total score ≥ 10. Triggers a risk alert on the patient dashboard and a prompt to contact their care team. Rule-based — no LLM involved in this determination.

## Narrative Summary

An LLM-generated (Anthropic Claude) plain-language paragraph summarising the patient's current health context (conditions, medications, upcoming appointments, latest EPDS score) displayed at the top of the dashboard. Generated server-side by FastAPI; never includes diagnostic interpretation or clinical advice.

## FHIR Orchestration Layer

The FastAPI backend's primary role: it owns the SMART OAuth2 PKCE flow, exchanges the auth code for a FHIR access token, stores that token server-side in Postgres, and exposes its own REST API to the Next.js frontend. The frontend never holds or sends a FHIR token.

## Patient Session

A Postgres-persisted record (`sessions` table) mapping a UUID session ID to a FHIR access token, FHIR patient ID, and expiry timestamp. The UUID is stored in an HttpOnly cookie on the patient's browser. Destroyed on logout or token expiry.

## EPDS Submission

The act of a patient completing the 10-question EPDS form in the app. On submission, FastAPI writes two FHIR resources back to EPIC:
1. A `QuestionnaireResponse` — full question/answer pairs
2. An `Observation` — the total score with LOINC `89049-6`

The submission is also cached in Postgres for dashboard performance.

## FHIR Resources in Scope

The seven FHIR R4 resource types this app reads from and/or writes to EPIC:

| Resource | Read | Write | Purpose |
|---|---|---|---|
| `Patient` | ✓ | — | Demographics displayed on dashboard |
| `Observation` | ✓ | ✓ | EPDS scores, vitals, lab results |
| `Condition` | ✓ | — | Active diagnoses |
| `MedicationRequest` | ✓ | — | Current medications |
| `Appointment` | ✓ | — | Upcoming OB/MH appointments |
| `QuestionnaireResponse` | ✓ | ✓ | EPDS questionnaire submissions |
| `CarePlan` | ✓ | — | Current care plan goals and tasks |

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
openid
fhirUser
```

## LLM Audit Log

A Postgres table (`llm_audit_log`) recording each Anthropic Claude narrative summary generation: timestamp, patient FHIR ID (not name), model used, token counts, and a hash of the prompt. Used for cost tracking and debugging. No PHI stored in this table beyond the FHIR patient ID.

## Care Plan

A FHIR `CarePlan` resource retrieved from EPIC representing the patient's current peripartum care plan goals and activities. Read-only in this app — authoring of care plans remains in the EHR.

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

A peer support page at `/mom-talk` providing curated links to external, moderated peer support communities for peripartum mental health (e.g., Postpartum Support International forum at postpartum.net, PSI online support groups). No user-generated content is stored in this app. No FHIR dependency. The page includes a clinical disclaimer that peer support is not a substitute for professional care and surfaces the crisis hotline if a patient is in distress. Always accessible regardless of session state.

## Daily Check-In

A quick-entry widget surfaced on the dashboard when the patient has not yet submitted a Diary Entry today. Displays a compact inline form (mood, sleep, anxiety — no note textarea) that can be completed in under 30 seconds without leaving the dashboard. On submission the widget transitions to a confirmation card showing today's scores. Powered by `GET /api/diary/today` and `POST /api/diary/entries`. Reduces friction for habit formation without requiring navigation to My Diary.

## Check-In Streak

A count of consecutive calendar days on which the patient submitted at least one Diary Entry, ending today or yesterday. Displayed as a badge on the My Diary page. Returned by `GET /api/diary/streak` as `{ streak: number, checked_in_today: boolean }`. Computed server-side from distinct dates in `journal_entries`. Resets to zero if a day is missed. Used for habit motivation — no gamification mechanics beyond the counter.

## Weekly Patterns Summary

A Claude-generated (Anthropic) 3–4 sentence plain-language description of a patient's mood, sleep, and anxiety trends over the current calendar week. Generated only when the patient has ≥ 3 Diary Entries in the last 7 days; otherwise a progress prompt is shown. Input to Claude is aggregated numbers only (averages, best/worst day by mood score, entry count) — note text is never passed to the LLM. Cached per patient per week in the `weekly_summaries` Postgres table; regenerated when the entry count changes. Always labelled "AI · Your week · Not medical advice" in the UI.

## Journal Prompts

A static bank of 25 short writing prompts (e.g. "Today I noticed…", "My baby and I…", "One thing I'm grateful for…") displayed as tappable chip buttons above the note textarea on the My Diary page. Six prompts are selected at random on page load using `useMemo`. Tapping a chip appends its text to the note field. Prompts are client-side only — no server state, no personalisation, no storage. Purpose: reduce blank-page friction for patients who want to write but do not know where to start.
