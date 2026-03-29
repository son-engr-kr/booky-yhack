"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getFriends, type Friend } from "@/lib/api";

const planetColors: Record<string, string> = {
  "planet1.png": "from-indigo-400 to-purple-600",
  "planet2.png": "from-amber-400 to-orange-500",
  "planet3.png": "from-teal-400 to-cyan-600",
  "planet4.png": "from-rose-400 to-pink-600",
};

function avatarGradient(planetImage: string) {
  return planetColors[planetImage] ?? "from-gray-400 to-gray-600";
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getFriends()
      .then(setFriends)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#050507]/95 backdrop-blur-md border-b border-white/60 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-white tracking-tight">Friends</h1>
          <button className="text-[12px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
            + Add
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {loading && (
          <div className="text-center text-gray-400 text-sm py-10 animate-pulse">
            Loading friends...
          </div>
        )}

        {!loading && friends.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            No friends yet. Add some to see their reading activity.
          </div>
        )}

        {friends.map((friend, i) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3"
          >
            {/* Avatar */}
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(
                friend.planetImage
              )} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm`}
            >
              {friend.name[0]}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">{friend.name}</p>
              <p className="text-[11px] text-gray-400 truncate">
                {friend.similarity}% match · Lv.{friend.level}
              </p>
              <p className="text-[11px] text-indigo-500 truncate">
                {friend.booksRead} books · {friend.totalNotes} notes
              </p>
            </div>

            {/* Planet button */}
            <button
              onClick={() => router.push(`/friends/${friend.id}`)}
              className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex-shrink-0"
            >
              🪐 Planet
            </button>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
