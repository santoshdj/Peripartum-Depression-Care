"use client";

import { useEffect, useState } from "react";
import { api, type FhirEncounter } from "@/lib/api";
import BackButton from "@/components/BackButton";

function getVisitType(enc: FhirEncounter): string {
  return (
    enc.type?.[0]?.text ||
    enc.type?.[0]?.coding?.[0]?.display ||
    "Visit"
  );
}

function getClassLabel(enc: FhirEncounter): string {
  const code = enc.class?.code?.toUpperCase();
  const map: Record<string, string> = {
    AMB: "Outpatient",
    IMP: "Inpatient",
    EMER: "Emergency",
    VR: "Telehealth",
    HH: "Home Health",
    OBSENC: "Observation",
  };
  return map[code ?? ""] || enc.class?.display || code || "—";
}

function getReason(enc: FhirEncounter): string {
  return (
    enc.reasonCode?.[0]?.text ||
    enc.reasonCode?.[0]?.coding?.[0]?.display ||
    "—"
  );
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
    status === "finished"
      ? "bg-green-50 text-green-700"
      : status === "in-progress"
      ? "bg-blue-50 text-blue-700"
      : status === "cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status || "unknown"}
    </span>
  );
}

export default function VisitsPage() {
  const [encounters, setEncounters] = useState<FhirEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fhir
      .getEncounters()
      .then((data) => setEncounters(data.encounters))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading visit history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-semibold text-gray-900">Visit History</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {encounters.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400">No visit history found.</p>
        </div>
      )}

      {encounters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Visit Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Setting</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {encounters.map((enc, i) => (
                <tr key={enc.id ?? i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-800 font-medium">{getVisitType(enc)}</td>
                  <td className="py-3 px-4 text-gray-600">{getClassLabel(enc)}</td>
                  <td className="py-3 px-4 text-gray-600">{getReason(enc)}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(enc.period?.start)}</td>
                  <td className="py-3 px-4">{statusBadge(enc.status)}</td>
                  <td className="py-3 px-4 text-gray-500">{enc.serviceProvider?.display || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
