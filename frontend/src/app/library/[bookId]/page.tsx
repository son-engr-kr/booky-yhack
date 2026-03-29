"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import RecapPanel from "@/components/reading/RecapPanel";
import {
  getBook,
  getProgress,
  getFriends,
  type Book,
  type ReadingProgress,
  type Friend,
} from "@/lib/api";

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showRecap, setShowRecap] = useState(false);

  useEffect(() => {
    getBook(bookId).then(setBook);
    getProgress(bookId).then((p) => {
      setProgress(p);
    });
    getFriends().then(setFriends);
  }, [bookId]);

  if (!book) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-amber-600 text-sm animate-pulse font-serif">Loading...</div>
      </div>
    );
  }

  const currentChapter = progress?.currentChapter ?? 1;
  const percentage = progress?.percentage ?? 0;
  const readingFriends = friends.slice(0, 5);

  const handleContinue = () => {
    window.location.href = `/library/${bookId}/read?chapter=${currentChapter}`;
  };

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0f2f8]/95 backdrop-blur-sm border-b border-gray-200/60 px-4 py-3 flex items-center gap-3">
        <Link
          href="/library"
          className="text-gray-600 hover:text-gray-900 transition-colors text-lg"
        >
          ←
        </Link>
        <span className="text-sm font-semibold text-gray-900 truncate flex-1">
          {book.title}
        </span>
      </div>

      {/* Cover + meta */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="w-28 h-40 rounded-2xl overflow-hidden shadow-xl flex-shrink-0 bg-gray-200"
          >
            <img
              src={book.cover || `/assets/covers/${bookId}.jpg`}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/assets/cover-placeholder.jpg";
              }}
            />
          </motion.div>

          <div className="flex-1 pt-1">
            <h1 className="text-xl font-bold text-gray-900 font-serif leading-tight mb-1">
              {book.title}
            </h1>
            <p className="text-sm text-gray-500 mb-1">{book.author}</p>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200">
              {book.genre}
            </span>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                <span>Chapter {currentChapter} of {book.totalChapters}</span>
                <span>{percentage}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mt-5">{book.description}</p>
      </div>

      {/* Friends reading */}
      {readingFriends.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Friends Reading
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {readingFriends.map((f) => (
                <div
                  key={f.id}
                  className="w-8 h-8 rounded-full border-2 border-[#f0f2f8] overflow-hidden bg-amber-100 flex items-center justify-center text-sm"
                >
                  <img
                    src={`/assets/${f.planetImage}`}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {readingFriends.map((f) => f.name.split(" ")[0]).join(", ")} {readingFriends.length > 1 ? "are" : "is"} reading
            </span>
          </div>
        </div>
      )}

      {/* Continue reading CTA */}
      <div className="px-4 pb-4">
        <Link
          href={`/library/${bookId}/read?chapter=${currentChapter}`}
          className="flex items-center justify-between w-full bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-5 py-4 shadow-sm transition-colors"
        >
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Continue Reading</div>
            <div className="text-sm font-semibold">Chapter {currentChapter}</div>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "/assets/icons/hand-book.png", label: "Notes", href: `/library/${bookId}/read` },
            { icon: "/assets/icons/planet-book.png", label: "Characters", href: `/library/${bookId}/read` },
            { icon: "/assets/icons/galaxy.png", label: "Booky Chat", href: `/library/${bookId}/read` },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl py-4 shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <Image src={action.icon} alt={action.label} width={28} height={28} />
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recap section — only if past chapter 1 */}
      {currentChapter > 1 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!showRecap ? (
              <button
                onClick={() => setShowRecap(true)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Image src="/assets/icons/opened-book.png" alt="Recap" width={24} height={24} />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Story Recap</div>
                    <div className="text-xs text-gray-500">Ch.1–{currentChapter - 1} summary</div>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">▼</span>
              </button>
            ) : (
              <RecapPanel
                bookId={bookId}
                currentChapter={currentChapter}
                onContinue={handleContinue}
                onSkip={() => setShowRecap(false)}
              />
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
