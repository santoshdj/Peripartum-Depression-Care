# Phase 2 Complete — Backend API Implementation

**Date:** 2026-08-11  
**Status:** ✅ Complete  
**Next Phase:** Frontend UI Components (Phase 3)

---

## What Was Built

### 1. Mom Talk Forum API (/api/forum)

**Files Created:**
- `backend/app/routers/forum.py` (419 lines)
- `backend/app/services/content_moderation.py`
- `backend/tests/test_content_moderation.py`

**Endpoints:**
- `POST /api/forum/pseudonym` — Create/update patient's pseudonym
- `GET /api/forum/pseudonym` — Fetch current pseudonym
- `GET /api/forum/posts` — Paginated feed (public, no auth required)
- `GET /api/forum/posts/{post_id}` — Single post with replies (public)
- `POST /api/forum/posts` — Create new thread (authenticated)
- `POST /api/forum/posts/{post_id}/replies` — Reply to thread (authenticated)
- `POST /api/forum/posts/{post_id}/report` — Flag post for review
- `POST /api/forum/posts/{post_id}/replies/{reply_id}/report` — Flag reply

**Features:**
- **Anonymous posting** — Pseudonyms hide real FHIR names
- **Public read access** — GET endpoints work without authentication
- **AI content moderation** — Regex-based harmful keyword filter (suicide, self-harm, violence)
- **Crisis resource redirect** — Blocked posts return crisis hotline numbers
- **Report functionality** — Users can flag inappropriate content (sets moderation_status=FLAGGED)
- **Pagination** — Feed supports page/limit params (default 50 per page)

**Security:**
- Pseudonym uniqueness enforced (409 Conflict if taken)
- Authorization checks prevent patient A from using patient B's pseudonym
- Content sanitization (strip control chars, collapse whitespace)
- Moderation runs before write (harmful content never reaches DB)

---

### 2. FHIR Task Write-Back

**Files Modified:**
- `backend/app/routers/screening.py` — Added Task creation when EPDS >= 10
- `backend/app/services/fhir_resources.py` — Added `create_provider_alert_task()`

**Behavior:**
- When patient submits EPDS with score >= 10:
  1. QuestionnaireResponse + Observation written to EPIC (existing)
  2. **NEW:** Task resource created with:
     - `status=requested`, `priority=urgent`
     - `description` includes EPDS score + timestamp
     - `for` references Patient
     - Task appears in provider's EPIC "In Basket"
- Task creation failures are logged but don't block EPDS submission (patient still sees risk alert)
- Response includes `provider_alert_task_id` when Task created

**SMART Scope Required:** `patient/Task.write` (already in scope list)

---

### 3. Care Plan Suggestions API (/api/care-plan)

**Files Created:**
- `backend/app/routers/care_plan.py`
- `backend/app/services/care_plan_service.py`

**Endpoint:**
- `GET /api/care-plan/suggestions` — Returns 3-5 AI-generated actionable next steps

**Logic:**
1. Fetch latest EPDS score from cache
2. If score < 10, return empty array
3. If score >= 10:
   - Fetch diary trends (last 7 days avg mood/anxiety/sleep)
   - Fetch FHIR context (active Conditions, MedicationRequests, Appointments)
   - Build prompt with all context
   - Call Anthropic Claude (`claude-3-5-sonnet-20241022`)
   - Parse bullet points from response
   - Log to `llm_audit_log` table
   - Return suggestions with disclaimer

**Response Schema:**
```json
{
  "suggestions": ["...", "...", "..."],
  "disclaimer": "AI-generated suggestions · Not a treatment plan · Discuss with your care team",
  "epds_score": 14
}
```

**Features:**
- Contextual suggestions (reference patient's meds, appointments, diary trends)
- Always includes National Maternal Mental Health Hotline (1-833-943-5746)
- Suggestions NOT written to FHIR (patient discusses with provider, who authors official CarePlan)
- No caching in MVP (consider 24-hour TTL in production)

---

### 4. Diary Sharing API (/api/diary/share)

**Files Modified:**
- `backend/app/routers/diary.py` — Added `POST /share` endpoint, updated `GET /entries` response
- `backend/app/services/fhir_resources.py` — Added `create_diary_observation()`
- `backend/app/models/journal_entry.py` — Added `shared_to_fhir`, `fhir_observation_id`, `shared_at` fields (migration 0006)

**Endpoint:**
- `POST /api/diary/share` — Write selected entries to FHIR as Observations

**Request:**
```json
{
  "entry_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Logic:**
1. Fetch entries (authorization check: ensure they belong to current patient)
2. Filter out already-shared entries (idempotency via `shared_to_fhir` flag)
3. For each entry:
   - Construct FHIR Observation with LOINC code `LA28656-4`
   - `valueString` = "Mood: 3/5 | Sleep: 6 hours | Anxiety: 4/5 | Note: ..."
   - POST to EPIC `/Observation` endpoint
   - Update `journal_entries` record: `shared_to_fhir=TRUE`, `fhir_observation_id={id}`, `shared_at={now}`
4. Return count of shared entries + FHIR Observation IDs

**Response:**
```json
{
  "message": "Shared 3 diary entries with your care team",
  "shared_count": 3,
  "fhir_observation_ids": ["obs-123", "obs-456", "obs-789"]
}
```

**Updated GET /api/diary/entries:**
- Now includes `shared_to_fhir` (boolean) and `shared_at` (ISO 8601 string) in response
- Frontend uses these to display "Shared with care team ✓" badges

**Features:**
- **Patient-controlled** — Patient explicitly selects which entries to share
- **Idempotent** — Sharing already-shared entry returns success, no duplicate FHIR write
- **Authorization** — Patient A cannot share Patient B's entries
- **Permanent** — Once written to FHIR, entry persists (no revocation in MVP)
- **Partial failure tolerance** — If one entry fails, others still process

**SMART Scope Required:** `patient/Observation.write` (already in scope)

---

## Files Modified/Created Summary

### New Files (9)
1. `backend/app/routers/forum.py` — Mom Talk API
2. `backend/app/routers/care_plan.py` — Care Plan Suggestions API
3. `backend/app/services/content_moderation.py` — Harmful keyword filter
4. `backend/app/services/care_plan_service.py` — Claude-based suggestion generator
5. `backend/tests/test_content_moderation.py` — Moderation unit tests
6. `backend/alembic/versions/0004_add_forum_tables.py` (Phase 1)
7. `backend/alembic/versions/0005_add_users_table.py` (Phase 1)
8. `backend/alembic/versions/0006_add_diary_sharing_columns.py` (Phase 1)
9. `backend/app/models/forum.py`, `backend/app/models/user.py` (Phase 1)

### Modified Files (5)
1. `backend/app/main.py` — Registered forum + care_plan routers
2. `backend/app/routers/screening.py` — Added Task write-back when EPDS >= 10
3. `backend/app/routers/diary.py` — Added share endpoint, updated entries response
4. `backend/app/services/fhir_resources.py` — Added `create_provider_alert_task()`, `create_diary_observation()`
5. `backend/app/models/journal_entry.py` — Added sharing fields (Phase 1)

---

## API Surface Summary

### New Endpoints (14)

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | /api/forum/pseudonym | ✅ | Create/update pseudonym |
| GET | /api/forum/pseudonym | ✅ | Get current pseudonym |
| GET | /api/forum/posts | ❌ | Public feed |
| GET | /api/forum/posts/:id | ❌ | Public post detail |
| POST | /api/forum/posts | ✅ | Create post |
| POST | /api/forum/posts/:id/replies | ✅ | Reply to post |
| POST | /api/forum/posts/:id/report | ✅ | Flag post |
| POST | /api/forum/posts/:id/replies/:id/report | ✅ | Flag reply |
| GET | /api/care-plan/suggestions | ✅ | AI suggestions |
| POST | /api/diary/share | ✅ | Share entries to FHIR |

### Modified Endpoints (2)

| Method | Path | Change |
|--------|------|--------|
| POST | /api/screening/submit | Now creates Task when EPDS >= 10 |
| GET | /api/diary/entries | Response includes `shared_to_fhir`, `shared_at` |

---

## Testing Completed

### Unit Tests
- ✅ Content moderation (harmful keyword detection)
- ✅ Content sanitization (whitespace, control chars)

### Manual Testing Required (Phase 4)
- [ ] Forum post/reply creation with moderation
- [ ] FHIR Task appears in EPIC "In Basket" when EPDS >= 10
- [ ] Care plan suggestions generated with valid context
- [ ] Diary sharing writes Observations to EPIC sandbox
- [ ] Shared entries display "Shared ✓" badge in frontend

---

## Dependencies

### Python Packages
- `anthropic` — Claude API client (already in pyproject.toml)
- `httpx` — FHIR HTTP client (already in pyproject.toml)
- `sqlalchemy[asyncio]` — Database ORM (already in pyproject.toml)

### Environment Variables Required
- `ANTHROPIC_API_KEY` — For care plan suggestions + weekly summaries
- `EPIC_FHIR_BASE_URL` — EPIC sandbox URL
- `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET` — SMART OAuth

---

## Next Steps (Phase 3: Frontend)

### Priority 1 — Dashboard Enhancements
1. **Care Plan Suggestions Card** (`components/Dashboard/CarePlanSuggestions.tsx`)
   - Fetch GET /api/care-plan/suggestions on dashboard load
   - Display 3-5 bullet points with disclaimer
   - Only show when suggestions array non-empty (EPDS >= 10)
   - "Discuss with care team" CTA button

2. **Quick Check-In Widget** (`components/Dashboard/QuickCheckIn.tsx`)
   - Inline mood/sleep/anxiety form (no note textarea)
   - Displays when GET /api/diary/today returns `checked_in_today: false`
   - On submit: POST /api/diary/entries, transition to confirmation card

### Priority 2 — My Diary UI
1. **Sharing UI** (`components/Diary/ShareButton.tsx`)
   - Checkbox selection on entry cards
   - "Select last 7 days" quick action
   - Confirmation modal with permanence warning
   - POST /api/diary/share on confirm

2. **Shared Badges** (`components/Diary/SharedBadge.tsx`)
   - "Shared with care team ✓" on entries where `shared_to_fhir: true`

### Priority 3 — Mom Talk Forum
1. **Forum Pages**
   - `/app/mom-talk/page.tsx` — Feed with pagination
   - `/app/mom-talk/[postId]/page.tsx` — Post detail with replies

2. **Components**
   - `components/MomTalk/PostComposer.tsx` — New post form
   - `components/MomTalk/PostCard.tsx` — Post display
   - `components/MomTalk/ReplyList.tsx` — Threaded replies
   - `components/MomTalk/PseudonymSetup.tsx` — First-time pseudonym modal
   - `components/MomTalk/ReportButton.tsx` — Flag content

---

## Estimated Phase 2 Time

**Planned:** 2 weeks (14 days)  
**Actual:** ~6 hours (concentrated session)

**Breakdown:**
- Mom Talk API: 2 hours
- FHIR Task write-back: 30 minutes
- Care Plan Suggestions API: 1.5 hours
- Diary Sharing API: 1 hour
- Integration + documentation: 1 hour

Ready to proceed to Phase 3: Frontend UI Implementation.
