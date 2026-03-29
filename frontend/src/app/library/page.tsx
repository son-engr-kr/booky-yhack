"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { listBooks, getMyBooks, type Book, type ReadingProgress } from "@/lib/api";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([listBooks(), getMyBooks()]).then(([bookList, progressList]) => {
      setBooks(bookList ?? []);
      const map: Record<string, ReadingProgress> = {};
      for (const p of (progressList ?? [])) {
        map[p.bookId] = p;
      }
      setProgressMap(map);
    }).finally(() => setLoading(false));
  }, []);

  const coverGradients = [
    "from-indigo-400 to-purple-600",
    "from-rose-400 to-orange-500",
    "from-teal-400 to-cyan-600",
    "from-amber-400 to-yellow-600",
    "from-pink-400 to-fuchsia-600",
    "from-emerald-400 to-green-600",
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f0f2f8]/95 backdrop-blur-md border-b border-white/60 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Library</h1>
            <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
              👥 3 friends reading now
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Porthole decoration */}
            <div className="w-6 h-6 rounded-full bg-[#0c0e1a] border-2 border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              <div className="w-1 h-1 rounded-full bg-white/60" />
            </div>
            <button className="text-gray-500 text-lg">🔍</button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {loading && (
          <div className="text-center text-gray-400 text-sm py-10 animate-pulse">
            Loading library...
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {books.map((book, i) => {
            const progress = progressMap[book.id];
            const isReading = progress?.status === "reading";
            const isNew = !progress || progress.status === "not-started";
            const pct = progress?.percentage ?? 0;
            return (
              <motion.button
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                onClick={() => router.push(`/library/${book.id}`)}
                className="flex flex-col items-stretch text-left"
              >
                {/* Cover */}
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-1.5">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        coverGradients[i % coverGradients.length]
                      } flex items-end p-2`}
                    >
                      <span className="text-white text-[9px] font-semibold leading-tight line-clamp-3">
                        {book.title}
                      </span>
                    </div>
                  )}
                  {/* NEW badge — only on unstarted books */}
                  {isNew && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        NEW
                      </span>
                    </div>
                  )}
                  {/* Progress bar — only on books in progress */}
                  {isReading && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-1 bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                {/* Title */}
                <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">
                  {book.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{book.author}</p>
                {/* Progress text for reading books */}
                {isReading && (
                  <p className="text-[9px] text-amber-600 mt-0.5 font-medium">
                    Ch. {progress.currentChapter}/{progress.totalChapters}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
