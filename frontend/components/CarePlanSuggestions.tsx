"use client";

import { useEffect, useState } from "react";
import { api, type CarePlanSuggestionsResponse } from "@/lib/api";

export default function CarePlanSuggestions() {
  const [data, setData] = useState<CarePlanSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.carePlan
      .getSuggestions()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-gray-400 text-sm animate-pulse">Loading care plan suggestions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-700 text-sm">Failed to load suggestions: {error}</p>
      </div>
    );
  }

  // No suggestions if EPDS score < 10 or no EPDS on record
  if (!data || data.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900 text-base">
            Personalized Next Steps
          </h3>
          <p className="text-purple-700 text-xs mt-0.5">
            Based on your recent screening (score: {data.epds_score}/30)
          </p>
        </div>
      </div>

      <ul className="space-y-2.5 text-sm text-purple-900">
        {data.suggestions.map((suggestion, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold mt-0.5">•</span>
            <span>{suggestion}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-purple-200 pt-3">
        <p className="text-purple-600 text-xs italic">{data.disclaimer}</p>
      </div>

      <button
        onClick={() => {
          // Navigate to care plan page for full context
          window.location.href = "/care-plan";
        }}
        className="w-full bg-purple-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-purple-700 transition-colors"
      >
        View full care plan
      </button>
    </div>
  );
}
