"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type DashboardResponse, type DiaryEntry } from "@/lib/api";
import NarrativeSummary from "@/components/NarrativeSummary";
import RiskAlert from "@/components/RiskAlert";
import GenderContextGate from "@/components/GenderContextGate";
import { useGateContext } from "@/context/gate-context";
import DailyCheckInCard from "@/components/DailyCheckInCard";
import CarePlanSuggestions from "@/components/CarePlanSuggestions";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null | undefined>(
    undefined // undefined = still loading; null = none today
  );
  const { setGateRequired } = useGateContext();

  useEffect(() => {
    api.dashboard
      .get()
      .then((d) => {
        setData(d);
        setGateRequired(d.patient.gender !== "female");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    api.diary
      .today()
      .then((r) => setTodayEntry(r.entry))
      .catch(() => setTodayEntry(null)); // silently degrade if diary API fails
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading your health summary…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const navLinks = [
    { href: "/screening", label: "EPDS Screening" },
    { href: "/history", label: "Score History" },
    { href: "/diary", label: "My Diary" },
    { href: "/mom-talk", label: "Mom Talk" },
    { href: "/care-plan", label: "Care Plan" },
    { href: "/labs", label: "Lab Results" },
    { href: "/vitals", label: "Vitals" },
    { href: "/resources", label: "Resources" },
  ];

  return (
    <GenderContextGate gender={data.patient.gender} patientName={data.patient.name}>
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {data.patient.name}
        </h1>
        {data.patient.birth_date && (
          <p className="text-gray-400 text-sm mt-0.5">
            Born {data.patient.birth_date}
            {data.patient.gender && ` · ${data.patient.gender}`}
          </p>
        )}
      </div>

      {/* Daily check-in banner */}
      <DailyCheckInCard
        todayEntry={todayEntry}
        onCheckedIn={(entry) => setTodayEntry(entry)}
      />

      {/* Risk alert */}
      {data.risk_alert && (
        <RiskAlert message={data.risk_alert.message} score={data.risk_alert.score} />
      )}
      
      {/* Care plan suggestions (only shown if EPDS >= 10) */}
      <CarePlanSuggestions />

      {/* AI summary */}
      <NarrativeSummary summary={data.narrative_summary} />

      {/* Data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EPDS score */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-medium text-gray-700 mb-3">Latest EPDS Score</h2>
          {data.latest_epds_score !== null ? (
            <div className="flex items-end gap-1">
              <span
                className={`text-5xl font-bold ${
                  data.latest_epds_score >= 10 ? "text-red-600" : "text-green-600"
                }`}
              >
                {data.latest_epds_score}
              </span>
              <span className="text-gray-400 mb-1 text-lg">/30</span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No screenings on record</p>
          )}
          <Link
            href="/screening"
            className="text-blue-600 text-sm hover:underline mt-3 block"
          >
            {data.latest_epds_score !== null ? "Take new screening →" : "Start first screening →"}
          </Link>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-medium text-gray-700 mb-3">Upcoming Appointments</h2>
          {data.appointments.length > 0 ? (
            <ul className="space-y-2">
              {data.appointments.slice(0, 3).map((appt, i) => (
                <li key={i} className="text-sm">
                  <span className="text-gray-800 font-medium">{appt.display}</span>
                  {appt.start && (
                    <span className="text-gray-400 ml-2">
                      {new Date(appt.start).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No upcoming appointments</p>
          )}
        </div>

        {/* Active conditions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-medium text-gray-700 mb-3">Active Conditions</h2>
          {data.conditions.length > 0 ? (
            <ul className="space-y-1">
              {data.conditions.map((c, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {c.display}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No active conditions</p>
          )}
        </div>

        {/* Current medications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-medium text-gray-700 mb-3">Current Medications</h2>
          {data.medications.length > 0 ? (
            <ul className="space-y-1">
              {data.medications.map((m, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {m.display}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No active medications</p>
          )}
        </div>
      </div>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-lg border border-gray-200 p-3 text-sm text-center text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
    </GenderContextGate>
  );
}
