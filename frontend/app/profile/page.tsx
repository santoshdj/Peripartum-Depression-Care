"use client";

import { useEffect, useState } from "react";
import { api, type ProfileResponse } from "@/lib/api";
import BackButton from "@/components/BackButton";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right break-all">
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatExpiry(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffMin < 0) return `Expired at ${timeStr}`;
  if (diffMin < 60) return `Expires in ${diffMin} min (${timeStr})`;
  return `Expires at ${timeStr}`;
}

function capitalize(s?: string | null) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.profile
      .get()
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your account details from the connected EHR health record.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {profile && (
        <>
          {/* Avatar + name */}
          <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-600 text-xl font-semibold">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{profile.name}</p>
              {profile.gender && (
                <p className="text-sm text-gray-500">{capitalize(profile.gender)}</p>
              )}
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Demographics
            </h2>
            <Row label="Full name" value={profile.name} />
            <Row label="Date of birth" value={formatDate(profile.birth_date)} />
            <Row label="Gender" value={capitalize(profile.gender)} />
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Contact
            </h2>
            <Row label="Phone" value={profile.phone} />
            <Row label="Email" value={profile.email} />
            <Row label="Address" value={profile.address} />
          </div>

          {/* Health record */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Health Record
            </h2>
            <Row label="MRN" value={profile.mrn} />
            <Row label="FHIR Patient ID" value={profile.patient_id} />
          </div>

          {/* Session */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Session
            </h2>
            <Row label="Status" value="Active" />
            <Row label="EHR session" value={formatExpiry(profile.session_expires_at)} />
          </div>

          {/* Sign out */}
          <a
            href="/logout"
            className="block w-full text-center py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Sign out
          </a>
        </>
      )}
    </div>
  );
}
