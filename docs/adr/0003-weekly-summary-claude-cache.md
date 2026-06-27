# ADR 0003 — Weekly Patterns Summary: Claude-Generated, Server-Cached, Numbers-Only

**Project:** Peripartum Depression Care Platform  
**Date:** 2026-06-23  
**Status:** Accepted  
**Deciders:** Product owner (via structured design session, 2026-06-23)

---

## Context

The My Diary feature stores a patient's daily mood, sleep, and anxiety scores in a local Postgres `journal_entries` table. Once a patient has accumulated several days of entries, there is value in surfacing a short plain-language description of the week's patterns — a "how has this week looked" summary — without requiring the patient to calculate averages themselves.

Three design decisions needed to be made:

1. **What data should be sent to the LLM?** — The diary entry schema includes a free-text `note` field that may contain sensitive personal disclosures.
2. **When and how should the summary be generated?** — Calling Claude on every page visit is expensive and slow; calling it never means stale results.
3. **Where should the summary be stored?** — Browser state only (volatile), or server-side cache (durable across devices and sessions).

---

## Options Considered

### Decision 1 — LLM Input: aggregated numbers vs. raw entries vs. full notes

| Option | LLM sees | PHI risk | Quality |
|---|---|---|---|
| **A — Aggregated numbers only (chosen)** | avg/best/worst mood, avg sleep, avg anxiety, entry count | Minimal — no free text | Sufficient for pattern description |
| **B — Raw scores + note text** | All fields including free-text note | High — patient reflections sent to third-party LLM | Richer, but disproportionate PHI risk |
| **C — Raw scores, no notes** | Mood/sleep/anxiety per day (with dates) | Low | Similar quality to A with more token cost |

### Decision 2 — Generation trigger: on-demand vs. scheduled vs. on new entry

| Option | Latency | Cost | Freshness |
|---|---|---|---|
| **A — On-demand with cache (chosen)** | Fast if cached; ~2s if miss | One call per new entry count change per week | Always reflects latest entry count |
| **B — Scheduled (daily cron)** | Fast (always pre-built) | Fixed regardless of usage | Up to 24h stale |
| **C — On every page load** | ~2s every visit | Expensive; proportional to page views | Always fresh |

### Decision 3 — Storage: server-cached in Postgres vs. client state only

| Option | Persistence | Multi-device | Infrastructure |
|---|---|---|---|
| **A — Postgres weekly_summaries table (chosen)** | Survives server restart, browser close | Yes — available on any device | Existing Postgres; zero new infra |
| **B — Browser sessionStorage** | Lost on tab close | No | Zero backend |
| **C — Regenerate always (no cache)** | N/A | Yes | Adds Claude cost per page load |

---

## Decisions

### Decision 1: Numbers only — no note text

Only aggregated statistics are passed to Claude:

- Average mood score for the week
- Best and worst day by mood score (day name only, not date or note)
- Average sleep hours
- Average anxiety score
- Number of entries

The `note` field of each `JournalEntry` is never read by `diary_summary_service.py`. This is enforced by computing aggregates from the `mood_score`, `sleep_hours`, and `anxiety_score` columns only before constructing the Claude prompt.

**Reason:** The note field may contain highly sensitive personal disclosures (relationship difficulties, intrusive thoughts, trauma). Sending it to a third-party LLM API without explicit per-entry consent would be a disproportionate privacy risk given that the summary adds no clinical value from the note text — pattern descriptions are adequately supported by the numerical scores alone.

### Decision 2: On-demand generation with entry-count invalidation

The summary is generated when:

1. The patient requests `GET /api/diary/weekly-summary`, AND
2. No cached `WeeklySummary` row exists for `(patient_fhir_id, current_week_start_date)`, OR the cached row's `entry_count` differs from the current count of entries in the last 7 days.

If the entry count has not changed since the last generation, the cached row is returned immediately.

Minimum threshold: 3 entries in the last 7 days. Fewer than 3 returns `{ available: false }` with a progress message — no Claude call is made.

**Reason:** Generation on every page load is cost-prohibitive and adds unnecessary latency. A scheduled cron adds operational complexity and can be stale. Entry-count invalidation ensures the summary is never more than one check-in stale, which is the right trade-off for a daily monitoring tool.

### Decision 3: Server-side Postgres cache (`weekly_summaries` table)

The generated summary is cached in Postgres as a `WeeklySummary` row. On a cache hit the summary is returned from the database, not regenerated.

Schema:
- `id` — UUID primary key
- `patient_fhir_id` — VARCHAR(256), indexed
- `week_start_date` — DATE (always the Monday of the current week, computed via `today - today.weekday()` in UTC)
- `summary_text` — TEXT
- `entry_count` — INTEGER (the count at time of generation; used for invalidation)
- `generated_at` — TIMESTAMPTZ

Composite index on `(patient_fhir_id, week_start_date)` for O(1) cache lookups.

**Reason:** The `weekly_summaries` table uses the existing Postgres instance (zero new infrastructure). Storing server-side means the patient sees the same summary across devices, which is important for a health monitoring tool. The table is lightweight — at most one active row per patient per week.

---

## Claude Prompt Design

**System prompt:** Instructs Claude to act as a warm, non-clinical health companion. Prohibits diagnosis, clinical recommendations, or medication advice. Requires exactly 3–4 sentences. Requires plain first-person-friendly language ("Your mood...", "You slept..."). Requires one brief encouraging observation to close.

**User message format:**
```
This week (N check-ins):
- Average mood: X/5 (best day: Monday at Y/5, hardest day: Thursday at Z/5)
- Average sleep: A hours/night
- Average anxiety: B/5

Please describe these patterns warmly in 3–4 sentences.
```

The model used is `settings.ANTHROPIC_MODEL` (currently `claude-sonnet-4-5-20250929`) — the same model as the Narrative Summary service — so there is one model configuration for all Claude calls in the app.

---

## Consequences

- A new `weekly_summaries` Postgres table is created via Alembic migration `0003`.
- `diary_summary_service.py` is the deep module for this feature; it has a clear interface (`generate_weekly_summary(patient_fhir_id, entries, db)`) and can be tested in isolation with a mocked Anthropic client.
- The diary router is the only consumer of the service; the cache logic lives in the router, not the service.
- Diary note text is architecturally isolated from LLM processing in this version. Any future decision to include note text in LLM calls must go through a separate ADR and should include an explicit patient consent mechanism.
- The `llm_audit_log` table does not currently log diary summary calls. This is accepted for v1 but should be addressed before production.
