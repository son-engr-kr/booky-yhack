"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getMyBooks, listBooks, type ReadingProgress, type Book } from "@/lib/api";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BookItem({
  progress,
  cover,
  title,
  onClick,
}: {
  progress: ReadingProgress;
  cover?: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 text-left"
    >
      {/* Cover thumbnail */}
      {cover ? (
        <img src={cover} alt={title || progress.bookId} className="w-12 h-16 rounded-md object-cover flex-shrink-0 shadow-sm" />
      ) : (
        <div className="w-12 h-16 rounded-md bg-white flex-shrink-0 shadow-sm" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[14px] font-semibold text-gray-900 truncate flex-1">
            {title || progress.bookId}
          </p>
          {progress.status === "completed" && (
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
              Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
          <span className="flex items-center gap-1"><Image src="/assets/icons/hand-book.png" alt="Notes" width={14} height={14} /> {progress.notesCount} notes</span>
          <span className="flex items-center gap-1"><Image src="/assets/icons/galaxy.png" alt="Questions" width={14} height={14} /> {progress.questionsAnswered} Booky q's</span>
        </div>

        {progress.status !== "completed" && (
          <>
            <ProgressBar pct={progress.percentage} />
            <p className="text-[10px] text-gray-500 mt-1">
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
  const [bookCatalog, setBookCatalog] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getMyBooks()
      .then(setBooks)
      .finally(() => setLoading(false));
    listBooks().then((b) => setBookCatalog(Array.isArray(b) ? b : []));
  }, []);

  const reading = books.filter((b) => b.status === "reading");
  const done = books.filter((b) => b.status === "completed");

  return (
    <div className="min-h-screen bg-[#050507] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#050507]/95 backdrop-blur-md border-b border-gray-100/60 px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-[20px] font-bold text-white tracking-tight">My Books</h1>
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
              <Image src="/assets/icons/simple-book.png" alt="Reading" width={14} height={14} className="inline mr-1" /> Reading
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
                    cover={bookCatalog.find((bc) => bc.id === b.bookId)?.cover}
                    title={bookCatalog.find((bc) => bc.id === b.bookId)?.title}
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
                    cover={bookCatalog.find((bc) => bc.id === b.bookId)?.cover}
                    title={bookCatalog.find((bc) => bc.id === b.bookId)?.title}
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
