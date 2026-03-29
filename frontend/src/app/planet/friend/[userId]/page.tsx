"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import BottomNav from "@/components/nav/BottomNav";
import {
  getFriend,
  getFriendProgress,
  listBooks,
  type Friend,
  type ReadingProgress,
  type Book,
} from "@/lib/api";

export default function FriendPlanetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [friend, setFriend] = useState<Friend | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);

  useEffect(() => {
    getFriend(userId).then(setFriend);
    getFriendProgress(userId).then(setProgress);
    listBooks().then(setAllBooks);
  }, [userId]);

  if (!friend) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-amber-500/50 text-sm animate-pulse">Loading planet...</div>
      </div>
    );
  }

  const booksInCommon = progress.filter((p) => p.percentage > 0);
  const topGenre = Object.keys(friend.genres)[0] ?? "Literature";

  return (
    <div className="min-h-screen bg-[#050507] pb-24 overflow-y-auto">
      {/* Back button */}
      <button
        onClick={() => router.push("/planet")}
        className="absolute top-4 left-4 z-20 text-gray-400 text-sm flex items-center gap-1 hover:text-white transition-colors"
      >
        ← Back
      </button>

      {/* Planet image */}
      <div className="flex justify-center pt-16 pb-6">
        <motion.img
          src={friend.generatedPlanetImage || `/assets/${friend.planetImage || 'planet3.png'}`}
          alt={friend.name}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
          className="w-40 h-40 rounded-full object-cover shadow-[0_0_60px_rgba(99,102,241,0.35)]"
        />
      </div>

      {/* Title */}
      <div className="text-center mb-6 px-4">
        <h1 className="text-2xl font-bold text-white">{friend.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {topGenre} reader · Lv.{friend.level}
        </p>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
          {[
            { value: friend.booksRead, label: "Books" },
            { value: friend.totalNotes, label: "Notes" },
            { value: `${friend.similarity}%`, label: "Match%" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-indigo-400 font-bold text-xl">{s.value}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Books in common */}
        {booksInCommon.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Books in Common
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {booksInCommon.map((p) => {
                const book = allBooks.find((b) => b.id === p.bookId);
                return (
                  <motion.div
                    key={p.bookId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-20 rounded-lg bg-white/10 border border-white/10 overflow-hidden">
                      {book?.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs text-center px-1">
                          {book?.title ?? p.bookId}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 w-14 text-center truncate">
                      {book?.title ?? p.bookId}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Constellation */}
        <Link
          href="/constellation/great-gatsby"
          className="flex items-center justify-between bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20 hover:border-indigo-400/40 transition-colors"
        >
          <div>
            <div className="text-sm font-semibold text-indigo-300">View Constellation</div>
            <div className="text-xs text-gray-500 mt-0.5">See how your reading paths connect</div>
          </div>
          <span className="text-indigo-400 text-lg">→</span>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
