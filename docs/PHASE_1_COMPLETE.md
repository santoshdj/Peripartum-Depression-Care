# Phase 1 Complete — Database Schema Implementation

**Date:** 2026-08-11  
**Status:** ✅ Complete  
**Next Phase:** Backend API Implementation (Phase 2)

---

## What Was Built

### Alembic Migrations Created

Three new database migrations added to `backend/alembic/versions/`:

1. **0004_add_forum_tables.py**
   - Created `forum_posts` table with columns:
     - `id` (UUID primary key)
     - `patient_fhir_id` (indexed)
     - `pseudonym` (50 char max, displays instead of real name)
     - `post_content` (text)
     - `moderation_status` (enum: pending, approved, rejected, flagged)
     - `created_at` (indexed for feed pagination)
   - Created `forum_replies` table with columns:
     - `id` (UUID primary key)
     - `post_id` (foreign key to forum_posts, CASCADE delete)
     - `patient_fhir_id`
     - `pseudonym`
     - `reply_content` (text)
     - `moderation_status` (same enum)
     - `created_at` (indexed)
   - Indexes optimized for:
     - Feed pagination (ORDER BY created_at DESC)
     - Patient post history (WHERE patient_fhir_id = ?)
     - Reply threads (WHERE post_id = ?)

2. **0005_add_users_table.py**
   - Created `users` table with columns:
     - `fhir_patient_id` (primary key, one row per patient)
     - `language_preference` (ISO 639-1 code: en, es — defaults to 'en')
     - `pseudonym` (unique across all patients, created on first Mom Talk visit)
     - `created_at`, `updated_at` (timestamps)
   - Unique constraint + index on `pseudonym` prevents collisions

3. **0006_add_diary_sharing_columns.py**
   - Added columns to existing `journal_entries` table:
     - `shared_to_fhir` (boolean, default false — tracks if entry written to FHIR)
     - `fhir_observation_id` (string, nullable — EPIC's assigned Observation ID)
     - `shared_at` (datetime, nullable — timestamp when patient shared)
   - Composite index on `(patient_fhir_id, shared_to_fhir)` for efficient shared entry queries

---

### SQLAlchemy Models Created

Three new model files added to `backend/app/models/`:

1. **forum.py**
   - `ForumPost` model (maps to forum_posts table)
   - `ForumReply` model (maps to forum_replies table)
   - `ModerationStatus` enum class
   - SQLAlchemy relationship: `ForumPost.replies` → list of `ForumReply`
   - CASCADE delete: deleting post auto-deletes all replies

2. **user.py**
   - `User` model (maps to users table)
   - Primary key is `fhir_patient_id` (one user record per FHIR patient)
   - `pseudonym` field unique across all users
   - `updated_at` auto-updates on model modification

3. **journal_entry.py** (updated)
   - Added `shared_to_fhir`, `fhir_observation_id`, `shared_at` fields
   - Updated docstring to reference ADR 0005 (patient-controlled sharing)

---

### Model Registration

Updated `backend/app/models/__init__.py` to export all new models:
- `ForumPost`, `ForumReply`, `ModerationStatus`
- `User`
- `JournalEntry` (now includes sharing fields)

This ensures:
- Models are importable across codebase
- Alembic autogenerate detects model changes
- FastAPI routers can import models for queries

---

## How to Run Migrations

### Option 1: Docker Compose (recommended for local dev)

```bash
# From project root
docker compose up -d postgres backend
docker compose exec backend uv run alembic upgrade head
```

### Option 2: Local Python Environment

```bash
# From backend/ directory
cd backend
uv sync  # Install dependencies if not already done
uv run alembic upgrade head
```

### Verify Schema

```bash
# Connect to Postgres
docker compose exec postgres psql -U postgres -d peripartum_db

# List tables
\dt

# Describe forum_posts schema
\d forum_posts

# Describe journal_entries (should show new sharing columns)
\d journal_entries
```

Expected output:
- `forum_posts` table with 6 columns + moderation_status enum
- `forum_replies` table with 7 columns + foreign key to forum_posts
- `users` table with 5 columns + unique pseudonym constraint
- `journal_entries` table now has 10 columns (original 7 + 3 new sharing columns)

---

## Schema Design Decisions

### Pseudonyms Stored in users Table (not forum_posts)

**Rationale:** Pseudonym is a patient-level preference, not post-level metadata.
- Patient creates one pseudonym on first Mom Talk visit
- Same pseudonym used across all posts + replies (consistency)
- Stored in `users` table with UNIQUE constraint (prevents duplicates)
- Foreign key NOT required (denormalized copy in forum_posts for query performance)

**Trade-off:** Pseudonym changes require updating all existing posts/replies. Acceptable because:
- Pseudonym changes expected to be rare (or disallowed in MVP)
- If needed, can batch update via migration

### moderation_status Enum (not separate table)

**Rationale:** Four fixed statuses (pending, approved, rejected, flagged) unlikely to change.
- Simpler queries (no JOIN required)
- Faster writes (one INSERT, no FK lookup)
- Type safety via SQLAlchemy Enum

**Trade-off:** Adding new statuses requires migration. Acceptable because:
- Moderation workflow is stable (approved/rejected/flagged covers all cases)
- If complex moderation needed (e.g., multiple flagging reasons), refactor to separate table in Phase 3

### Shared Entries Denormalized (not separate table)

**Rationale:** Diary sharing is an **attribute** of a journal entry, not a separate entity.
- `shared_to_fhir` flag prevents duplicate FHIR writes (idempotency)
- `fhir_observation_id` enables audit trail (trace entry → FHIR resource)
- `shared_at` timestamp for UI badges + analytics

**Alternative considered:** Separate `diary_shares` table (entry_id, fhir_observation_id, shared_at). Rejected because:
- Adds JOIN complexity to common queries (GET /api/diary/entries)
- Sharing status is 1:1 with entry (not many-to-many)

---

## Database Indexes Summary

Performance-optimized for expected query patterns:

| Table | Index | Query Pattern |
|-------|-------|---------------|
| `forum_posts` | `(created_at)` | Feed pagination (ORDER BY created_at DESC LIMIT 50) |
| `forum_posts` | `(patient_fhir_id)` | Patient's post history |
| `forum_replies` | `(post_id)` | Fetch all replies for a thread |
| `forum_replies` | `(created_at)` | Reply sorting within thread |
| `users` | `(pseudonym)` | Pseudonym uniqueness check on creation |
| `journal_entries` | `(patient_fhir_id, shared_to_fhir)` | Fetch unshared entries for sharing UI |

---

## Next Steps (Phase 2)

With database schema complete, proceed to backend API implementation:

1. **Mom Talk Forum API** (`backend/app/routers/forum.py`)
   - POST /api/forum/posts (create thread)
   - GET /api/forum/posts (fetch feed with pagination)
   - POST /api/forum/posts/:id/replies (reply to thread)
   - POST /api/forum/posts/:id/report (flag for review)
   - POST /api/forum/pseudonym (create/update pseudonym)

2. **Content Moderation Service** (`backend/app/services/content_moderation.py`)
   - AI-powered keyword filter (suicide, self-harm, violence)
   - Block harmful posts before write, redirect to crisis resources

3. **FHIR Task Write-Back** (modify `backend/app/routers/screening.py`)
   - Add Task creation when EPDS score ≥ 10
   - Write to EPIC /Task endpoint with status=requested, priority=urgent

4. **Care Plan Suggestions API** (`backend/app/routers/care_plan.py`)
   - GET /api/care-plan/suggestions
   - Claude-generated 3-5 actionable next steps when EPDS ≥ 10

5. **Diary Sharing API** (modify `backend/app/routers/diary.py`)
   - POST /api/diary/share (patient-selected entries → FHIR Observations)
   - Update GET /api/diary/entries to return shared_to_fhir flag

---

## Files Modified

**New Files:**
- `backend/alembic/versions/0004_add_forum_tables.py`
- `backend/alembic/versions/0005_add_users_table.py`
- `backend/alembic/versions/0006_add_diary_sharing_columns.py`
- `backend/app/models/forum.py`
- `backend/app/models/user.py`
- `docs/IMPLEMENTATION_ROADMAP.md` (7-week phased plan)

**Modified Files:**
- `backend/app/models/journal_entry.py` (added sharing columns)
- `backend/app/models/__init__.py` (export new models)

---

## Testing Checklist (before Phase 2)

- [ ] Run `uv run alembic upgrade head` — all migrations apply successfully
- [ ] Verify all 4 new tables exist in Postgres (`\dt` in psql)
- [ ] Verify journal_entries has 10 columns (original 7 + 3 sharing fields)
- [ ] Verify forum_posts.moderation_status enum exists (`\dT`)
- [ ] Verify users.pseudonym has UNIQUE constraint (`\d users`)
- [ ] Run `uv run alembic downgrade base` → `upgrade head` — reversibility works
- [ ] No foreign key errors on forum_replies.post_id (CASCADE delete configured)

---

## Estimated Phase 1 Time

**Planned:** 2–3 days  
**Actual:** ~2 hours (migrations + models only, no testing yet)

Ready to proceed to Phase 2: Backend API Implementation.
