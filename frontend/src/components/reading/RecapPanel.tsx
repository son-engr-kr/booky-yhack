"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { aiGenerateRecap } from "@/lib/api";

interface RecapPanelProps {
  bookId: string;
  bookTitle: string;
  author: string;
  currentChapter: number;
  chaptersSummary?: string;
  onContinue: () => void;
  onSkip: () => void;
}

interface RecapEntry {
  emoji: string;
  title?: string;
  text: string;
}

const FALLBACK_RECAP: RecapEntry[] = [
  { emoji: "📖", text: "Loading your story recap..." },
];

export default function RecapPanel({ bookId, bookTitle, author, currentChapter, chaptersSummary, onContinue, onSkip }: RecapPanelProps) {
  const [panels, setPanels] = useState<RecapEntry[]>(FALLBACK_RECAP);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chaptersSummary) {
      setLoading(false);
      return;
    }
    setLoading(true);
    aiGenerateRecap(bookTitle, author, chaptersSummary).then((res) => {
      if (res?.panels?.length) {
        setPanels(res.panels.map((p) => ({
          emoji: p.emoji || "📖",
          title: p.title,
          text: p.description,
        })));
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

      <div className="grid grid-cols-2 gap-3 mb-6">
        {panels.map((panel, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, type: "spring", damping: 24, stiffness: 300 }}
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${loading ? "animate-pulse" : ""}`}
          >
            <div className="text-3xl mb-2 text-center">{panel.emoji}</div>
            {panel.title && <p className="text-[10px] font-bold text-amber-700 text-center mb-1">{panel.title}</p>}
            <p className="text-xs text-gray-700 leading-relaxed text-center">{panel.text}</p>
          </motion.div>
        ))}
      </div>

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
