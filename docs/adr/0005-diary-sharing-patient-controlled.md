# ADR 0005 — Patient-Controlled Diary Sharing

**Status:** Accepted  
**Date:** 2026-08-11  
**Deciders:** Product owner, technical lead  
**Context:** Grill-with-docs requirements clarification session, Question 9c

---

## Context and Problem Statement

My Diary entries (mood, sleep, anxiety scores + optional notes) are stored in the app-owned Postgres database by default, never written to FHIR. This makes them private to the patient — providers cannot see diary trends unless the patient verbally shares them during visits.

**Problem:** This creates a tension between two competing values:

1. **Privacy as safety** — Patients journal more honestly when entries are private. Stigma around mental health means patients fear judgment if providers see "bad days" or negative thoughts in raw diary text.
2. **Clinical utility** — Providers need longitudinal symptom data to make accurate treatment decisions. Self-reported mood/anxiety trends between appointments are diagnostically valuable, especially when combined with EPDS scores.

**The design question:** Should diary entries remain forever private, or should patients have the option to share them with their care team?

---

## Decision Drivers

1. **Patient autonomy** — Any sharing mechanism must be patient-initiated and granular (not all-or-nothing)
2. **Honest journaling** — Default privacy must be preserved to encourage stigma-free self-monitoring
3. **Clinical continuity** — Shared diary data should integrate into the patient's EPIC record (not a separate system providers must check)
4. **Informed consent** — Patients must understand that shared entries become permanent medical records
5. **Implementation feasibility** — Solution must work within SMART on FHIR scopes and EPIC sandbox constraints

---

## Considered Options

### Option A: Forever Private (Status Quo)

Diary entries remain in Postgres only, never written to FHIR. Patients can screenshot or verbally share during appointments, but no programmatic integration.

**Pros:**
- Simplest implementation (no FHIR write logic)
- Maximizes privacy and encourages honest journaling
- No consent workflow complexity

**Cons:**
- Providers lose valuable longitudinal data
- Patient must remember to share verbally (often forgotten in 15-minute visits)
- Screenshots are not structured data — cannot be charted or trended in EHR

**Risk:** Missed diagnostic signals. Provider cannot see escalating anxiety trend between EPDS screenings.

---

### Option B: Always Share (Auto-Write to FHIR)

Every diary entry is automatically written to FHIR as an Observation resource on submission. No patient opt-in required.

**Pros:**
- Maximizes clinical utility
- No UI/UX complexity — "what you write is what providers see"
- Provider can chart mood/anxiety trends in EPIC over time

**Cons:**
- **Privacy violation** — Patients will self-censor or stop journaling entirely if they know providers read every entry
- **Stigma reinforcement** — Undermines the "safe space" positioning of My Diary
- **Consent issue** — Patients may not realize diary notes become part of permanent medical record

**Risk:** Feature abandonment. Research shows private journals have 3–5× higher engagement than shared ones in mental health apps.

---

### Option C: Patient-Controlled Opt-In Sharing (Selected)

**Default:** Diary entries private (Postgres only).  
**Patient action:** Can select specific entries or date ranges to share via "Share with care team" button in `/diary` UI.  
**Backend:** Writes selected entries to FHIR as Observation resources with code `LA28656-4` (daily self-report), structured fields (mood/sleep/anxiety scores) + note text in `valueString`.  
**UI indicator:** Shared entries display "Shared with care team ✓" badge.  
**Retroactive sharing allowed:** Patient can share old entries at any time (no time window restriction).  
**No revocation:** Once written to FHIR, entry persists per clinical data retention policy (patient cannot "unshare").

**Pros:**
- **Balances privacy and utility** — Patients journal honestly by default, share strategically before appointments
- **Patient autonomy** — Granular control over what providers see
- **Clinical integration** — Shared data flows into EPIC as structured Observations (chartable/trendable)
- **Informed consent** — Sharing action + confirmation dialog makes permanence explicit

**Cons:**
- More complex implementation (FHIR write logic, UI selection state, Postgres `shared_to_fhir` flag)
- Patient must remember to share before appointments (but less friction than verbal recall)
- Providers may see incomplete picture if patient shares selectively

**Mitigation:** 
- Add "Share last 7 days" quick action for appointment prep
- Include "Discuss diary trends with your provider" prompt in care plan suggestions when EPDS ≥ 10
- Provider-facing documentation explains diary sharing is opt-in (partial data expected)

---

## Decision Outcome

**Chosen option:** **Option C — Patient-Controlled Opt-In Sharing**

**Rationale:**
1. Preserves My Diary as a stigma-free safe space (privacy by default)
2. Empowers patients to control clinical narrative (share successes + struggles on their terms)
3. Provides structured data integration when patient consents (vs. screenshots)
4. Aligns with SMART on FHIR's patient-mediated access model (patient authorizes data flow)

---

## Implementation Details

### FHIR Resource Mapping

Each shared diary entry becomes one FHIR `Observation` resource:

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "LA28656-4",
        "display": "Daily mood and anxiety self-report"
      }
    ]
  },
  "subject": {
    "reference": "Patient/{fhir_patient_id}"
  },
  "effectiveDateTime": "2026-08-10T14:30:00Z",
  "issued": "2026-08-10T14:35:00Z",
  "valueString": "Mood: 3/5 | Sleep: 6 hours | Anxiety: 4/5 | Note: Felt overwhelmed today after baby's 2am feeding. Hard to get back to sleep."
}
```

**Note on LOINC code:** `LA28656-4` is used as a generic patient self-report code. If a more specific LOINC exists for peripartum mood tracking, update mapping. The critical requirement is `category=survey` + structured text in `valueString`.

### Database Schema Update

Add column to `journal_entries` table:

```sql
ALTER TABLE journal_entries 
ADD COLUMN shared_to_fhir BOOLEAN DEFAULT FALSE,
ADD COLUMN fhir_observation_id VARCHAR(255) NULL,
ADD COLUMN shared_at TIMESTAMP NULL;
```

**Purpose:**
- `shared_to_fhir` — Prevents duplicate FHIR writes if patient clicks "Share" multiple times
- `fhir_observation_id` — EPIC's assigned ID for the Observation resource (for auditing)
- `shared_at` — Timestamp when entry was shared (for UI badge + analytics)

### API Endpoints

**New endpoint:** `POST /api/diary/share`

```python
@router.post("/diary/share")
async def share_diary_entries(
    request: DiaryShareRequest,  # { entry_ids: List[int] }
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Write selected diary entries to FHIR as Observation resources.
    Updates journal_entries.shared_to_fhir = TRUE.
    Returns list of created FHIR Observation IDs.
    """
    # 1. Validate session and get FHIR token
    # 2. Fetch requested entries (ensure they belong to current patient)
    # 3. Filter out already-shared entries (shared_to_fhir = TRUE)
    # 4. For each entry:
    #    - Construct FHIR Observation payload
    #    - POST to EPIC /Observation endpoint
    #    - Update journal_entries record with fhir_observation_id, shared_to_fhir=TRUE, shared_at=NOW()
    # 5. Return success response with count of shared entries
```

**Modified endpoint:** `GET /api/diary/entries`

Add `shared_to_fhir` and `shared_at` to response payload so UI can display badges.

### UI Components

**Diary list page (`/diary`):**
- Add "Share with care team" button in toolbar (sticky, visible above entry list)
- Add checkbox selection UI for multi-select (individual entries or "Select last 7 days" quick action)
- Display "Shared ✓" badge on entries where `shared_to_fhir = TRUE`
- Confirmation modal on share action:
  - "You are about to share X diary entries with your care team."
  - "Shared entries will be added to your EPIC medical record and cannot be deleted."
  - "Are you sure you want to continue?"
  - [Cancel] [Share with Care Team]

**Dashboard quick check-in:**
- No share button on dashboard widget (reduces cognitive load for daily habit)
- Patients must navigate to `/diary` to share entries (deliberate friction for informed consent)

### SMART Scope Requirement

Add to OAuth scope list:

```
patient/Observation.write
```

Already included in current scope configuration — no auth flow changes needed.

---

## Privacy and Consent Considerations

1. **Onboarding disclosure** — Add diary sharing explanation to first-run tutorial:  
   _"Your diary is private by default. You can choose to share specific entries with your care team at any time. Shared entries become part of your medical record."_

2. **Confirmation dialog** — Every share action requires explicit confirmation with permanence warning (see UI Components above).

3. **No auto-sharing triggers** — Even when EPDS ≥ 10, diary remains private. Care plan suggestions may recommend sharing ("Consider sharing your diary trends with your provider"), but never auto-share.

4. **No bulk export** — No "Share all entries" button. Patient must select date ranges or individual entries to prevent accidental over-sharing.

5. **Provider documentation** — EPIC-facing documentation must explain:
   - Diary observations are patient-selected (may be incomplete)
   - Absence of diary data does not mean patient is not journaling (just not sharing)
   - Observations tagged with `category=survey` + code `LA28656-4` originate from MathruMaitri app

---

## Testing Strategy

### Unit Tests

- `POST /api/diary/share` — success path (1 entry, multiple entries)
- `POST /api/diary/share` — idempotency (sharing already-shared entry returns success, no duplicate FHIR write)
- `POST /api/diary/share` — authorization (patient A cannot share patient B's entries)
- FHIR payload construction — verify Observation JSON matches spec

### Integration Tests

- Write diary entry → share entry → verify FHIR Observation created in EPIC sandbox → fetch via FHIR API → confirm `valueString` matches original entry
- Share entry → verify `journal_entries.shared_to_fhir = TRUE` and `fhir_observation_id` populated
- `GET /api/diary/entries` — verify shared entries return `shared_to_fhir: true` in response

### Manual Testing (EPIC Sandbox)

1. Log in as test patient (e.g., `Camila Lopez`, DOB 1987-09-12, Patient ID from sandbox)
2. Submit 3 diary entries over 3 consecutive days (varied mood/anxiety scores)
3. Navigate to `/diary`, select 2 entries, click "Share with care team"
4. Confirm in EPIC sandbox that 2 Observation resources appear in patient chart under "Survey" category
5. Verify shared entries display "Shared ✓" badge in MathruMaitri UI
6. Verify unshared entry does NOT appear in EPIC

---

## Security Review

- **Authorization:** Diary sharing endpoint validates session ownership before writing to FHIR (prevent cross-patient sharing)
- **PHI in logs:** Do NOT log diary note text — log only `entry_id`, `patient_fhir_id`, FHIR Observation ID
- **Error handling:** If FHIR write fails (network error, token expiry), return error to patient and do NOT mark `shared_to_fhir = TRUE` (prevents silent data loss)
- **Rate limiting:** Enforce max 50 shares per patient per day to prevent abuse/misuse

---

## Future Enhancements (Out of Scope for MVP)

1. **Revocation mechanism** — Allow patient to mark shared entries as "retracted" (adds an Observation with `status=entered-in-error` referencing original). Requires provider workflow education.
2. **Provider-requested sharing** — Provider can send in-app request "Please share your diary entries from last week" → patient approves/denies in UI.
3. **Summarized sharing** — Instead of full note text, share only aggregated scores (average mood, sleep, anxiety) as structured FHIR component values.
4. **Pre-visit sharing reminder** — When patient has upcoming appointment in next 3 days, show banner: "Appointment with Dr. Smith on Friday — consider sharing recent diary entries."

---

## Consequences

### Positive

- Patients maintain control over personal mental health narrative
- Providers gain access to structured longitudinal symptom data when patient consents
- Shared data integrates cleanly into existing EHR workflows (no separate portal to check)
- SMART on FHIR's patient-mediated access model is reinforced (patient authorizes data flow)

### Negative

- Providers may see incomplete diary data (patient shares selectively)
- Additional implementation complexity (selection UI, FHIR write logic, consent workflow)
- Patient must remember to share before appointments (not automatic)

### Neutral

- Diary sharing adoption rate is unknown (may require user education campaign)
- Provider training required to interpret patient-selected diary observations in EPIC

---

## References

- LOINC code `LA28656-4` — https://loinc.org/LA28656-4/
- FHIR R4 Observation resource — https://hl7.org/fhir/R4/observation.html
- SMART App Launch Framework — https://hl7.org/fhir/smart-app-launch/
- Patient-Generated Health Data (PGHD) guidelines — https://www.healthit.gov/topic/scientific-initiatives/patient-generated-health-data
