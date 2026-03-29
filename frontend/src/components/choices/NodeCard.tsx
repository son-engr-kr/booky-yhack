"use client";

import { motion } from "framer-motion";
import type { Choice } from "@/lib/api";

interface NodeCardProps {
  choice: Choice;
  onClose: () => void;
}

export default function NodeCard({ choice, onClose }: NodeCardProps) {
  const myOption = choice.options.find((o) => o.id === choice.myChoice);

  const allVoters = choice.options.flatMap((opt) =>
    (choice.stats[opt.id]?.voters ?? []).map((v) => ({
      ...v,
      optionText: opt.text,
      isMyChoice: opt.id === choice.myChoice,
    }))
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-30"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[82vh] overflow-y-auto"
      >
        <div className="px-5 pt-4 pb-28">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-sm"
          >
            ✕
          </button>

          {/* Chapter label */}
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-1">
            Chapter {choice.chapterNum}
          </div>

          {/* Question */}
          <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug">
            {choice.question}
          </h2>

          {/* Context */}
          {choice.context && (
            <p className="text-xs text-gray-500 italic leading-relaxed mb-5">
              {choice.context}
            </p>
          )}

          {/* Your choice */}
          {myOption && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5">
              <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
                Your choice
              </div>
              <div className="text-sm font-bold text-amber-900">{myOption.text}</div>
              {myOption.description && (
                <div className="text-xs text-amber-700/60 mt-0.5 leading-relaxed">
                  {myOption.description}
                </div>
              )}
            </div>
          )}

          {/* Friends */}
          {allVoters.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-700 mb-2.5">Friends</div>
              <div className="flex flex-col gap-2">
                {allVoters.slice(0, 6).map((voter) => (
                  <div key={voter.userId} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {voter.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-800">{voter.userName}</span>
                      <span className="text-[10px] text-gray-400 ml-1">chose</span>
                      <span
                        className={`text-[10px] ml-1 font-semibold ${
                          voter.isMyChoice ? "text-amber-600" : "text-gray-500"
                        }`}
                      >
                        {voter.optionText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All readers bar chart */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2.5">All readers</div>
            <div className="flex flex-col gap-3">
              {choice.options.map((opt, i) => {
                const pct = choice.stats[opt.id]?.percentage ?? 0;
                const isChosen = opt.id === choice.myChoice;
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className={isChosen ? "text-amber-700 font-semibold" : "text-gray-500"}>
                        {opt.text}
                      </span>
                      <span className={isChosen ? "text-amber-600 font-semibold" : "text-gray-400"}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                        className={`h-full rounded-full ${i === 0 ? "bg-amber-400" : "bg-red-400"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
