"use client";

import { motion, AnimatePresence } from "framer-motion";
import { type Character } from "@/lib/api";

interface CharacterPopupProps {
  character: Character;
  onClose: () => void;
  currentChapter?: number;
}

export default function CharacterPopup({ character, onClose, currentChapter = 1 }: CharacterPopupProps) {
  const maxChapter = Math.max(...character.chapters, currentChapter);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md bg-white/95 backdrop-blur-lg rounded-t-3xl p-6 pb-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors text-lg"
          >
            ✕
          </button>

          {/* Character icon + name */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-sm">
              {roleIcon(character.role)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-serif">{character.name}</h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {character.role}
              </span>
            </div>
          </div>

          {/* Spoiler-free badge */}
          <div className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
            <span className="text-green-600 text-xs">✓</span>
            <span className="text-green-700 text-xs font-medium">
              Based on Ch.1–{maxChapter} (spoiler-free)
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-700 text-sm leading-relaxed mb-5">
            {character.description}
          </p>

          {/* Appears in chapters */}
          <div className="flex flex-wrap gap-2">
            {character.chapters.map((ch) => (
              <span
                key={ch}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
              >
                Ch.{ch}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function roleIcon(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("protagonist") || r.includes("narrator")) return "🧑";
  if (r.includes("antagonist")) return "😤";
  if (r.includes("love") || r.includes("romantic")) return "💚";
  if (r.includes("mentor") || r.includes("guide")) return "🧙";
  if (r.includes("friend") || r.includes("companion")) return "🤝";
  return "👤";
}
