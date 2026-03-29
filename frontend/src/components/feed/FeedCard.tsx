"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { addFeedComment, deleteFeedComment, type FeedPost } from "@/lib/api";

interface FeedCardProps {
  post: FeedPost;
  onDelete?: (postId: string) => void;
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedCard({ post, onDelete }: FeedCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentInput, setCommentInput] = useState("");
  const [deleted, setDeleted] = useState(false);
  const isMine = post.userId === "me";

  if (deleted) return null;

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleComment = () => {
    const text = commentInput.trim();
    if (!text) return;
    setCommentInput("");
    addFeedComment(post.id, text).then((reply) => {
      if (reply) setComments((prev) => [...prev, reply]);
    });
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
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
            {post.type}
          </span>
          {isMine && post.type === "highlight" && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (window.confirm("Delete this highlight?")) {
                  onDelete(post.id);
                  setDeleted(true);
                }
              }}
              className="text-[12px] text-gray-400 hover:text-rose-500 transition-colors px-1 py-0.5"
            >
              ✕
            </button>
          )}
        </div>
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
                Spoiler — Reveal anyway?
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
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            showComments ? "text-indigo-500" : "text-gray-400"
          }`}
        >
          💬 <span>{comments.length}</span>
        </button>
        <a href={`/library/${post.bookId}`} className="ml-auto text-[12px] text-indigo-500 font-medium hover:text-indigo-700 transition-colors">
          Start reading →
        </a>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-50"
          >
            <div className="px-4 py-3">
              {comments.length > 0 && (
                <div className="flex flex-col gap-2.5 mb-3">
                  {comments.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
                        {c.userName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-semibold text-gray-800">{c.userName}</span>
                          {c.createdAt && (
                            <span className="text-[9px] text-gray-400">{timeAgo(c.createdAt)}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-600 leading-relaxed">{c.text}</p>
                      </div>
                      {c.userId === "me" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFeedComment(post.id, c.id!).then((ok) => {
                              if (ok) setComments((prev) => prev.filter((_, j) => j !== i));
                            });
                          }}
                          className="text-[10px] text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  placeholder="Add a comment..."
                  className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 transition-colors"
                />
                <button
                  onClick={handleComment}
                  disabled={!commentInput.trim()}
                  className="text-[11px] font-semibold text-indigo-500 disabled:text-gray-300 px-2"
                >
                  Post
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
