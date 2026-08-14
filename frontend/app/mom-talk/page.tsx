"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type ForumPost } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function MomTalkPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // Check if user has pseudonym
    api.forum.getPseudonym()
      .then((data) => setPseudonym(data.pseudonym))
      .catch(() => setPseudonym(null));
  }, []);

  useEffect(() => {
    loadPosts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadPosts(pageNum: number) {
    try {
      const data = await api.forum.listPosts(pageNum, 20);
      if (pageNum === 1) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      setHasMore(data.posts.length === 20); // If we got full page, assume more exists
      setLoading(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
      setLoading(false);
    }
  }

  if (loading && page === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <BackButton />
        <p className="text-gray-400 animate-pulse mt-8">Loading community feed…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mom Talk</h1>
        <p className="text-gray-500 text-sm mt-1">
          A safe space to share experiences and support each other through peripartum challenges
        </p>
      </div>

      {/* Community guidelines banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
        <p className="font-semibold">Community Guidelines</p>
        <ul className="text-xs space-y-1 ml-4 list-disc">
          <li>Be kind, supportive, and respectful</li>
          <li>Share your experience — this is not a place for medical advice</li>
          <li>If you are in crisis, call 1-833-943-5746 (National Maternal Mental Health Hotline)</li>
          <li>Report harmful content using the flag button</li>
        </ul>
      </div>

      {/* Pseudonym setup or new post button */}
      {pseudonym ? (
        <Link
          href="/mom-talk/new"
          className="block bg-indigo-600 text-white text-center text-sm font-medium py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Start a new conversation
        </Link>
      ) : (
        <Link
          href="/mom-talk/setup"
          className="block bg-indigo-50 border border-indigo-200 text-center text-sm py-3 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <span className="text-indigo-900 font-medium">Create your pseudonym to post</span>
          <p className="text-indigo-600 text-xs mt-0.5">Choose a name to use in the community</p>
        </Link>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Posts feed */}
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/mom-talk/${post.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{post.pseudonym}</p>
                <p className="text-gray-600 text-sm mt-1.5 line-clamp-3">{post.post_content}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>{post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Load more
        </button>
      )}

      {loading && page > 1 && (
        <p className="text-center text-gray-400 text-sm animate-pulse">Loading…</p>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-gray-400 text-sm">You've reached the end</p>
      )}

      {posts.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No posts yet. Be the first to start a conversation!</p>
        </div>
      )}
    </div>
  );
}
