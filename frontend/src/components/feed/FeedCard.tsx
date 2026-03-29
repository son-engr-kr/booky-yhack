"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { FeedPost } from "@/lib/api";

interface FeedCardProps {
  post: FeedPost;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

function HighlightCard({ post }: { post: FeedPost }) {
  return (
    <div>
      {post.quote && (
        <div className="bg-amber-50/80 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 mb-3">
          <p className="font-serif text-[15px] text-amber-900 leading-relaxed italic">
            "{post.quote}"
          </p>
          <p className="text-[10px] text-amber-600 mt-1 font-medium">
            {post.bookTitle}{post.chapterNum ? ` · Ch. ${post.chapterNum}` : ""}
          </p>
        </div>
      )}
      {post.text && (
        <p className="text-[13px] text-gray-700 leading-relaxed">{post.text}</p>
      )}
    </div>
  );
}

function StoryCard({ post }: { post: FeedPost }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={`/assets/${post.planetImage || "planet2.png"}`}
          alt={post.userName}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="text-[13px] text-gray-800 leading-relaxed">{post.text}</p>
        <p className="text-[11px] text-gray-400 mt-1">
          <Image src="/assets/icons/simple-book.png" alt="Book" width={14} height={14} className="inline mr-0.5" /> {post.bookTitle}
        </p>
      </div>
    </div>
  );
}

function CompletionCard({ post }: { post: FeedPost }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Finished!
        </span>
        <span className="text-[12px] font-semibold text-gray-800">{post.bookTitle}</span>
      </div>
      {post.rating !== undefined && (
        <div className="mb-2">
          <StarRating rating={post.rating} />
        </div>
      )}
      {post.text && (
        <p className="text-[13px] text-gray-700 leading-relaxed">{post.text}</p>
      )}
    </div>
  );
}

export default function FeedCard({ post }: FeedCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <img
            src={`/assets/${post.planetImage || "planet2.png"}`}
            alt={post.userName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-gray-900">{post.userName}</span>
          <span className="text-[11px] text-gray-400 ml-2">{timeAgo(post.createdAt)}</span>
        </div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
          {post.type}
        </span>
      </div>

      {/* Body — with spoiler overlay */}
      <div className="px-4 pb-3 relative">
        {post.isSpoiler && !revealed ? (
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none">
              {post.type === "highlight" && <HighlightCard post={post} />}
              {post.type === "story" && <StoryCard post={post} />}
              {post.type === "completion" && <CompletionCard post={post} />}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => setRevealed(true)}
                className="text-[12px] font-medium bg-white/90 border border-amber-300 text-amber-700 px-4 py-2 rounded-full shadow-sm"
              >
                🔒 Spoiler — Reveal anyway?
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.type === "highlight" && <HighlightCard post={post} />}
            {post.type === "story" && <StoryCard post={post} />}
            {post.type === "completion" && <CompletionCard post={post} />}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-gray-50">
        <motion.button
          onClick={handleLike}
          whileTap={{ scale: 0.85 }}
          className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            liked ? "text-rose-500" : "text-gray-400"
          }`}
        >
          {liked ? "♥" : "♡"} <span>{likeCount}</span>
        </motion.button>
        <button className="flex items-center gap-1.5 text-[12px] text-gray-400 font-medium">
          💬 <span>{post.comments.length}</span>
        </button>
        <a href={`/library/${post.bookId}`} className="ml-auto text-[12px] text-indigo-500 font-medium hover:text-indigo-700 transition-colors">
          Start reading →
        </a>
      </div>
    </motion.div>
  );
}
