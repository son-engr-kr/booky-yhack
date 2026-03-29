"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getFriend, getFriendProgress, type Friend, type ReadingProgress } from "@/lib/api";

const coverColors: Record<string, string> = {
  "great-gatsby": "from-emerald-900 to-emerald-700",
  "1984": "from-red-950 to-red-800",
  "pride-prejudice": "from-cyan-900 to-teal-700",
};

export default function FriendPlanetPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);

  useEffect(() => {
    if (!userId) return;
    getFriend(userId).then(setFriend);
    getFriendProgress(userId).then((p) => setProgress(p || []));
  }, [userId]);

  if (!friend) {
    return (
      <div className="h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-amber-500/50 text-sm animate-pulse">Loading planet...</div>
      </div>
    );
  }

  const reading = progress.filter((p) => p.status === "reading" || p.status === "completed");

  return (
    <div className="min-h-screen bg-[#050507] relative">
      {/* Twinkling stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white star-twinkle"
          style={{
            width: `${0.5 + (i % 3) * 0.5}px`,
            height: `${0.5 + (i % 3) * 0.5}px`,
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            "--duration": `${3 + (i % 4)}s`,
            "--delay": `${(i % 5) * 0.8}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 p-4 pt-10">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 text-sm"
        >
          ←
        </button>
        <h1 className="text-white font-bold">{friend.name}&apos;s Planet</h1>
      </div>

      {/* Planet zoom-in */}
      <div className="relative z-10 flex justify-center mt-4">
        <motion.img
          src={`/assets/${friend.planetImage.replace(".png", "-3d.jpg")}`}
          className="w-28 h-28 rounded-full object-cover"
          style={{ boxShadow: "0 0 30px rgba(255,215,0,0.15)" }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          alt={friend.name}
        />
      </div>

      {/* Name */}
      <div className="relative z-10 text-center mt-4">
        <div className="text-white font-bold text-xl">{friend.name}</div>
        <div className="text-gray-500 text-xs">Level {friend.level} · {friend.similarity}% match</div>
      </div>

      {/* Stats */}
      <div className="relative z-10 flex justify-center gap-8 mt-6">
        {[
          { n: friend.booksRead, l: "Books" },
          { n: friend.totalNotes, l: "Notes" },
          { n: `${friend.similarity}%`, l: "Match" },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-amber-500 font-bold text-lg">{s.n}</div>
            <div className="text-gray-500 text-[10px]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Books in common */}
      {reading.length > 0 && (
        <div className="relative z-10 px-6 mt-6">
          <div className="text-amber-500 text-xs font-semibold mb-2">
            Books in common
          </div>
          <div className="flex gap-2">
            {reading.map((p) => (
              <div
                key={p.bookId}
                className={`w-12 h-16 rounded-md bg-gradient-to-br ${
                  coverColors[p.bookId] || "from-gray-600 to-gray-400"
                } flex items-center justify-center`}
              >
                <span className="text-white text-[8px] font-semibold text-center px-0.5">
                  {p.bookId.split("-").map((w) => w[0]?.toUpperCase()).join("")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genres */}
      <div className="relative z-10 px-6 mt-4">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(friend.genres).map(([genre, pct]) => (
            <span
              key={genre}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400"
            >
              {genre} {pct}%
            </span>
          ))}
        </div>
      </div>

      {/* View Constellation */}
      <div className="relative z-10 px-6 mt-6">
        <button
          onClick={() => router.push("/constellation/great-gatsby")}
          className="w-full text-center bg-amber-500/10 border border-amber-500/20 rounded-xl py-3 text-amber-500 text-sm font-semibold"
        >
          View Constellation →
        </button>
      </div>

      <div className="pb-20" />
      <BottomNav />
    </div>
  );
}
