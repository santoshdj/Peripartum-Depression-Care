# MathruMaitri — Implementation Roadmap

**Date:** 2026-08-11  
**Status:** In Progress  
**Target Completion:** 2026-09-30 (7 weeks)

---

## Overview

This roadmap implements the core feature set defined in PRD user stories 41–68:
- **Mom Talk** — Anonymous peer support forum (stories 53–60)
- **Provider Notifications** — FHIR Task write-back for EPDS ≥ 10 (stories 61–63)
- **Care Plan Suggestions** — AI-generated actionable next steps (stories 64–68)
- **Diary Sharing** — Patient-controlled FHIR Observation write (stories 48–52)
- **My Diary Enhancements** — Weekly patterns, check-in streak, dashboard widget (stories 41–47)

---

## Implementation Phases

### Phase 1: Database Schema (Week 1)

**Goal:** Create all required Postgres tables to support new features.

**Tasks:**
1. Create alembic migration for `forum_posts` table
2. Create alembic migration for `forum_replies` table
3. Create alembic migration for `users` table (language preference)
4. Add columns to `journal_entries` table (`shared_to_fhir`, `fhir_observation_id`, `shared_at`)
5. Run migrations against local dev database
6. Verify schema with `psql` inspection

**Acceptance Criteria:**
- All migrations run without errors
- Tables exist with correct column types and constraints
- Foreign key relationships properly defined
- Indexes added for query performance (patient_fhir_id, created_at)

**Estimated Effort:** 2–3 days

---

### Phase 2: Backend API Implementation (Weeks 2–3)

**Goal:** Build FastAPI endpoints for all new features, FHIR integrations, and AI services.

#### 2.1 Mom Talk Forum API

**Endpoints:**
- `POST /api/forum/posts` — Create new discussion thread
- `GET /api/forum/posts` — Fetch paginated feed (public, no auth required for read)
- `GET /api/forum/posts/:id` — Fetch single post with replies
- `POST /api/forum/posts/:id/replies` — Reply to thread
- `POST /api/forum/posts/:id/report` — Report inappropriate content
- `POST /api/forum/pseudonym` — Create/update patient's pseudonym

**Services:**
- `app/services/content_moderation.py` — AI filter for harmful keywords (suicide, self-harm, violence)
- Content moderation uses Anthropic Claude Moderation API or keyword regex filter
- Blocked posts redirect patient to crisis resources page

**Models:**
- `ForumPost` SQLAlchemy model
- `ForumReply` SQLAlchemy model
- Pydantic schemas for request/response validation

**Acceptance Criteria:**
- Posts are filtered before write (harmful content blocked)
- Pseudonyms are unique per patient
- Real names from FHIR never exposed in API responses
- Pagination works (50 posts/page)
- Report button flags post for manual review (`moderation_status='flagged'`)

**Estimated Effort:** 4–5 days

---

#### 2.2 FHIR Task Write-Back

**Files Modified:**
- `backend/app/routers/screening.py` — Modify `submit_screening()` endpoint
- `backend/app/services/fhir_client.py` — Add `create_task()` method

**Logic:**
1. After EPDS score calculated in `submit_screening()`
2. If `score >= 10`:
   - Construct FHIR Task resource with:
     - `status=requested`
     - `priority=urgent`
     - `code.text="Review peripartum depression screening"`
     - `description="Patient EPDS score: {score} (threshold: 10). Submitted: {timestamp}."`
     - `for=Patient/{patient_fhir_id}`
     - `owner=PractitionerRole/{provider_id}` (fetch from patient's care team)
   - POST Task to EPIC `/Task` endpoint
   - Log Task ID to database for audit trail
3. Return success to frontend (existing flow continues)

**SMART Scope Required:**
- `patient/Task.write` (already in scope list)

**Acceptance Criteria:**
- Task appears in EPIC sandbox "In Basket" for test provider
- Task includes EPDS score and timestamp in description
- Task is linked to correct patient via `for` reference
- Error handling if FHIR write fails (log error, alert patient, don't block EPDS submission)

**Estimated Effort:** 2–3 days

---

#### 2.3 Care Plan Suggestions API

**New Files:**
- `backend/app/routers/care_plan.py` — New router
- `backend/app/services/care_plan_service.py` — Business logic

**Endpoint:**
- `GET /api/care-plan/suggestions`
  - Query params: `patient_fhir_id` (from session)
  - Returns: `{ suggestions: string[], generated_at: datetime, disclaimer: string }`

**Logic:**
1. Fetch latest EPDS score from `epds_cache` table
2. If score < 10, return empty array (no suggestions needed)
3. If score >= 10:
   - Aggregate diary trends (last 7 days): avg mood, avg anxiety, avg sleep
   - Fetch FHIR data: active Conditions, current MedicationRequests, upcoming Appointments
   - Construct prompt for Anthropic Claude:
     ```
     Generate 3-5 actionable next steps for a patient with peripartum depression.
     
     EPDS Score: {score} (threshold: 10)
     Diary Trends (last 7 days): Avg mood {mood}/5, avg anxiety {anxiety}/5, avg sleep {sleep} hours
     Active Conditions: {condition_list}
     Current Medications: {medication_list}
     Upcoming Appointments: {appointment_list}
     
     Format as bullet points. Examples:
     - Consider scheduling intake with perinatal therapist
     - Discuss medication options at next OB visit
     - Contact National Maternal Mental Health Hotline: 1-833-943-5746
     
     Be specific, actionable, and supportive. Do not diagnose or prescribe.
     ```
   - Call Anthropic Claude API
   - Parse response into array of strings
   - Log to `llm_audit_log` (patient_fhir_id, model, tokens, prompt_hash)
   - Return suggestions with disclaimer

**Acceptance Criteria:**
- Suggestions are contextual (reference patient's conditions/meds)
- Disclaimer always included: "AI-generated suggestions · Not a treatment plan · Discuss with your care team"
- No suggestions generated when EPDS < 10
- Suggestions cached for 24 hours (avoid repeated API calls)
- LLM audit log populated for transparency

**Estimated Effort:** 3–4 days

---

#### 2.4 Diary Sharing API

**Files Modified:**
- `backend/app/routers/diary.py` — Add `share_entries()` endpoint
- `backend/app/services/fhir_client.py` — Add `create_observation()` method for diary entries

**New Endpoint:**
- `POST /api/diary/share`
  - Request body: `{ entry_ids: number[] }`
  - Response: `{ shared_count: number, fhir_observation_ids: string[] }`

**Logic:**
1. Validate session, get FHIR token
2. Fetch requested entries from `journal_entries` (ensure patient_fhir_id matches session)
3. Filter out already-shared entries (`shared_to_fhir = TRUE`)
4. For each entry:
   - Construct FHIR Observation with:
     - `status=final`
     - `category=survey`
     - `code=LA28656-4` (daily self-report)
     - `effectiveDateTime={entry.created_at}`
     - `valueString="Mood: {mood}/5 | Sleep: {sleep} hours | Anxiety: {anxiety}/5 | Note: {note}"`
   - POST to EPIC `/Observation` endpoint
   - Update `journal_entries` record: `shared_to_fhir=TRUE`, `fhir_observation_id={response.id}`, `shared_at=NOW()`
5. Return count of shared entries

**Modified Endpoint:**
- `GET /api/diary/entries` — Add `shared_to_fhir`, `shared_at` to response payload

**SMART Scope Required:**
- `patient/Observation.write` (already in scope)

**Acceptance Criteria:**
- Shared entries appear in EPIC sandbox as Observations under "Survey" category
- Idempotency: Sharing already-shared entry returns success, no duplicate write
- Authorization: Patient A cannot share Patient B's entries
- UI receives `shared_to_fhir` flag to display badges

**Estimated Effort:** 2–3 days

---

#### 2.5 My Diary Enhancements

**New Endpoints:**
- `GET /api/diary/today` — Check if patient has submitted today's entry
- `GET /api/diary/streak` — Calculate consecutive-day check-in streak
- `GET /api/diary/weekly-summary` — AI-generated plain-language weekly pattern (cached)

**Services:**
- `app/services/diary_summary_service.py` — Weekly patterns generator using Claude

**Logic for Weekly Summary:**
1. Fetch diary entries from last 7 calendar days
2. If < 3 entries, return "Keep going! Submit at least 3 entries this week to see your patterns."
3. If >= 3 entries:
   - Aggregate: avg mood, avg anxiety, avg sleep, best day (highest mood), worst day (lowest mood)
   - Construct prompt for Claude:
     ```
     Summarize this patient's peripartum depression symptom trends in 3-4 sentences.
     
     Last 7 days ({entry_count} entries):
     - Average mood: {avg_mood}/5
     - Average anxiety: {avg_anxiety}/5
     - Average sleep: {avg_sleep} hours
     - Best day: {best_day_date} (mood {best_mood}/5)
     - Worst day: {worst_day_date} (mood {worst_mood}/5)
     
     Write in plain language. Be supportive. Do not include diagnostic interpretation.
     ```
   - Call Claude API
   - Cache result in `weekly_summaries` table (patient_fhir_id, week_start_date, summary_text, entry_count, created_at)
   - Regenerate when entry_count changes
   - Return summary with label "AI · Your week · Not medical advice"

**Acceptance Criteria:**
- Streak resets to 0 if patient misses a day
- Weekly summary only shown when >= 3 entries
- Summary is cached per week (avoid repeated API calls)
- Dashboard widget calls `GET /api/diary/today` to show/hide quick check-in form

**Estimated Effort:** 3 days

---

### Phase 3: Frontend UI Components (Weeks 4–5)

**Goal:** Build Next.js pages and components for all new features.

#### 3.1 Mom Talk Forum UI

**New Pages:**
- `/app/mom-talk/page.tsx` — Forum feed page
- `/app/mom-talk/[postId]/page.tsx` — Single post detail with replies

**Components:**
- `components/MomTalk/PostComposer.tsx` — New post form with AI moderation warning
- `components/MomTalk/PostCard.tsx` — Forum post display with reply count, timestamp
- `components/MomTalk/ReplyList.tsx` — Threaded replies under post
- `components/MomTalk/ReportButton.tsx` — Flag inappropriate content
- `components/MomTalk/PseudonymSetup.tsx` — First-time pseudonym creation modal

**Features:**
- Pseudonym creation on first visit to `/mom-talk` (stored in backend)
- Post composer with character limit (500 chars for posts, 300 for replies)
- Clinical disclaimer banner: "Peer support is not professional care. Contact your provider for medical advice."
- "Report" button on every post (confirms before submitting)
- Message notifications (future: WebSocket, MVP: polling on page load)

**Acceptance Criteria:**
- Real names from FHIR never displayed
- Harmful content blocked with crisis resource redirect
- Pagination works (50 posts/page)
- Mobile-responsive design
- Accessible (ARIA labels, keyboard navigation)

**Estimated Effort:** 5–6 days

---

#### 3.2 Dashboard Enhancements

**Modified Files:**
- `app/dashboard/page.tsx` — Add quick check-in widget, care plan suggestions card

**New Components:**
- `components/Dashboard/QuickCheckIn.tsx` — Inline mood/sleep/anxiety form
- `components/Dashboard/CarePlanSuggestions.tsx` — AI suggestions when EPDS >= 10

**Quick Check-In Widget:**
- Displays when `GET /api/diary/today` returns `checked_in_today: false`
- Compact 3-field form (mood slider, sleep number input, anxiety slider)
- No note textarea (reduces friction)
- On submit: POST to `/api/diary/entries`, widget transitions to confirmation card

**Care Plan Suggestions Card:**
- Fetches `GET /api/care-plan/suggestions` on dashboard load
- Only displays when suggestions array non-empty (EPDS >= 10)
- Shows 3-5 bullet points with disclaimer
- "Discuss with care team" CTA button links to `/my-care` page

**Acceptance Criteria:**
- Quick check-in feels instant (no page navigation)
- Care plan suggestions clearly labeled as AI-generated
- Dashboard load time < 3 seconds (suggestions cached server-side)

**Estimated Effort:** 3 days

---

#### 3.3 My Diary UI Enhancements

**Modified Files:**
- `app/diary/page.tsx` — Add share button, selection UI, weekly summary, streak badge

**New Components:**
- `components/Diary/ShareButton.tsx` — Checkbox selection + confirmation dialog
- `components/Diary/WeeklySummary.tsx` — AI-generated pattern card
- `components/Diary/StreakBadge.tsx` — Consecutive days counter
- `components/Diary/SharedBadge.tsx` — "Shared with care team ✓" indicator on entries

**Share Flow:**
1. User clicks "Share with care team" button in toolbar
2. Checkbox selection UI appears on entry cards
3. User selects individual entries or clicks "Select last 7 days" quick action
4. User clicks "Share selected entries" button
5. Confirmation modal opens:
   - "You are about to share X diary entries with your care team."
   - "Shared entries will be added to your EPIC medical record and cannot be deleted."
   - [Cancel] [Share with Care Team]
6. On confirm: POST to `/api/diary/share`, show success toast
7. Shared entries display "Shared ✓" badge

**Weekly Summary Display:**
- Card at top of page (above entry list)
- Shows AI-generated summary when >= 3 entries in last 7 days
- Otherwise shows progress prompt: "Submit {3 - count} more entries to see your weekly patterns"

**Streak Badge:**
- Displayed next to page title
- Shows "🔥 {streak} day streak" when streak > 0
- Shows "Start your streak today!" when streak = 0

**Acceptance Criteria:**
- Confirmation dialog prevents accidental sharing
- Shared badge visible on all shared entries
- Weekly summary updates when new entries added
- Streak calculation accurate (handles timezone correctly)

**Estimated Effort:** 4 days

---

### Phase 4: Integration Testing (Week 6)

**Goal:** Verify all features work end-to-end with EPIC sandbox.

**Test Scenarios:**

#### 4.1 EPDS → Task Write-Back
1. Log in as test patient (Camila Lopez)
2. Complete EPDS with score >= 10
3. Verify Task appears in EPIC sandbox provider "In Basket"
4. Verify Task description includes score and timestamp
5. Verify Task linked to correct patient

#### 4.2 Diary Sharing → FHIR Observation
1. Submit 3 diary entries over 3 days
2. Navigate to `/diary`, select 2 entries
3. Click "Share with care team", confirm dialog
4. Verify 2 Observations appear in EPIC sandbox under "Survey" category
5. Verify shared entries display "Shared ✓" badge
6. Verify unshared entry does NOT appear in EPIC

#### 4.3 Care Plan Suggestions
1. Submit EPDS with score >= 10
2. Navigate to dashboard
3. Verify Care Plan Suggestions card appears with 3-5 bullet points
4. Verify disclaimer present
5. Verify suggestions reference FHIR data (meds, conditions, appointments)

#### 4.4 Mom Talk Forum
1. Navigate to `/mom-talk` as new user
2. Create pseudonym (e.g., "MamaBear2024")
3. Post discussion thread (harmless content)
4. Attempt to post harmful content (e.g., "I want to hurt myself")
5. Verify content blocked, redirected to crisis resources
6. Reply to own thread
7. Verify pseudonym displayed (not real name)
8. Click "Report" on post, verify flagged in database

#### 4.5 Weekly Patterns
1. Submit 4 diary entries over 4 consecutive days with varied mood scores
2. Navigate to `/diary`
3. Verify weekly summary card displays with AI-generated 3-4 sentence summary
4. Verify summary references best/worst days
5. Verify label "AI · Your week · Not medical advice" present

**Estimated Effort:** 3–4 days

---

### Phase 5: Security Review & Bug Fixes (Week 7)

**Goal:** Security audit, performance optimization, bug triage.

**Security Checklist:**
- [ ] No PHI in logs (diary note text, EPDS responses)
- [ ] Authorization checks on all new endpoints (patient A cannot access patient B's data)
- [ ] FHIR token never sent to frontend
- [ ] Rate limiting on Mom Talk post/reply endpoints (max 10 posts/hour)
- [ ] SQL injection prevention (parameterized queries via SQLAlchemy)
- [ ] XSS prevention (sanitize user input in Mom Talk posts)
- [ ] CSRF tokens on all POST endpoints
- [ ] Content moderation blocks harmful keywords before write

**Performance Optimization:**
- [ ] Cache care plan suggestions for 24 hours (avoid repeated Claude API calls)
- [ ] Cache weekly summaries per week (regenerate only when entry count changes)
- [ ] Index `journal_entries.patient_fhir_id` and `journal_entries.created_at`
- [ ] Index `forum_posts.created_at` for feed pagination
- [ ] Dashboard loads < 3 seconds (narrative summary + care plan suggestions)

**Bug Fixes:**
- Triage issues from manual testing
- Address edge cases (empty diary, network errors, FHIR write failures)

**Estimated Effort:** 4–5 days

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All migrations run successfully in Railway Postgres
- [ ] Environment variables configured:
  - `ANTHROPIC_API_KEY` (for Claude summaries + content moderation)
  - `EPIC_CLIENT_ID` (existing)
  - `EPIC_CLIENT_SECRET` (existing)
  - SMART scopes updated: `patient/Task.write`, `patient/Observation.write`
- [ ] Frontend environment variables:
  - `NEXT_PUBLIC_API_URL` (backend URL)
- [ ] All tests passing (unit + integration)
- [ ] Security review completed
- [ ] EPIC sandbox testing completed

### Deployment Steps

1. **Database Migration (Railway)**
   - Run alembic migrations against production Postgres
   - Backup database before migration
   - Verify schema with `psql` inspection

2. **Backend Deployment (Railway)**
   - Deploy FastAPI backend with new routers/services
   - Verify health check endpoint
   - Monitor logs for errors

3. **Frontend Deployment (Vercel/Railway)**
   - Deploy Next.js frontend with new pages/components
   - Verify build succeeds
   - Test SMART launch flow in production

4. **Smoke Testing**
   - Log in as test patient
   - Submit EPDS (verify Task write-back)
   - Share diary entry (verify Observation write-back)
   - Post to Mom Talk (verify content moderation)
   - Check dashboard (verify care plan suggestions load)

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| EPIC Task write-back fails (network error) | Provider not notified | Medium | Retry logic + fallback alert on patient dashboard |
| Content moderation misses harmful content | Patient safety issue | Low | Human moderation queue for flagged posts |
| Claude API rate limit exceeded | Summaries fail to generate | Low | Cache aggressively + fallback to "summary unavailable" |
| Diary sharing accidentally exposes private entries | Privacy violation | Low | Confirmation dialog + audit log |
| Forum spam/abuse | Community degradation | Medium | Rate limiting + report button + manual review |

---

## Success Metrics

**Adoption:**
- 60% of patients complete at least 1 EPDS screening
- 40% of patients submit at least 3 diary entries/week
- 20% of patients post or reply in Mom Talk

**Clinical Impact:**
- 90% of EPDS scores >= 10 trigger Task write-back successfully
- 50% of patients share at least 1 diary entry with care team
- Providers report seeing diary trends in EPIC within 2 weeks of launch

**Technical Performance:**
- Dashboard loads < 3 seconds (p95)
- FHIR API error rate < 1%
- No PHI leaks in logs or frontend storage

---

## Out of Scope (Future Phases)

- **Phase 2: Multilingual Support** (ADR 0004 — Spanish translation, 8-week project)
- **Phase 3: Provider Dashboard** (Epic In-App FHIR integration for providers to view aggregated patient cohorts)
- **Phase 4: Push Notifications** (WebSocket or FCM for real-time Mom Talk replies)
- **Phase 5: Advanced Analytics** (Trend analysis, risk prediction models, population health reporting)

---

## Timeline Summary

| Phase | Duration | Completion Target |
|-------|----------|------------------|
| Phase 1: Database Schema | 2–3 days | 2026-08-14 |
| Phase 2: Backend APIs | 2 weeks | 2026-08-28 |
| Phase 3: Frontend UI | 2 weeks | 2026-09-11 |
| Phase 4: Integration Testing | 1 week | 2026-09-18 |
| Phase 5: Security & Bug Fixes | 1 week | 2026-09-25 |
| **Deployment** | 2 days | 2026-09-30 |

**Total: 7 weeks**
