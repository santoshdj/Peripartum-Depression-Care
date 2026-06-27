"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type QuestionnaireQuestion, type ScreeningResult } from "@/lib/api";
import EpdsForm from "@/components/EpdsForm";
import RiskAlert from "@/components/RiskAlert";
import BackButton from "@/components/BackButton";

export default function ScreeningPage() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.screening
      .getQuestionnaire()
      .then((data) => setQuestions(data.questions))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (responses: Record<number, number>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.screening.submit({ responses });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-gray-400 animate-pulse">Loading questionnaire…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Your EPDS Result</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm mb-2">Your score</p>
          <p
            className={`text-7xl font-bold ${
              result.risk === "elevated" ? "text-red-600" : "text-green-600"
            }`}
          >
            {result.score}
          </p>
          <p className="text-gray-400 mt-1">out of 30</p>
        </div>

        {result.risk === "elevated" ? (
          <RiskAlert message={result.message} score={result.score} />
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
            {result.message}
          </div>
        )}

        {/* Always show crisis line on results */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="font-medium text-amber-800 text-sm">Support is available</p>
          <p className="text-amber-700 text-sm mt-1">
            National Maternal Mental Health Hotline:{" "}
            <a href="tel:18339435746" className="font-bold hover:underline">
              1-833-943-5746
            </a>{" "}
            — free, 24/7, English &amp; Spanish
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/history"
            className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            View Score History
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">EPDS Screening</h1>
        <p className="text-gray-500 text-sm mt-1">
          Edinburgh Postnatal Depression Scale — 10 questions about how you have been feeling
          over the past 7 days. Your answers will be saved to your health record.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <EpdsForm questions={questions} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
