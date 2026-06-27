"use client";

import { useState } from "react";
import { api, type DiaryEntry } from "@/lib/api";

interface Props {
  todayEntry: DiaryEntry | null | undefined;
  onCheckedIn: (entry: DiaryEntry) => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "😔 Very low",
  2: "😟 Low",
  3: "😐 Okay",
  4: "🙂 Good",
  5: "😊 Great",
};

const ANXIETY_LABELS: Record<number, string> = {
  1: "Very calm",
  2: "Calm",
  3: "Mild",
  4: "High",
  5: "Very high",
};

export default function DailyCheckInCard({ todayEntry, onCheckedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState(7);
  const [anxiety, setAnxiety] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Still loading today state → show nothing
  if (todayEntry === undefined) return null;

  // Already checked in today → show compact summary
  if (todayEntry !== null) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-medium text-green-800 text-sm">Today's check-in complete</p>
          <p className="text-green-700 text-xs mt-0.5">
            Mood&nbsp;{todayEntry.mood_score}/5 · Sleep&nbsp;{todayEntry.sleep_hours}h ·
            Anxiety&nbsp;{todayEntry.anxiety_score}/5
          </p>
        </div>
      </div>
    );
  }

  // No entry yet
  async function handleSubmit() {
    if (!mood || !anxiety) {
      setErr("Please rate your mood and anxiety.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const entry = await api.diary.create({
        mood_score: mood,
        sleep_hours: sleep,
        anxiety_score: anxiety,
      });
      onCheckedIn(entry);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
      {/* Banner row */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📓</span>
          <div>
            <p className="font-medium text-indigo-900 text-sm">Daily check-in</p>
            <p className="text-indigo-600 text-xs">Takes about 30 seconds</p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Check in now
          </button>
        )}
      </div>

      {/* Inline form */}
      {open && (
        <div className="border-t border-indigo-200 bg-white p-5 space-y-5">
          {/* Mood */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">How's your mood today?</p>
            <div className="flex gap-2 flex-wrap">
              {([1, 2, 3, 4, 5] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setMood(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    mood === v
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-gray-100 text-gray-700 hover:bg-indigo-100"
                  }`}
                >
                  {MOOD_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Sleep last night:{" "}
              <span className="text-indigo-700 font-semibold">{sleep}h</span>
            </p>
            <input
              type="range"
              min={0}
              max={12}
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Anxiety */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Anxiety level today?</p>
            <div className="flex gap-2 flex-wrap">
              {([1, 2, 3, 4, 5] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setAnxiety(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    anxiety === v
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-gray-100 text-gray-700 hover:bg-indigo-100"
                  }`}
                >
                  {ANXIETY_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "Saving…" : "Save check-in"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 text-sm px-3 py-2 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
