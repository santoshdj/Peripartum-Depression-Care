"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function SetupPseudonymPage() {
  const router = useRouter();
  const [pseudonym, setPseudonym] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (pseudonym.trim().length < 3) {
      setError("Pseudonym must be at least 3 characters");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.forum.setPseudonym({ pseudonym: pseudonym.trim() });
      router.push("/mom-talk");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("409")) {
        setError("This pseudonym is already taken. Please choose another.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to save pseudonym");
      }
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Choose Your Pseudonym</h1>
        <p className="text-gray-500 text-sm mt-1">
          This is the name other community members will see when you post
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
        <p className="font-semibold">Privacy & Anonymity</p>
        <ul className="text-xs space-y-1 ml-4 list-disc">
          <li>Your pseudonym is <strong>not linked</strong> to your medical record or real name</li>
          <li>Choose a name that feels comfortable and doesn't identify you</li>
          <li>You can change it later from your profile</li>
          <li>Avoid using your real name, initials, or birthdate</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pseudonym" className="block text-sm font-medium text-gray-700 mb-1.5">
            Pseudonym
          </label>
          <input
            id="pseudonym"
            type="text"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            placeholder="e.g., HopefulMom2026, SunnyDays, BraveMama"
            maxLength={50}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            3-50 characters · Letters, numbers, and underscores only
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || pseudonym.trim().length < 3}
          className="w-full bg-indigo-600 text-white text-sm font-medium py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Continue to Mom Talk"}
        </button>
      </form>
    </div>
  );
}
