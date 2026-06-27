"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.auth
      .logout()
      .then(() => {
        router.replace("/");
      })
      .catch(() => {
        // Even if the API call fails (e.g. session already expired),
        // redirect home — the cookie is already gone or invalid.
        setError("Session could not be cleared server-side. Redirecting…");
        setTimeout(() => router.replace("/"), 2000);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
      {error ? (
        <p className="text-sm text-amber-600">{error}</p>
      ) : (
        <>
          <svg
            className="w-8 h-8 text-gray-300 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <p className="text-sm text-gray-400">Signing out…</p>
        </>
      )}
    </div>
  );
}
