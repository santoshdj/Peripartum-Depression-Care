# ADR 0002 — My Diary: App-Owned Postgres Storage (Not FHIR)

**Project:** Peripartum Depression Care Platform  
**Date:** 2026-06-23  
**Status:** Accepted  
**Deciders:** Product owner (via structured design session, 2026-06-23)

---

## Context

The My Diary feature allows patients to record daily self-monitoring check-ins: mood score (1–5), sleep hours (0–12), anxiety score (1–5), and an optional free-text note. These entries are patient-authored, subjective, and intended primarily for the patient's own reflection and trend monitoring.

The platform already writes clinical data (EPDS scores, QuestionnaireResponses) to EPIC via the FHIR API. The question is whether Diary Entries should follow the same pattern.

---

## Options Considered

| Option | Storage | Provider visibility | Infrastructure | PHI scope |
|---|---|---|---|---|
| **A — App Postgres (chosen)** | `journal_entries` table in this app's Postgres | None (patient-private) | Already exists | Covered by existing BAA scope |
| **B — FHIR Observation/DocumentReference** | Written to EPIC as `Observation` (LOINC 34109-9) or `DocumentReference` | Visible in EHR | Requires new SMART scope, EPIC registration change | EPIC owns the PHI |
| **C — Browser localStorage** | Client-only | None | Zero backend | No PHI on server |

---

## Decision: Option A — App-Owned Postgres

Diary Entries are stored in a new `journal_entries` Postgres table owned by this application.

**Reasons:**

1. **Patient privacy intent.** A daily mood/sleep/anxiety check-in is a personal reflection tool. Patients should not need to consent to EHR visibility to use it. Writing to FHIR would make every diary entry part of the permanent medical record accessible by any provider with EPIC access — a significant privacy implication the patient has no control over in this app's current design.

2. **FHIR write scope complexity.** Writing `DocumentReference` or note-type `Observation` resources requires adding `patient/DocumentReference.write` (or broader `patient/Observation.write` — already present but semantically intended for EPDS) to the SMART registration. EPIC's sandbox imposes review requirements for write scopes. Adding this scope for a journaling feature conflates clinical scoring data with subjective diary content.

3. **Infrastructure already exists.** The app already owns a Postgres instance with PHI (session tokens, LLM audit log, EPDS cache). Adding a `journal_entries` table is zero additional infrastructure. The HIPAA BAA obligation does not change.

4. **Option C rejected** — localStorage is unsuitable for a health monitoring feature; entries are lost on device change or cache clear, undermining the trend-over-time value.

---

## Consequences

- A new `journal_entries` table is added to the Postgres schema via Alembic migration.
- New FastAPI router `/api/diary` handles `GET` (list entries) and `POST` (create entry), protected by the existing session middleware.
- Diary entries are **never** written to FHIR in this version.
- A future "Share with care team" feature would require an explicit patient consent step and a separate FHIR write path — not implicit.
- If the app is decommissioned, diary data must be exported and handled per HIPAA retention rules — it is not automatically retained in the EHR.
