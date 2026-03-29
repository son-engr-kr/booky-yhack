"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getFriend, getFriendProgress, type Friend, type ReadingProgress } from "@/lib/api";

const coverGradients = [
  "from-indigo-400 to-purple-600",
  "from-rose-400 to-orange-500",
  "from-teal-400 to-cyan-600",
  "from-amber-400 to-yellow-600",
  "from-pink-400 to-fuchsia-600",
];

export default function FriendDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFriend(userId), getFriendProgress(userId)])
      .then(([f, p]) => {
        setFriend(f);
        setProgress(p);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-amber-500/50 text-sm animate-pulse">Loading planet...</div>
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Friend not found.</div>
      </div>
    );
  }

  const topGenre = Object.keys(friend.genres)[0] ?? "Reader";

  return (
    <div className="min-h-screen bg-[#050507] pb-24 relative overflow-hidden">
      {/* Star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Back button */}
      <div className="relative z-10 px-4 pt-5">
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[13px] font-medium flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      {/* Planet image */}
      <div className="relative z-10 flex flex-col items-center pt-8 px-4">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="mb-6"
        >
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-[0_0_60px_rgba(139,92,246,0.4)] flex items-center justify-center">
            <span className="text-6xl">🪐</span>
          </div>
        </motion.div>

        {/* Name + title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-white">{friend.name}</h1>
          <p className="text-gray-400 text-[13px] mt-1">
            Level {friend.level} · {topGenre} Explorer
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl px-4 py-4 grid grid-cols-3 gap-4 mb-6 text-center"
        >
          {[
            { val: friend.booksRead, label: "Books" },
            { val: friend.totalNotes, label: "Notes" },
            { val: `${friend.similarity}%`, label: "Match" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-amber-400 font-bold text-xl">{s.val}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Books in common */}
        {progress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-xs mb-6"
          >
            <p className="text-gray-500 text-[11px] uppercase tracking-widest font-bold mb-3">
              Books in common
            </p>
            <div className="flex gap-2 flex-wrap">
              {progress.map((p, i) => (
                <div
                  key={p.bookId}
                  className={`w-10 h-14 rounded-md bg-gradient-to-br ${
                    coverGradients[i % coverGradients.length]
                  } shadow-md flex items-end p-1`}
                  title={p.bookId}
                >
                  <div className="w-full h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xs"
        >
          <button
            onClick={() => router.push(`/constellation/great-gatsby`)}
            className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl py-3 text-amber-400 text-[14px] font-semibold text-center"
          >
            View Constellation →
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
