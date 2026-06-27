"use client";

import { useRouter } from "next/navigation";
import { useGateContext } from "@/context/gate-context";

interface Props {
  gender: string | undefined;
  patientName: string;
  children: React.ReactNode;
}

export default function GenderContextGate({ gender, patientName, children }: Props) {
  const router = useRouter();
  const { gateRequired, gateCleared, markCleared } = useGateContext();

  // Female patients: always pass through
  if (gender === "female") return <>{children}</>;

  // Gate not yet triggered (gender not yet known) or already cleared
  if (!gateRequired || gateCleared) return <>{children}</>;

  function handleContinue() {
    markCleared();
  }

  function handlePartner() {
    // Redirect to resources — partners section is there
    router.push("/resources");
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-12 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-3xl">👋</p>
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome, {patientName}
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          This app is designed to support people experiencing peripartum depression —
          during pregnancy or after giving birth. So we can point you to the right
          content, could you tell us a little more?
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleContinue}
          className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <p className="font-medium text-gray-800 group-hover:text-blue-700 text-sm">
            I recently gave birth, am pregnant, or am experiencing peripartum symptoms
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Continue to the full app — screening, care plan, diary, and more
          </p>
        </button>

        <button
          onClick={handlePartner}
          className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-sm transition-all group"
        >
          <p className="font-medium text-gray-800 group-hover:text-purple-700 text-sm">
            I&apos;m here to support my partner or a loved one
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            View resources, crisis lines, and guidance for supporting partners with PPD
          </p>
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        This question only appears once per session. Your choice is not recorded.
      </p>
    </div>
  );
}
