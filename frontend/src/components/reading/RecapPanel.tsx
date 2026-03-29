"use client";

import { motion } from "framer-motion";

interface RecapPanelProps {
  bookId: string;
  currentChapter: number;
  onContinue: () => void;
  onSkip: () => void;
}

interface RecapEntry {
  emoji: string;
  text: string;
}

const GATSBY_RECAP: RecapEntry[] = [
  { emoji: "🏡", text: "Nick moves to West Egg, next door to a mysterious mansion." },
  { emoji: "🥂", text: "Gatsby throws lavish parties every weekend. No one knows why." },
  { emoji: "💚", text: "Nick sees Gatsby staring at a green light across the bay." },
  { emoji: "👫", text: "Nick visits cousin Daisy & husband Tom. Tension is palpable." },
  { emoji: "🗣️", text: "Jordan reveals: Gatsby & Daisy were once in love." },
  { emoji: "☕", text: "Gatsby asks Nick to arrange tea with Daisy. The reunion is set." },
];

function getRecap(bookId: string): RecapEntry[] {
  if (bookId === "great-gatsby") return GATSBY_RECAP;
  return GATSBY_RECAP;
}

export default function RecapPanel({ bookId, currentChapter, onContinue, onSkip }: RecapPanelProps) {
  const panels = getRecap(bookId);

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
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="text-3xl mb-2 text-center">{panel.emoji}</div>
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
