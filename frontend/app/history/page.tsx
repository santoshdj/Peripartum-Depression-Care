"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type EpdsHistoryResponse } from "@/lib/api";
import ScoreHistoryChart from "@/components/ScoreHistoryChart";
import BackButton from "@/components/BackButton";

export default function HistoryPage() {
  const [data, setData] = useState<EpdsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.history
      .getEpds()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">EPDS Score History</h1>
        <Link href="/screening" className="text-sm text-blue-600 hover:underline">
          Take new screening →
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && data.submissions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400">No screenings on record yet.</p>
          <Link
            href="/screening"
            className="text-blue-600 hover:underline text-sm mt-2 block"
          >
            Complete your first EPDS screening →
          </Link>
        </div>
      )}

      {data && data.submissions.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-4">
              {data.submissions.length} screening
              {data.submissions.length !== 1 ? "s" : ""} completed. The dashed line marks the
              clinical threshold (score ≥ {data.threshold}).
            </p>
            <ScoreHistoryChart submissions={data.submissions} threshold={data.threshold} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.submissions.map((sub, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 text-gray-600">
                      {sub.date ? new Date(sub.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <span
                        className={
                          sub.risk === "elevated" ? "text-red-600" : "text-green-600"
                        }
                      >
                        {sub.score}
                      </span>
                      <span className="text-gray-400">/30</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          sub.risk === "elevated"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {sub.risk === "elevated" ? "Elevated" : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
