"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import NodeCard from "@/components/choices/NodeCard";
import { getChoices, type Choice } from "@/lib/api";

export default function ChoicesPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [expanded, setExpanded] = useState<Choice | null>(null);

  useEffect(() => {
    if (bookId) getChoices(bookId).then(setChoices);
  }, [bookId]);

  const currentChoice = choices[choices.length - 1] ?? null;

  if (choices.length === 0) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading story branches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#050507]/90 backdrop-blur-md px-4 pt-10 pb-3 border-b border-gray-100/60">
        <h1 className="text-lg font-bold text-white">Your Choice Tree</h1>
        <p className="text-xs text-gray-400 mt-0.5">Tap any node to see full stats</p>
      </div>

      <div className="px-4 pt-6">
        <div className="flex flex-col items-center gap-0">
          {choices.map((choice, idx) => {
            const isCurrent = choice === currentChoice;
            const isChosen = !!choice.myChoice;
            const chosenOption = choice.options.find((o) => o.id === choice.myChoice);
            const chosenStats = chosenOption ? choice.stats[chosenOption.id] : null;
            const unchosenOptions = choice.options.filter((o) => o.id !== choice.myChoice);

            return (
              <div key={choice.id} className="w-full flex flex-col items-center">
                {/* Main node */}
                <div className="w-full max-w-sm">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07, type: "spring", damping: 22, stiffness: 280 }}
                    whileTap={isCurrent ? undefined : { scale: 0.97 }}
                    onClick={isCurrent ? undefined : () => setExpanded(choice)}
                    className={`
                      relative rounded-xl border transition-all
                      ${isCurrent
                        ? "bg-white/90 backdrop-blur-md border-amber-500/50 shadow-[0_0_24px_rgba(217,119,6,0.18)] p-4 cursor-default"
                        : isChosen
                        ? "bg-white/85 backdrop-blur-md border-amber-600/30 p-3 cursor-pointer hover:border-amber-500/50 hover:shadow-md"
                        : "bg-white/40 backdrop-blur-md border-gray-100/50 opacity-50 p-3 cursor-pointer"}
                    `}
                  >
                    {/* Pulsing ring on current */}
                    {isCurrent && (
                      <motion.div
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl border-2 border-amber-500/30 pointer-events-none"
                      />
                    )}

                    <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${
                      isCurrent ? "text-amber-600" : isChosen ? "text-amber-700/70" : "text-gray-400"
                    }`}>
                      {isCurrent ? "NOW · " : ""}Chapter {choice.chapterNum}
                    </div>

                    <div className={`font-semibold leading-snug mb-2 ${
                      isCurrent ? "text-gray-900 text-sm" : "text-gray-800 text-xs"
                    }`}>
                      {isCurrent ? "What would you do?" : choice.question}
                    </div>

                    {/* Chosen option pill */}
                    {!isCurrent && chosenOption && (
                      <div className="text-[11px] text-amber-700 font-medium bg-amber-50 rounded-lg px-2 py-1 mb-2 inline-block">
                        Your choice: {chosenOption.text}
                      </div>
                    )}

                    {/* Agreement bar */}
                    {!isCurrent && chosenStats && (
                      <div className="mb-2">
                        <div className="text-[10px] text-gray-400 mb-0.5">
                          {chosenStats.percentage}% agreed
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${chosenStats.percentage}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.07 + 0.2 }}
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
                          <span className="text-[9px] text-gray-400 ml-1">
                            +{chosenStats.voters.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Current node option buttons */}
                    {isCurrent && (
                      <div className="flex gap-2 mt-3">
                        {choice.options.slice(0, 2).map((opt) => (
                          <div
                            key={opt.id}
                            className="flex-1 text-xs py-2 px-3 rounded-lg border border-amber-500/30 bg-amber-50 text-amber-800 font-medium text-center"
                          >
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tap hint for non-current chosen nodes */}
                    {!isCurrent && isChosen && (
                      <div className="absolute top-2.5 right-3 text-[9px] text-gray-300 font-medium">
                        tap ↗
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Fork: unchosen paths */}
                {!isCurrent && unchosenOptions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.07 + 0.15 }}
                    className="w-full max-w-sm flex items-start gap-2 mt-1.5 mb-1"
                  >
                    {/* Fork line indicator */}
                    <div className="flex flex-col items-center pt-1 mr-1">
                      <div className="w-px h-3 bg-gray-300/50" />
                      <div className="w-2 h-2 rounded-full bg-gray-300/60" />
                    </div>
                    {unchosenOptions.map((opt) => {
                      const stats = choice.stats[opt.id];
                      return (
                        <div
                          key={opt.id}
                          className="flex-1 rounded-xl border border-gray-100/50 bg-white/40 backdrop-blur-md p-2 opacity-45"
                        >
                          <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
                            Not taken
                          </div>
                          <div className="text-[11px] text-gray-500 leading-snug mb-1">{opt.text}</div>
                          {stats && (
                            <div className="text-[10px] text-gray-400">{stats.percentage}% chose this</div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Connector line to next node */}
                {idx < choices.length - 1 && (
                  <div className={`w-px my-1 ${isCurrent ? "h-4 bg-amber-400/60" : "h-5 bg-amber-300/50"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Node card bottom sheet */}
      <AnimatePresence>
        {expanded && (
          <NodeCard choice={expanded} onClose={() => setExpanded(null)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
