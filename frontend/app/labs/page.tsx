"use client";

import { useEffect, useState } from "react";
import { api, type FhirObservation } from "@/lib/api";
import BackButton from "@/components/BackButton";

function getDisplay(obs: FhirObservation): string {
  return obs.code?.text || obs.code?.coding?.[0]?.display || "Unknown";
}

function getValue(obs: FhirObservation): string {
  if (obs.valueQuantity) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit}`;
  }
  return obs.valueString || "—";
}

function getRefRange(obs: FhirObservation): string {
  const range = obs.referenceRange?.[0];
  if (!range) return "—";
  const low = range.low ? `${range.low.value}` : "";
  const high = range.high ? `${range.high.value}` : "";
  if (low && high) return `${low}–${high}`;
  if (low) return `≥ ${low}`;
  if (high) return `≤ ${high}`;
  return "—";
}

export default function LabsPage() {
  const [observations, setObservations] = useState<FhirObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fhir
      .getObservations("laboratory")
      .then((data) => setObservations(data.observations))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading lab results…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-semibold text-gray-900">Lab Results</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {observations.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400">No lab results found.</p>
        </div>
      )}

      {observations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Test</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Result</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Reference</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {observations.map((obs, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 text-gray-800 font-medium">{getDisplay(obs)}</td>
                  <td className="py-3 px-4 text-gray-700">{getValue(obs)}</td>
                  <td className="py-3 px-4 text-gray-400">{getRefRange(obs)}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {obs.effectiveDateTime
                      ? new Date(obs.effectiveDateTime).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
