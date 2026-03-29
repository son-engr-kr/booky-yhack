"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getMyBooks, type ReadingProgress } from "@/lib/api";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BookItem({
  progress,
  onClick,
}: {
  progress: ReadingProgress;
  onClick: () => void;
}) {
  const coverGradients = [
    "from-indigo-400 to-purple-600",
    "from-rose-400 to-orange-500",
    "from-teal-400 to-cyan-600",
    "from-amber-400 to-yellow-600",
  ];
  const gradIdx =
    progress.bookId.charCodeAt(0) % coverGradients.length;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 text-left"
    >
      {/* Cover thumbnail */}
      <div
        className={`w-12 h-16 rounded-md bg-gradient-to-br ${coverGradients[gradIdx]} flex-shrink-0 shadow-sm`}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[14px] font-semibold text-gray-900 truncate flex-1">
            {progress.bookId}
          </p>
          {progress.status === "completed" && (
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
              Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
          <span>📝 {progress.notesCount} notes</span>
          <span>🤖 {progress.questionsAnswered} AI q's</span>
        </div>

        {progress.status !== "completed" && (
          <>
            <ProgressBar pct={progress.percentage} />
            <p className="text-[10px] text-gray-400 mt-1">
              Ch. {progress.currentChapter} / {progress.totalChapters} ·{" "}
              {progress.percentage}%
            </p>
          </>
        )}
      </div>
    </motion.button>
  );
}

export default function MyBooksPage() {
  const [books, setBooks] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getMyBooks()
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  const reading = books.filter((b) => b.status === "reading");
  const done = books.filter((b) => b.status === "completed");

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f0f2f8]/95 backdrop-blur-md border-b border-white/60 px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">My Books</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {loading && (
          <div className="text-center text-gray-400 text-sm py-10 animate-pulse">
            Loading your books...
          </div>
        )}

        {/* Reading section */}
        {reading.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              📖 Reading
            </h2>
            <div className="space-y-2">
              {reading.map((b, i) => (
                <motion.div
                  key={b.bookId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                >
                  <BookItem
                    progress={b}
                    onClick={() => router.push(`/library/${b.bookId}`)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Done section */}
        {done.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              ✅ Done
            </h2>
            <div className="space-y-2">
              {done.map((b, i) => (
                <motion.div
                  key={b.bookId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                >
                  <BookItem
                    progress={b}
                    onClick={() => router.push(`/library/${b.bookId}`)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!loading && books.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            No books yet. Browse the library to start reading.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
