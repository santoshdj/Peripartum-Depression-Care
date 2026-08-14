# ADR 0004 — Multilingual Support Strategy

**Project:** Peripartum Depression Care Platform  
**Date:** 2026-08-11  
**Status:** Deferred to Phase 2  
**Deciders:** Product owner (via grill-with-docs session, 2026-08-11)

---

## Context

The Peripartum Depression Care Platform currently supports English only. Maternal health disparities disproportionately affect non-English-speaking populations — particularly Spanish-speaking patients who represent approximately 50% of non-English-speaking pregnant patients in the US. The Digilego framework paper (Zingg et al., 2021) identifies multilingual support as a critical feature for addressing stigma and access barriers but defers implementation to future work.

This ADR documents the planned approach for multilingual support to be implemented in Phase 2 after core features (EPDS screening, Mom Talk, provider alerts, care plan suggestions) are stabilized in production.

---

## Decision 1 — Target Languages: Spanish Only (Phase 2)

**Options considered:**

| Option | Languages | Coverage (US maternal health) | Translation Cost |
|--------|-----------|-------------------------------|------------------|
| **A — Spanish only (chosen)** | Spanish + English | ~50% of non-English-speaking pregnant patients | Moderate (professional medical translation for ~500 strings) |
| **B — Spanish + Chinese + Vietnamese** | 3 languages + English | ~75% of non-English-speaking pregnant patients | High (3× translation cost + ongoing maintenance) |
| **C — All major UN languages** | Arabic, Chinese, English, French, Russian, Spanish | Global coverage but minimal US impact beyond Spanish/Chinese | Very high; most languages have <5% US maternal health population |
| **D — Machine translation (20+ languages)** | Any language via Google Translate API | Near-universal coverage | Low cost but unacceptable quality for mental health content |

**Decision:** Option A — Spanish only for Phase 2.

**Rationale:**
- Spanish speakers represent the largest maternal health disparity population in the US where this app is targeted (EPIC sandbox, Railway deployment)
- Professional medical translation ensures safety-critical content (crisis hotlines, EPDS questions, risk alerts) is clinically accurate
- Single additional language reduces QA burden and allows validation of i18n infrastructure before scaling
- Machine translation (Option D) rejected due to high risk of mistranslation in mental health context (e.g., "I have thoughts of harming myself" mistranslated could miss a crisis)

**Phase 3 consideration:** Add Simplified Chinese and Vietnamese if usage data shows demand.

---

## Decision 2 — Translation Scope: UI + Static Content (AI Summaries Deferred)

**Options considered:**

| Option | What gets translated | Safety implications |
|--------|---------------------|---------------------|
| **A — UI strings only** | Buttons, labels, navigation, form fields | Minimal — no clinical content risk |
| **B — UI + static content (chosen)** | Option A + crisis resources, educational materials, journal prompts, Mom Talk guidelines | Moderate — requires clinical review of static content |
| **C — UI + static + AI summaries** | Option B + Claude-generated narrative summaries and care plan suggestions | High — requires Spanish prompt engineering and clinical validation per language |
| **D — Everything including UGC** | Option C + auto-translate user diary entries and Mom Talk posts | Very high — privacy risk (PHI translation), cultural context loss |

**Decision:** Option B — UI strings + static content.

**Rationale:**
- Static content (crisis resources, EPDS questions, educational materials) can be professionally translated once and reviewed by bilingual clinicians
- AI-generated summaries (narrative summary, care plan suggestions, weekly patterns) require Spanish prompt engineering and clinical validation to ensure equivalent quality and safety — deferred until English prompts are stable
- User-generated content (diary notes, Mom Talk posts) translation creates PHI handling complexity and cultural context loss — deferred indefinitely

**Content requiring professional medical translation:**
- EPDS 10-item questionnaire (existing validated Spanish version available: EPDS-S)
- Crisis resources (National Maternal Mental Health Hotline, PSI resources — official Spanish versions exist)
- Risk alert messages ("Your EPDS score indicates moderate-to-severe symptoms...")
- Mom Talk community guidelines and moderation messages
- Journal prompts (25 writing prompts)

**Content remaining English-only in Phase 2:**
- Claude-generated narrative summaries (dashboard)
- Claude-generated care plan suggestions
- Claude-generated weekly patterns summaries
- User-generated content (diary entries, Mom Talk posts)

---

## Decision 3 — Language Selection: Explicit User Preference

**Options considered:**

| Option | Selection method | User experience | Data consistency |
|--------|-----------------|-----------------|------------------|
| **A — Explicit selector (chosen)** | Language picker on login screen + settings page | Clear user control; no surprises | Stored in Postgres `users` table; survives sessions |
| **B — Browser auto-detect** | Read `Accept-Language` header with override in settings | Convenient but error-prone (shared devices, VPNs) | Must still store preference to avoid flipping |
| **C — FHIR-derived** | Pull from `Patient.communication.language` if present | Matches EHR record; eliminates duplicate storage | Not all patients have this field populated in EPIC |

**Decision:** Option A — Explicit selector with Postgres storage.

**Rationale:**
- Mental health apps require explicit consent and control — no "surprises" from auto-detection
- Browser language headers are unreliable (shared family devices, VPN servers, English-configured browsers for non-English speakers)
- FHIR `Patient.communication.language` field is optional and inconsistently populated in EPIC sandbox
- Storing preference in app-owned Postgres `users` table (new table created during multilingual implementation) decouples language choice from FHIR session state

**UX Flow:**
1. Patient lands on login screen → language selector visible (🌐 icon, dropdown showing "English" and "Español")
2. Patient selects language → page reloads with translated UI strings
3. After SMART login completes → language preference saved to `users` table keyed by `fhir_patient_id`
4. On subsequent visits → language auto-applied from stored preference
5. Settings page includes language selector for changing preference

**No write-back to FHIR:** Language preference is not written to `Patient.communication.language` — this is patient app preference, not clinician-validated EHR data.

---

## Decision 4 — Implementation Method: react-i18next + JSON Translation Files

**Options considered:**

| Option | Technology | Translation workflow | Cost model |
|--------|-----------|---------------------|------------|
| **A — react-i18next (chosen)** | i18n library + JSON files in repo | Developers commit translation files; clinical review via PR | One-time professional translation cost (~$1,500 for 500 strings) |
| **B — Translation management platform** | Lokalise/Phrase with API integration | Non-technical translators edit via web UI | Monthly SaaS fee ($50-200/mo) + per-word translation cost |
| **C — Runtime machine translation** | Google Cloud Translation API | No static files; translate on demand | Per-character API cost; poor quality for medical content |
| **D — Separate frontends per language** | `es.yourapp.com` deployed separately | Complete isolation; no i18n complexity | 2× infrastructure cost; deployment complexity |

**Decision:** Option A — `react-i18next` with JSON translation files.

**Rationale:**
- `react-i18next` is production-grade, widely adopted, and integrates cleanly with Next.js App Router
- Translation files stored in repo (`frontend/locales/es.json`, `frontend/locales/en.json`) enable version control and clinical review via GitHub PR workflow
- One-time professional translation cost fits portfolio project budget constraints
- No recurring SaaS fees or per-request API costs
- Static translation files ensure consistent quality (no API outages, no rate limits, no token costs)

**Implementation structure:**

```
frontend/
├── locales/
│   ├── en.json          # English (source of truth)
│   └── es.json          # Spanish (professional translation)
├── middleware.ts         # Detect language preference from cookie
└── app/
    └── [lang]/
        ├── layout.tsx    # Root layout with i18next provider
        └── dashboard/
            └── page.tsx  # Use t('dashboard.title')
```

**Backend support:**
- Add `language_preference` column to new `users` table (schema: `fhir_patient_id`, `language_preference`, `created_at`, `updated_at`)
- Add `GET /api/users/me` endpoint returning `{ language_preference: 'es' | 'en' }`
- Add `PATCH /api/users/me` endpoint accepting `{ language_preference: 'es' | 'en' }`
- Language preference persisted across sessions

**Translation workflow:**
1. Developer updates `en.json` with new strings
2. Export `en.json` → send to professional medical translation service with clinical context
3. Receive `es.json` → import to repo
4. Bilingual clinician reviews `es.json` PR for clinical accuracy
5. Merge → deploy

---

## Decision 5 — EPDS Spanish Version: Use Validated EPDS-S

**Options considered:**

| Option | Source | Validation status |
|--------|--------|------------------|
| **A — Use validated EPDS-S (chosen)** | Published Spanish translation from Cox et al. (1987), validated in multiple studies | Clinically validated; widely used in US prenatal clinics |
| **B — Custom translation** | Hire translator to convert English EPDS to Spanish | Not validated; would require IRB approval for clinical use |

**Decision:** Option A — Use the validated Spanish EPDS (EPDS-S).

**Rationale:**
- The EPDS has an official Spanish translation (EPDS-S) validated in Hispanic/Latina populations
- Using the validated version maintains clinical validity and comparability with paper-based screening
- Custom translation would invalidate the instrument's psychometric properties and require separate validation study

**LOINC code remains `89049-6`** regardless of language — the code represents the EPDS construct, not the language of administration.

**Reference:** Garcia-Esteve L, Ascaso C, Ojuel J, Navarro P. Validation of the Edinburgh Postnatal Depression Scale (EPDS) in Spanish mothers. *Journal of Affective Disorders.* 2003;75(1):71-76.

---

## Implementation Plan (Phase 2)

### Prerequisites (must be completed before starting multilingual work)
1. ✅ Core features stable in production (EPDS, Mom Talk, provider alerts, care plan suggestions)
2. ✅ English content finalized and reviewed by clinicians
3. ✅ Usage analytics show patient demand for Spanish support

### Phase 2A — Infrastructure (2 weeks)
- Install and configure `react-i18next` in Next.js app
- Create `users` table with `language_preference` column
- Implement backend endpoints: `GET /api/users/me`, `PATCH /api/users/me`
- Add language selector UI component (login screen + settings page)
- Extract all hardcoded English strings to `en.json`

### Phase 2B — Translation (3 weeks)
- Export `en.json` with clinical context annotations
- Contract professional medical translation service (target: ATA-certified translator with healthcare specialization)
- Obtain validated EPDS-S from published literature
- Clinical review by bilingual OB/GYN or perinatal psychiatrist
- Import `es.json` to repo

### Phase 2C — Testing (2 weeks)
- QA all UI flows in Spanish (EPDS submission, Mom Talk, dashboard, crisis resources)
- Validate EPDS-S scoring logic (ensure Spanish responses map correctly to numeric scores)
- Cross-browser testing (special attention to character encoding: á, é, í, ó, ú, ñ, ¿, ¡)
- Accessibility audit (screen readers must pronounce Spanish correctly)

### Phase 2D — Deployment (1 week)
- Soft launch: Enable Spanish for 10% of traffic via feature flag
- Monitor for translation issues, user feedback
- Full rollout if no critical issues

**Total estimated effort:** 8 weeks (assumes part-time work)

---

## Out of Scope (Explicitly Deferred)

The following capabilities are **not** included in Phase 2 multilingual support:

1. **AI summary translation** — Claude-generated narrative summaries, care plan suggestions, and weekly patterns remain English-only until prompt engineering is validated in Spanish
2. **User-generated content translation** — Diary entries and Mom Talk posts are not translated; patients write in their preferred language but no cross-language UGC translation
3. **Provider alert translation** — FHIR `Task` resources written to EPIC for provider alerts remain English (provider-facing, not patient-facing)
4. **Additional languages beyond Spanish** — Chinese, Vietnamese, Arabic deferred until Phase 3
5. **Voice input in Spanish** — Web Speech API multilingual support deferred
6. **Cultural adaptation beyond translation** — Journal prompts, educational content, Mom Talk community norms are direct translations; cultural customization (e.g., *comadronas*, *cuarentena* traditions) deferred to Phase 3

---

## Consequences

**Positive:**
- Addresses largest maternal health disparity population (Spanish speakers) in Phase 2
- Maintains clinical safety by using validated EPDS-S and professionally translated crisis resources
- Infrastructure investment (react-i18next, language preference storage) enables future language additions with lower incremental cost
- Clear separation of translated static content from English-only AI features reduces risk during rollout

**Negative:**
- Creates bilingual maintenance burden — all UI changes must be translated before deployment
- Spanish-speaking patients will see English AI summaries (narrative summary, care plan suggestions) until Phase 3
- Mom Talk forum will be mixed-language unless separate Spanish-only cohort is created (deferred decision)
- Translation review process adds 2–3 weeks to feature release cycle

**Risk mitigation:**
- Keep initial Spanish scope narrow (static content only) to validate infrastructure before expanding
- Contract retainer agreement with medical translator for ongoing maintenance (estimated $500/quarter for incremental changes)
- Monitor user feedback and usage metrics to inform Phase 3 prioritization

---

## References

- Zingg A, Rogith D, Refuerzo JS, Myneni S. Digilego for Peripartum Depression: A Novel Patient-Facing Digital Health Instantiation. *AMIA Annu Symp Proc.* 2021;2020:1421-1430.
- Garcia-Esteve L, Ascaso C, Ojuel J, Navarro P. Validation of the Edinburgh Postnatal Depression Scale (EPDS) in Spanish mothers. *J Affect Disord.* 2003;75(1):71-76.
- Cox JL, Holden JM, Sagovsky R. Detection of postnatal depression: Development of the 10-item Edinburgh Postnatal Depression Scale. *Br J Psychiatry.* 1987;150:782-786.
