"use client";

import Link from "next/link";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EHR_PROVIDERS = [
  { value: "epic", label: "Epic (MyChart)" },
  { value: "cerner", label: "Cerner (PowerChart)" },
  { value: "allscripts", label: "Allscripts" },
  { value: "athenahealth", label: "athenahealth" },
];

export default function LandingPage() {
  const [selectedProvider, setSelectedProvider] = useState("epic");

  const handleSignIn = () => {
    window.location.href = `${API_BASE}/auth/launch?provider=${selectedProvider}`;
  };

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
            Connect your EHR health record to access your care plan, complete depression
            screenings, and track your wellbeing over time.
          </p>

          <div className="space-y-2">
            <label htmlFor="ehr-provider" className="block text-sm font-medium text-gray-700 text-left">
              Select your EHR Provider
            </label>
            <select
              id="ehr-provider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {EHR_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Sign in with EHR Provider
          </button>

          <p className="text-xs text-gray-400">
            Your EHR credentials are used to sign in. No separate account required.
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
