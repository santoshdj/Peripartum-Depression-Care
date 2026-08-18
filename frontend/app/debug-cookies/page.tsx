"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function DebugCookiesPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [frontendCookies, setFrontendCookies] = useState<string>("");

  useEffect(() => {
    // Load cookies on client side only
    if (typeof window !== "undefined") {
      setFrontendCookies(document.cookie || "(no cookies)");
    }
  }, []);

  const testCookies = async () => {
    setLoading(true);
    try {
      console.log("Testing cookie transmission...");
      console.log("document.cookie:", document.cookie);
      
      const response = await fetch(`${API_BASE}/auth/debug-cookies`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("Backend response:", data);
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Cookie Debug Tool</h1>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-2">Frontend Cookies:</h2>
        <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
          {frontendCookies}
        </pre>
      </div>

      <button
        onClick={testCookies}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {loading ? "Testing..." : "Test Cookie Transmission to Backend"}
      </button>

      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Backend Received:</h2>
          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">What to check:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Frontend should show <code className="bg-gray-100 px-1">session_id=...</code></li>
          <li>Backend should receive the same cookie in the response</li>
          <li>If frontend has cookies but backend doesn't receive them, it's a cross-origin cookie issue</li>
          <li>Check browser DevTools → Network → request headers for "Cookie" field</li>
        </ul>
      </div>
    </div>
  );
}
