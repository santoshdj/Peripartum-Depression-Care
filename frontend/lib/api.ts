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
  // Some EHR providers return a reference rather than an inline concept
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
  shared_to_fhir: boolean;
  shared_at: string | null;
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

export interface DiaryShareRequest {
  entry_ids: string[];
}

export interface DiaryShareResponse {
  message: string;
  shared_count: number;
  fhir_observation_ids: string[];
}

export interface CarePlanSuggestionsResponse {
  suggestions: string[];
  disclaimer: string;
  epds_score: number | null;
}

export interface ForumPost {
  id: string;
  pseudonym: string;
  post_content: string;
  created_at: string;
  reply_count: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  pseudonym: string;
  reply_content: string;
  created_at: string;
}

export interface ForumPostDetail extends ForumPost {
  replies: ForumReply[];
}

export interface ForumPostsResponse {
  posts: ForumPost[];
  total: number;
  page: number;
  limit: number;
}

export interface PseudonymResponse {
  pseudonym: string | null;
}

export interface PseudonymSetRequest {
  pseudonym: string;
}

export interface ForumPostCreate {
  content: string;
}

export interface ForumReplyCreate {
  content: string;
}

// ── API client ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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
    share: (data: DiaryShareRequest) =>
      apiFetch<DiaryShareResponse>("/api/diary/share", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  carePlan: {
    getSuggestions: () => apiFetch<CarePlanSuggestionsResponse>("/api/care-plan/suggestions"),
  },

  forum: {
    getPseudonym: () => apiFetch<PseudonymResponse>("/api/forum/pseudonym"),
    setPseudonym: (data: PseudonymSetRequest) =>
      apiFetch<PseudonymResponse>("/api/forum/pseudonym", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listPosts: (page = 1, limit = 50) =>
      apiFetch<ForumPostsResponse>(`/api/forum/posts?page=${page}&limit=${limit}`),
    getPost: (postId: string) =>
      apiFetch<ForumPostDetail>(`/api/forum/posts/${postId}`),
    createPost: (data: ForumPostCreate) =>
      apiFetch<ForumPost>("/api/forum/posts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createReply: (postId: string, data: ForumReplyCreate) =>
      apiFetch<ForumReply>(`/api/forum/posts/${postId}/replies`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    reportPost: (postId: string) =>
      apiFetch<{ message: string }>(`/api/forum/posts/${postId}/report`, {
        method: "POST",
      }),
    reportReply: (postId: string, replyId: string) =>
      apiFetch<{ message: string }>(`/api/forum/posts/${postId}/replies/${replyId}/report`, {
        method: "POST",
      }),
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
