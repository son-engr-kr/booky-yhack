"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Choice } from "@/lib/api";

interface ChapterEndChoiceProps {
  choice: Choice;
  chapterNum: number;
  onComplete: () => void;
}

type Phase = "prompt" | "stats";

export default function ChapterEndChoice({
  choice,
  chapterNum,
  onComplete,
}: ChapterEndChoiceProps) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [picked, setPicked] = useState<string | null>(null);

  const handlePick = (optionId: string) => {
    setPicked(optionId);
    setTimeout(() => setPhase("stats"), 420);
  };

  const pickedOption = choice.options.find((o) => o.id === picked);
  const pickedStats = picked ? choice.stats[picked] : null;

  // Collect all voters across all options with their option text attached
  const allVoters = choice.options.flatMap((opt) =>
    (choice.stats[opt.id]?.voters ?? []).map((v) => ({
      ...v,
      optionText: opt.text,
      isMyPick: opt.id === picked,
    }))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050507]/95 backdrop-blur-md"
    >
      <AnimatePresence mode="wait">
        {phase === "prompt" ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="flex flex-col flex-1 px-6 pt-16 pb-10 justify-between"
          >
            {/* Header */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-3">
                Chapter {chapterNum} Complete
              </div>
              <h2 className="text-2xl font-bold text-white leading-snug mb-3">
                {choice.question}
              </h2>
              {choice.context && (
                <p className="text-sm text-white/50 italic leading-relaxed">
                  {choice.context}
                </p>
              )}
            </div>

            {/* Choice buttons */}
            <div className="flex flex-col gap-3 mt-10">
              {choice.options.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, x: i === 0 ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", damping: 22, stiffness: 260, delay: 0.1 + i * 0.1 }}
                  onClick={() => handlePick(opt.id)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/8 backdrop-blur-md px-5 py-4 hover:bg-white/14 hover:border-amber-400/40 active:scale-[0.98] transition-all"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div className="text-white font-semibold text-[15px] leading-snug">
                    {opt.text}
                  </div>
                  {opt.description && (
                    <div className="text-white/40 text-xs mt-1 leading-relaxed">
                      {opt.description}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="flex flex-col flex-1 px-6 pt-14 pb-10 overflow-y-auto"
          >
            {/* You chose */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, type: "spring", damping: 22, stiffness: 280 }}
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 mb-6"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400 mb-1">
                You chose
              </div>
              <div className="text-white font-bold text-lg leading-snug">
                {pickedOption?.text}
              </div>
              {pickedStats && (
                <div className="text-amber-300/70 text-xs mt-1">
                  {pickedStats.percentage}% of readers made the same choice
                </div>
              )}
            </motion.div>

            {/* Friends */}
            {allVoters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="mb-6"
              >
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
                  Friends
                </div>
                <div className="flex flex-col gap-2.5">
                  {allVoters.slice(0, 6).map((voter, i) => (
                    <motion.div
                      key={voter.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.22 + i * 0.06 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {voter.userName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm font-medium">{voter.userName}</span>
                        <span className="text-white/40 text-xs ml-1.5">chose</span>
                        <span
                          className={`text-xs ml-1.5 font-semibold ${
                            voter.isMyPick ? "text-amber-400" : "text-white/50"
                          }`}
                        >
                          {voter.optionText}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All readers bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
                All readers
              </div>
              <div className="flex flex-col gap-3">
                {choice.options.map((opt, i) => {
                  const pct = choice.stats[opt.id]?.percentage ?? 0;
                  const isChosen = opt.id === picked;
                  return (
                    <div key={opt.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={isChosen ? "text-amber-300 font-semibold" : "text-white/50"}>
                          {opt.text}
                        </span>
                        <span className={isChosen ? "text-amber-300 font-semibold" : "text-white/40"}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/8 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.35 + i * 0.12, ease: "easeOut" }}
                          className={`h-full rounded-full ${isChosen ? "bg-amber-400" : "bg-red-400/70"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={onComplete}
              className="w-full bg-white text-gray-900 font-bold text-[15px] rounded-2xl py-4 hover:bg-white/90 active:scale-[0.98] transition-all mt-auto"
            >
              Continue to next chapter →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
