"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateComic } from "@/lib/api";

const LOADING_LINES = [
  "Painting the moments you lived through...",
  "Your memories are taking shape...",
  "The story is finding its colors...",
  "Weaving your journey into pictures...",
  "The pages are coming alive...",
  "Turning words into worlds...",
];

interface RecapPanelProps {
  bookId: string;
  bookTitle: string;
  author: string;
  currentChapter: number;
  chaptersSummary?: string;
  onContinue: () => void;
  onSkip: () => void;
}

interface ComicPanel {
  panel: number;
  title: string;
  description: string;
  image: string | null;
}

export default function RecapPanel({
  bookTitle,
  author,
  currentChapter,
  chaptersSummary,
  onContinue,
  onSkip,
}: RecapPanelProps) {
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLineIndex((i) => (i + 1) % LOADING_LINES.length), 2500);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    generateComic(bookTitle, author, chaptersSummary ?? "").then((res) => {
      if (res?.panels?.length) {
        setPanels(res.panels as ComicPanel[]);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [bookTitle, author, chaptersSummary]);

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 font-serif">Story So Far</h2>
        <p className="text-xs text-gray-500 mt-0.5">Ch.1–{currentChapter - 1} recap</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin mb-6" />
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-gray-500 font-serif italic text-center max-w-[220px] leading-relaxed"
            >
              {LOADING_LINES[lineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      ) : error ? (
        <p className="text-sm text-gray-400 text-center py-8 mb-6">Failed to generate recap.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {panels.map((panel, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", damping: 22, stiffness: 280 }}
              className="flex flex-col"
            >
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="aspect-square relative overflow-hidden">
                  {panel.image ? (
                    <img
                      src={panel.image}
                      alt={panel.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100" />
                  )}
                </div>
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{panel.panel || i + 1}</span>
                </div>
              </div>
              {panel.description && (
                <p className="text-[11px] text-gray-600 leading-relaxed mt-1.5 px-0.5">
                  {panel.description}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full bg-gray-900 text-white font-semibold text-sm py-3.5 rounded-2xl mb-3 shadow-sm hover:bg-gray-800 transition-colors"
      >
        Continue to Ch.{currentChapter} →
      </motion.button>

      <button
        onClick={onSkip}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
      >
        Skip Recap
      </button>
    </div>
  );
}
