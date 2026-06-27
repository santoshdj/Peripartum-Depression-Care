"use client";

import { useEffect, useState } from "react";
import { api, type FhirMedication } from "@/lib/api";
import BackButton from "@/components/BackButton";

function getMedName(med: FhirMedication): string {
  // EPIC returns medicationReference.display; fall back to inline concept
  return (
    med.medicationReference?.display ||
    med.medicationCodeableConcept?.text ||
    med.medicationCodeableConcept?.coding?.[0]?.display ||
    "Unknown medication"
  );
}

function getDosage(med: FhirMedication): string {
  return med.dosageInstruction?.[0]?.text || "—";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status?: string) {
  const color =
    status === "active"
      ? "bg-green-50 text-green-700"
      : status === "stopped" || status === "cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status || "unknown"}
    </span>
  );
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<FhirMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fhir
      .getMedications()
      .then((data) => setMedications(data.medications))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading medications…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-semibold text-gray-900">Medications</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {medications.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400">No active medications found.</p>
        </div>
      )}

      {medications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Medication</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Dosage</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Prescribed</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Prescriber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medications.map((med, i) => (
                <tr key={med.id ?? i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-800 font-medium">{getMedName(med)}</td>
                  <td className="py-3 px-4 text-gray-600">{getDosage(med)}</td>
                  <td className="py-3 px-4">{statusBadge(med.status)}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(med.authoredOn)}</td>
                  <td className="py-3 px-4 text-gray-500">{med.requester?.display || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
