"use client";

import { useState } from "react";
import type { QuestionnaireQuestion } from "@/lib/api";

interface EpdsFormProps {
  questions: QuestionnaireQuestion[];
  onSubmit: (responses: Record<number, number>) => Promise<void>;
  submitting: boolean;
}

export default function EpdsForm({ questions, onSubmit, submitting }: EpdsFormProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});

  const allAnswered = questions.length > 0 && questions.every((q) => q.id in responses);

  const handleSelect = (questionId: number, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allAnswered) {
      onSubmit(responses);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs text-gray-400">
        Please select the answer that comes closest to how you have felt{" "}
        <strong>in the past 7 days</strong>, not just how you feel today.
      </p>

      {questions.map((question, index) => (
        <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
          <p className="font-medium text-gray-800 text-sm">
            <span className="text-gray-400 mr-2">{index + 1}.</span>
            {question.text}
          </p>
          <div className="space-y-2">
            {question.options.map((option) => {
              const isSelected = responses[question.id] === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${question.id}`}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleSelect(question.id, option.value)}
                    className="text-blue-600"
                  />
                  <span
                    className={`text-sm ${
                      isSelected ? "text-blue-800 font-medium" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {Object.keys(responses).length} of {questions.length} answered
        </p>
        <button
          type="submit"
          disabled={!allAnswered || submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-8 rounded-lg transition-colors text-sm"
        >
          {submitting ? "Submitting…" : "Submit Screening"}
        </button>
      </div>
    </form>
  );
}
