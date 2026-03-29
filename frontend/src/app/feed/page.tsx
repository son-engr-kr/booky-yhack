"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import FeedCard from "@/components/feed/FeedCard";
import { getFeed, deleteHighlight, type FeedPost } from "@/lib/api";

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeed()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f0f2f8]/95 backdrop-blur-md border-b border-white/60 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Feed</h1>
          <div className="flex items-center gap-3">
            {/* Porthole decoration */}
            <div className="w-6 h-6 rounded-full bg-[#0c0e1a] border-2 border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              <div className="w-1 h-1 rounded-full bg-white/60" />
            </div>
            {/* Notification bell */}
            <button className="text-gray-500 text-lg relative">
              🔔
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {loading && (
          <div className="text-center text-gray-400 text-sm py-10 animate-pulse">
            Loading feed...
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            No posts yet. Start reading to see your friends' activity.
          </div>
        )}

        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
          >
            <FeedCard
              post={post}
              onDelete={(id) => {
                deleteHighlight(post.bookId, id).then((ok) => {
                  if (ok) setPosts((prev) => prev.filter((p) => p.id !== id));
                });
              }}
            />
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
