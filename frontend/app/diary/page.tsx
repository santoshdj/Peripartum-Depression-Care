"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type DiaryEntry, type DiaryEntryCreate, type WeeklySummaryResponse } from "@/lib/api";
import BackButton from "@/components/BackButton";

// ── Label helpers ─────────────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, string> = {
  1: "😞 Very low",
  2: "😟 Low",
  3: "😐 Neutral",
  4: "🙂 Good",
  5: "😊 Great",
};

const ANXIETY_LABELS: Record<number, string> = {
  1: "None",
  2: "Mild",
  3: "Moderate",
  4: "High",
  5: "Severe",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Score selector ────────────────────────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: Record<number, string>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(options).map(([k, display]) => {
          const n = parseInt(k);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                value === n
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sleep selector ────────────────────────────────────────────────────────────

function SleepSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">Hours of sleep last night</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-sm font-semibold text-gray-800 w-16 text-right">
          {value} {value === 1 ? "hr" : "hrs"}
        </span>
      </div>
    </div>
  );
}

// ── Journal prompts ───────────────────────────────────────────────────────────

const PROMPT_BANK = [
  "Today I noticed I felt…",
  "Right now I'm feeling…",
  "Something that's weighing on me is…",
  "One word for today would be…",
  "With my baby today, I…",
  "A moment I want to remember…",
  "I'm finding it hard to…",
  "Something I'm proud of…",
  "My body feels…",
  "What affected my sleep was…",
  "Something that helped me was…",
  "I talked to someone and it helped because…",
  "I wish I had more support with…",
  "Something a loved one did that I appreciated…",
  "Tomorrow I'm looking forward to…",
  "Something I'm anxious about is…",
  "One small thing I can do for myself…",
  "I'm grateful for…",
  "The hardest part of today was…",
  "I surprised myself by…",
  "My baby makes me feel…",
  "I need more…",
  "I have enough…",
  "What I'd tell a friend going through this…",
  "Today I learned…",
];

function pickPrompts(n: number): string[] {
  const shuffled = [...PROMPT_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeeklySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Form state
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [anxiety, setAnxiety] = useState(2);
  const [note, setNote] = useState("");

  // Pick 6 prompts once per mount
  const prompts = useMemo(() => pickPrompts(6), []);

  useEffect(() => {
    api.diary
      .list()
      .then((data) => setEntries(data.entries))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    api.diary
      .streak()
      .then((r) => setStreak(r.streak))
      .catch(() => setStreak(null));

    setSummaryLoading(true);
    api.diary
      .weeklySummary()
      .then((r) => setWeekSummary(r))
      .catch(() => setWeekSummary(null))
      .finally(() => setSummaryLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: DiaryEntryCreate = {
        mood_score: mood,
        sleep_hours: sleep,
        anxiety_score: anxiety,
        note: note.trim() || undefined,
      };
      const created = await api.diary.create(payload);
      setEntries((prev) => [created, ...prev]);
      setNote("");
      setMood(3);
      setSleep(7);
      setAnxiety(2);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <BackButton />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Diary</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track how you&apos;re feeling each day. Your entries are private.
          </p>
        </div>
        {streak !== null && (
          <div className="flex-shrink-0 flex flex-col items-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
            <span className="text-2xl">{streak > 0 ? "🔥" : "✨"}</span>
            <span className="text-lg font-bold text-orange-700 leading-none">{streak}</span>
            <span className="text-xs text-orange-600 mt-0.5">
              {streak === 1 ? "day" : "days"}
            </span>
            <span className="text-xs text-orange-500">streak</span>
          </div>
        )}
      </div>

      {/* Check-in form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 shadow-sm"
      >
        <h2 className="font-medium text-gray-800">Today&apos;s Check-in</h2>

        <ScoreSelector
          label="How are you feeling today?"
          value={mood}
          onChange={setMood}
          options={MOOD_LABELS}
        />

        <SleepSelector value={sleep} onChange={setSleep} />

        <ScoreSelector
          label="Anxiety level today"
          value={anxiety}
          onChange={setAnxiety}
          options={ANXIETY_LABELS}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="note">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {/* Prompt chips */}
          <div className="flex flex-wrap gap-2 mb-1">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setNote((prev) => (prev ? `${prev} ${p} ` : `${p} `))
                }
                className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How are you really doing? What&apos;s on your mind?"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 text-right">{note.length}/2000</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            Check-in saved ✓
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : "Save check-in"}
        </button>
      </form>

      {/* Weekly patterns summary */}
      {summaryLoading ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-600 text-sm animate-pulse">
          Generating your weekly patterns…
        </div>
      ) : weekSummary?.available ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide bg-blue-100 px-2 py-0.5 rounded-full">
              AI · Your week · Not medical advice
            </span>
          </div>
          <p className="text-blue-900 text-sm leading-relaxed">{weekSummary.summary}</p>
          <p className="text-blue-400 text-xs">
            Based on {weekSummary.entry_count} check-ins this week
          </p>
        </div>
      ) : weekSummary && !weekSummary.available ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-500 text-sm">
          📊 Complete{" "}
          {(weekSummary.min_entries_required ?? 3) -
            (weekSummary.entries_so_far ?? 0)}{" "}
          more check-in{
            (weekSummary.min_entries_required ?? 3) -
              (weekSummary.entries_so_far ?? 0) !==
            1
              ? "s"
              : ""
          }{" "}
          this week to see your weekly patterns summary.
        </div>
      ) : null}

      {/* Entry history */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Previous Entries
        </h2>

        {loading && (
          <p className="text-gray-400 text-sm animate-pulse">Loading entries…</p>
        )}

        {!loading && entries.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No entries yet. Complete your first check-in above.</p>
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
              </div>
              <div className="flex gap-4 flex-wrap text-sm">
                <span>
                  <span className="text-gray-500">Mood: </span>
                  <span className="font-medium text-gray-800">{MOOD_LABELS[entry.mood_score]}</span>
                </span>
                <span>
                  <span className="text-gray-500">Sleep: </span>
                  <span className="font-medium text-gray-800">{entry.sleep_hours} hrs</span>
                </span>
                <span>
                  <span className="text-gray-500">Anxiety: </span>
                  <span className="font-medium text-gray-800">{ANXIETY_LABELS[entry.anxiety_score]}</span>
                </span>
              </div>
              {entry.note && (
                <p className="text-sm text-gray-600 border-t border-gray-100 pt-2">{entry.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
