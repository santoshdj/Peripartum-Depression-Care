"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (content.trim().length < 10) {
      setError("Post must be at least 10 characters");
      return;
    }

    setPosting(true);
    setError(null);
    setCrisisMessage(null);

    try {
      const post = await api.forum.createPost({ content: content.trim() });
      router.push(`/mom-talk/${post.id}`);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes("403") || e.message.includes("crisis") || e.message.includes("hotline")) {
          // Content moderation rejection — show crisis resources
          setCrisisMessage(e.message);
        } else if (e.message.includes("pseudonym")) {
          setError("Please set up your pseudonym first");
        } else {
          setError(e.message);
        }
      } else {
        setError("Failed to create post");
      }
      setPosting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Start a Conversation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Share your experience, ask a question, or offer support
        </p>
      </div>

      {/* Crisis message */}
      {crisisMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm space-y-2">
          <p className="font-semibold">Your safety is our priority</p>
          <p>{crisisMessage}</p>
          <div className="mt-3 space-y-1.5">
            <p className="font-semibold text-xs">Crisis Resources:</p>
            <p className="text-xs">📞 National Maternal Mental Health Hotline: <strong>1-833-943-5746</strong></p>
            <p className="text-xs">📞 Suicide Prevention Lifeline: <strong>988</strong></p>
            <p className="text-xs">📱 Crisis Text Line: Text <strong>HELLO</strong> to <strong>741741</strong></p>
          </div>
        </div>
      )}

      {error && !crisisMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1.5">
            Your post
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what's on your mind…"
            rows={8}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={posting}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            {content.length}/2000 characters
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Before you post:</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Be respectful and supportive</li>
            <li>Avoid sharing medical advice — only personal experiences</li>
            <li>Don't include identifying information (names, locations, etc.)</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={posting}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={posting || content.trim().length < 10}
            className="flex-1 bg-indigo-600 text-white text-sm font-medium py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
