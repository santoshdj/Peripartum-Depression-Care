"use client";

import Link from "next/link";
import BackButton from "@/components/BackButton";

const clinicalCards = [
  {
    href: "/medications",
    label: "Medications",
    description: "Active prescriptions and dosage instructions",
    icon: "💊",
  },
  {
    href: "/visits",
    label: "Visit History",
    description: "Past clinical encounters and visit summaries",
    icon: "🏥",
  },
  {
    href: "/labs",
    label: "Test Results",
    description: "Lab values and reference ranges",
    icon: "🔬",
  },
  {
    href: "/vitals",
    label: "Vitals",
    description: "Blood pressure, weight, and other vital signs",
    icon: "❤️",
  },
  {
    href: "/care-plan",
    label: "Care Plan",
    description: "Goals and activities from your care team",
    icon: "📋",
  },
  {
    href: "/appointments",
    label: "Appointments",
    description: "Upcoming scheduled appointments",
    icon: "📅",
  },
];

// External links removed - provider-specific portals should be accessed
// directly through your EHR provider's patient portal

export default function MyCarePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Care</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your complete health information in one place.
        </p>
      </div>

      {/* Clinical data hub */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Health Records
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {clinicalCards.map(({ href, label, description, icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Provider communication */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Contact Your Care Team
        </h2>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
          <p className="text-sm text-blue-800">
            To send a secure message to your provider, request a prescription refill, or review
            clinical notes, use your EHR provider's patient portal (such as MyChart, Patient Portal, 
            or FollowMyHealth depending on your healthcare system).
          </p>
          <p className="text-xs text-gray-400 mt-4">
            If you are experiencing a mental health crisis, call{" "}
            <span className="font-semibold text-gray-600">1-833-943-5746</span> (National Maternal
            Mental Health Hotline) or{" "}
            <span className="font-semibold text-gray-600">988</span> (Suicide & Crisis Lifeline).
          </p>
        </div>
      </section>
    </div>
  );
}
