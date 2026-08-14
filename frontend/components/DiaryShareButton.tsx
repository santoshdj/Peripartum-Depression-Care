"use client";

import { useState } from "react";
import { api, type DiaryEntry } from "@/lib/api";

interface Props {
  entries: DiaryEntry[];
  onShared: (entryIds: string[]) => void;
}

export default function DiaryShareButton({ entries, onShared }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareableEntries = entries.filter((e) => !e.shared_to_fhir);

  if (shareableEntries.length === 0) {
    return null; // No entries to share
  }

  function toggleEntry(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectLastWeek() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const lastWeekIds = shareableEntries
      .filter((e) => new Date(e.created_at) >= weekAgo)
      .map((e) => e.id);
    setSelectedIds(new Set(lastWeekIds));
  }

  async function handleShare() {
    if (selectedIds.size === 0) return;

    setSharing(true);
    setError(null);

    try {
      await api.diary.share({ entry_ids: Array.from(selectedIds) });
      onShared(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowConfirm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Share failed");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏥</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 text-sm">
              Share entries with your care team
            </h3>
            <p className="text-blue-700 text-xs mt-0.5">
              Selected entries will be added to your medical record and visible to your providers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectLastWeek}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select last 7 days
          </button>
          <span className="text-blue-600 text-xs">
            {selectedIds.size} selected
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {shareableEntries.map((entry) => (
            <label
              key={entry.id}
              className="flex items-start gap-3 p-2.5 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(entry.id)}
                onChange={() => toggleEntry(entry.id)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 text-xs">
                <p className="font-medium text-gray-900">
                  {new Date(entry.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-gray-500 mt-0.5">
                  Mood {entry.mood_score}/5 · Sleep {entry.sleep_hours}h · Anxiety {entry.anxiety_score}/5
                </p>
              </div>
            </label>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Share {selectedIds.size} {selectedIds.size === 1 ? "entry" : "entries"}
          </button>
        )}

        {error && (
          <p className="text-red-600 text-xs">{error}</p>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Share with care team?
            </h3>
            <p className="text-sm text-gray-600">
              You are about to share <strong>{selectedIds.size}</strong> diary{" "}
              {selectedIds.size === 1 ? "entry" : "entries"} with your care team.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> Shared entries become part of your permanent medical
                record and cannot be deleted or hidden. Only share what you are comfortable
                discussing with your provider.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={sharing}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sharing ? "Sharing…" : "Confirm share"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
