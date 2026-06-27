"use client";

import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">Peripartum Care</h1>
          <p className="text-lg text-gray-600">
            Your companion for peripartum depression support and monitoring
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm space-y-4">
          <p className="text-gray-700 text-sm">
            Connect your EPIC health record to access your care plan, complete depression
            screenings, and track your wellbeing over time.
          </p>
          <a
            href={`${API_BASE}/auth/launch`}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
          >
            Sign in with EPIC
          </a>
          <p className="text-xs text-gray-400">
            Your EPIC MyChart credentials are used to sign in. No separate account required.
          </p>
        </div>

        <p className="text-sm text-gray-500">
          <Link href="/resources" className="text-blue-600 hover:underline">
            Crisis resources
          </Link>{" "}
          are always available — no login required
        </p>
      </div>
    </div>
  );
}
