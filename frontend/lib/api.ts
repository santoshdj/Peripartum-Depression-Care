// ── Types ────────────────────────────────────────────────────────────────────

export interface ProfileResponse {
  patient_id: string;
  name: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  mrn?: string;
  session_expires_at: string;
}

export interface DashboardResponse {
  patient: { id: string; name: string; birth_date?: string; gender?: string };
  conditions: Array<{ display: string; code?: string }>;
  medications: Array<{ display: string; code?: string; authored_on?: string }>;
  appointments: Array<{ display: string; start?: string; status?: string }>;
  latest_epds_score: number | null;
  narrative_summary: string;
  risk_alert: { message: string; score: number } | null;
}

export interface QuestionnaireQuestion {
  id: number;
  text: string;
  options: Array<{ value: number; label: string }>;
}

export interface QuestionnaireData {
  questions: QuestionnaireQuestion[];
}

export interface ScreeningSubmission {
  responses: Record<number, number>;
}

export interface ScreeningResult {
  score: number;
  risk: "elevated" | "normal";
  message: string;
  threshold: number;
  fhir_observation_id: string;
  fhir_questionnaire_response_id: string;
}

export interface EpdsSubmission {
  date: string;
  score: number;
  risk: "elevated" | "normal";
  id: string;
}

export interface EpdsHistoryResponse {
  submissions: EpdsSubmission[];
  threshold: number;
}

export interface FhirObservation {
  id?: string;
  code?: {
    text?: string;
    coding?: Array<{ code: string; display: string; system?: string }>;
  };
  valueQuantity?: { value: number; unit: string };
  valueString?: string;
  effectiveDateTime?: string;
  referenceRange?: Array<{
    low?: { value: number; unit: string };
    high?: { value: number; unit: string };
  }>;
}

export interface FhirObservation {
  id?: string;
  code?: {
    text?: string;
    coding?: Array<{ code: string; display: string; system?: string }>;
  };
  valueQuantity?: { value: number; unit: string };
  valueString?: string;
  effectiveDateTime?: string;
  referenceRange?: Array<{
    low?: { value: number; unit: string };
    high?: { value: number; unit: string };
  }>;
}

export interface FhirMedication {
  id?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ code: string; display: string; system?: string }>;
  };
  // EPIC typically returns a reference rather than an inline concept
  medicationReference?: {
    reference?: string;
    display?: string;
  };
  status?: string;
  authoredOn?: string;
  dosageInstruction?: Array<{ text?: string }>;
  requester?: { display?: string };
}

export interface FhirEncounter {
  id?: string;
  status?: string;
  class?: { code: string; display?: string };
  type?: Array<{ text?: string; coding?: Array<{ display: string }> }>;
  period?: { start?: string; end?: string };
  reasonCode?: Array<{ text?: string; coding?: Array<{ display: string }> }>;
  serviceProvider?: { display?: string };
}

export interface DiaryEntry {
  id: string;
  mood_score: number;       // 1–5
  sleep_hours: number;      // 0–12
  anxiety_score: number;    // 1–5
  note: string | null;
  created_at: string;
}

export interface DiaryEntryCreate {
  mood_score: number;
  sleep_hours: number;
  anxiety_score: number;
  note?: string;
}

export interface DiaryEntriesResponse {
  entries: DiaryEntry[];
}

export interface FhirCarePlan {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  activity?: Array<{
    detail?: {
      description?: string;
      status?: string;
    };
  }>;
}

export interface DiaryTodayResponse {
  entry: DiaryEntry | null;
}

export interface DiaryStreakResponse {
  streak: number;
  checked_in_today: boolean;
}

export interface WeeklySummaryResponse {
  available: boolean;
  summary?: string;
  week_start?: string;
  entry_count?: number;
  generated_at?: string;
  min_entries_required?: number;
  entries_so_far?: number;
}

// ── API client ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (response.status === 401) {
    // Redirect to login on session expiry
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new Error("Not authenticated");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(body.detail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  dashboard: {
    get: () => apiFetch<DashboardResponse>("/api/dashboard"),
  },

  screening: {
    getQuestionnaire: () => apiFetch<QuestionnaireData>("/api/screening/questionnaire"),
    submit: (data: ScreeningSubmission) =>
      apiFetch<ScreeningResult>("/api/screening/submit", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  history: {
    getEpds: () => apiFetch<EpdsHistoryResponse>("/api/history/epds"),
  },

  fhir: {
    getObservations: (category: "laboratory" | "vital-signs") =>
      apiFetch<{ observations: FhirObservation[] }>(
        `/api/fhir/observations?category=${category}`
      ),
    getCarePlan: () =>
      apiFetch<{ care_plans: FhirCarePlan[] }>("/api/fhir/care-plan"),
    getMedications: () =>
      apiFetch<{ medications: FhirMedication[] }>("/api/fhir/medications"),
    getEncounters: () =>
      apiFetch<{ encounters: FhirEncounter[] }>("/api/fhir/encounters"),
  },

  diary: {
    list: () => apiFetch<DiaryEntriesResponse>("/api/diary/entries"),
    create: (data: DiaryEntryCreate) =>
      apiFetch<DiaryEntry>("/api/diary/entries", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    today: () => apiFetch<DiaryTodayResponse>("/api/diary/today"),
    streak: () => apiFetch<DiaryStreakResponse>("/api/diary/streak"),
    weeklySummary: () => apiFetch<WeeklySummaryResponse>("/api/diary/weekly-summary"),
  },

  profile: {
    get: () => apiFetch<ProfileResponse>("/api/profile"),
  },

  auth: {
    me: () =>
      apiFetch<{ patient_id: string; expires_at: string }>("/auth/me"),
    logout: () =>
      fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }),
  },
};
