"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type ForumPostDetail, type ForumReply } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!postId) return;

    api.forum
      .getPost(postId)
      .then(setPost)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();

    if (replyContent.trim().length < 10) {
      setReplyError("Reply must be at least 10 characters");
      return;
    }

    setReplying(true);
    setReplyError(null);
    setCrisisMessage(null);

    try {
      const newReply = await api.forum.createReply(postId, { content: replyContent.trim() });
      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          replies: [...prev.replies, newReply],
          reply_count: prev.reply_count + 1,
        };
      });
      setReplyContent("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes("403") || e.message.includes("crisis") || e.message.includes("hotline")) {
          setCrisisMessage(e.message);
        } else {
          setReplyError(e.message);
        }
      } else {
        setReplyError("Failed to post reply");
      }
    } finally {
      setReplying(false);
    }
  }

  async function handleReport(type: "post" | "reply", replyId?: string) {
    if (!confirm("Report this content as inappropriate or harmful?")) return;

    setReporting(true);
    try {
      if (type === "post") {
        await api.forum.reportPost(postId);
      } else if (replyId) {
        await api.forum.reportReply(postId, replyId);
      }
      alert("Content has been flagged for review. Thank you for keeping the community safe.");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to report content");
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <BackButton />
        <p className="text-gray-400 animate-pulse mt-8">Loading post…</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <BackButton />
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error || "Post not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton />

      {/* Original post */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">{post.pseudonym}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => handleReport("post")}
            disabled={reporting}
            className="text-gray-400 hover:text-red-600 text-xs transition-colors disabled:opacity-50"
            title="Report post"
          >
            🚩 Report
          </button>
        </div>
        <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.post_content}</p>
      </div>

      {/* Replies section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {post.reply_count} {post.reply_count === 1 ? "Reply" : "Replies"}
        </h2>

        {post.replies.map((reply) => (
          <div
            key={reply.id}
            className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{reply.pseudonym}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(reply.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleReport("reply", reply.id)}
                disabled={reporting}
                className="text-gray-400 hover:text-red-600 text-xs transition-colors disabled:opacity-50"
                title="Report reply"
              >
                🚩
              </button>
            </div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{reply.reply_content}</p>
          </div>
        ))}

        {post.replies.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">
            No replies yet. Be the first to respond!
          </p>
        )}
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

      {/* Reply form */}
      <form onSubmit={handleReply} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-indigo-900 text-sm">Add your reply</h3>

        {replyError && !crisisMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {replyError}
          </div>
        )}

        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Share your thoughts, offer support, or ask a question…"
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          disabled={replying}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-indigo-600">{replyContent.length}/2000</p>
          <button
            type="submit"
            disabled={replying || replyContent.trim().length < 10}
            className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {replying ? "Posting…" : "Post reply"}
          </button>
        </div>
      </form>
    </div>
  );
}
