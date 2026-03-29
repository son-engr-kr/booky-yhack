"use client";

import { motion } from "framer-motion";
import type { Choice } from "@/lib/api";

interface BranchNodeProps {
  choice: Choice;
  isChosen: boolean;
  isCurrent: boolean;
  onTap: (choice: Choice) => void;
}

export default function BranchNode({ choice, isChosen, isCurrent, onTap }: BranchNodeProps) {
  const chosenOption = choice.options.find((o) => o.id === choice.myChoice);
  const chosenStats = chosenOption ? choice.stats[chosenOption.id] : null;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap(choice)}
      className={`
        relative cursor-pointer rounded-xl border transition-all
        ${isCurrent
          ? "bg-white/90 backdrop-blur-md border-amber-500/50 shadow-[0_0_20px_rgba(217,119,6,0.15)] p-4"
          : isChosen
          ? "bg-white/85 backdrop-blur-md border-amber-600/30 p-3"
          : "bg-white/40 backdrop-blur-md border-gray-200/50 opacity-50 p-3"}
      `}
    >
      {isCurrent && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-xl border-2 border-amber-500/30 pointer-events-none"
        />
      )}

      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
        isCurrent ? "text-amber-600" : isChosen ? "text-amber-700/70" : "text-gray-400"
      }`}>
        {isCurrent ? "NOW · Chapter " + choice.chapterNum : "Chapter " + choice.chapterNum}
      </div>

      <div className={`font-semibold mb-2 leading-snug ${
        isCurrent ? "text-gray-900 text-sm" : isChosen ? "text-gray-800 text-xs" : "text-gray-500 text-xs"
      }`}>
        {isCurrent ? "What would you do?" : choice.question}
      </div>

      {!isCurrent && chosenOption && (
        <div className="text-[11px] text-amber-700 font-medium mb-2 bg-amber-50 rounded-lg px-2 py-1">
          Your choice: {chosenOption.text}
        </div>
      )}

      {/* Percentage bar */}
      {!isCurrent && chosenStats && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
            <span>{chosenStats.percentage}% agreed</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${chosenStats.percentage}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-amber-400 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Friend avatars */}
      {!isCurrent && chosenStats && chosenStats.voters.length > 0 && (
        <div className="flex items-center gap-1">
          {chosenStats.voters.slice(0, 4).map((voter, i) => (
            <div
              key={voter.userId}
              className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 border border-white flex items-center justify-center text-[8px] font-bold text-white"
              style={{ marginLeft: i > 0 ? -4 : 0 }}
            >
              {voter.userName.charAt(0)}
            </div>
          ))}
          {chosenStats.voters.length > 4 && (
            <span className="text-[9px] text-gray-400 ml-1">+{chosenStats.voters.length - 4}</span>
          )}
        </div>
      )}

      {isCurrent && (
        <div className="flex gap-2 mt-3">
          {choice.options.slice(0, 2).map((opt) => (
            <button
              key={opt.id}
              className="flex-1 text-xs py-2 px-3 rounded-lg border border-amber-500/30 bg-amber-50 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
