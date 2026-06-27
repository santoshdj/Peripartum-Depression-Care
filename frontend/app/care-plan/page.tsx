"use client";

import { useEffect, useState } from "react";
import { api, type FhirCarePlan } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function CarePlanPage() {
  const [plans, setPlans] = useState<FhirCarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fhir
      .getCarePlan()
      .then((data) => setPlans(data.care_plans))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading care plan…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Care Plan</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your active peripartum care plan from your care team.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {plans.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400">No active care plans found.</p>
        </div>
      )}

      {plans.map((plan, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4"
        >
          <div>
            <h2 className="font-medium text-gray-900">{plan.title || "Care Plan"}</h2>
            {plan.description && (
              <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
            )}
          </div>

          {plan.activity && plan.activity.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Activities</h3>
              <ul className="space-y-2">
                {plan.activity.map((act, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        act.detail?.status === "completed" ? "bg-green-500" : "bg-blue-400"
                      }`}
                    />
                    <span>{act.detail?.description || "Activity"}</span>
                    {act.detail?.status && (
                      <span className="ml-auto text-xs text-gray-400 capitalize">
                        {act.detail.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
