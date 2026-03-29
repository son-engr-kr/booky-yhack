"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AIMCCardProps {
  question: string;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}

export default function AIMCCard({ question, onAnswer, onSkip }: AIMCCardProps) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedAnswer, setSavedAnswer] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    setSavedAnswer(input.trim());
    setSubmitted(true);
    onAnswer(input.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 backdrop-blur-sm p-5 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <img src="/assets/booky-chracter.png" alt="Booky" className="w-6 h-6 object-contain" />
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Booky
        </span>
      </div>

      {/* Question */}
      <p className="text-gray-800 text-sm italic leading-relaxed mb-4">
        "{question}"
      </p>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full text-sm bg-white/80 border border-amber-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 disabled:text-amber-400 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                Answer
              </button>
              <button
                onClick={onSkip}
                className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="note"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-xl border border-amber-200 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Reading Note
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">Just now</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{savedAnswer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
