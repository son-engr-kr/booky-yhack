"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import BranchNode from "@/components/choices/BranchNode";
import { getChoices, type Choice } from "@/lib/api";

export default function ChoicesPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [expanded, setExpanded] = useState<Choice | null>(null);

  useEffect(() => {
    if (bookId) getChoices(bookId).then(setChoices);
  }, [bookId]);

  // Split into past choices and the current (last) one
  const pastChoices = choices.slice(0, -1);
  const currentChoice = choices[choices.length - 1] ?? null;

  const handleNodeTap = (choice: Choice) => {
    if (choice === currentChoice) return;
    setExpanded(choice);
  };

  if (choices.length === 0) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading story branches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#f0f2f8]/90 backdrop-blur-md px-4 pt-10 pb-3 border-b border-gray-200/60">
        <h1 className="text-lg font-bold text-gray-900">Your Choice Tree</h1>
        <p className="text-xs text-gray-400 mt-0.5">Pinch to zoom · Scroll to explore</p>
      </div>

      <div className="px-4 pt-6">
        {/* Past choices — vertical tree */}
        <div className="flex flex-col items-center gap-0">
          {pastChoices.map((choice, idx) => (
            <div key={choice.id} className="w-full flex flex-col items-center">
              <div className="w-full max-w-sm">
                <BranchNode
                  choice={choice}
                  isChosen={true}
                  isCurrent={false}
                  onTap={handleNodeTap}
                />
              </div>

              {/* Connector line */}
              {idx < pastChoices.length - 1 || currentChoice ? (
                <div className="w-px h-6 bg-amber-300/50 my-1" />
              ) : null}

              {/* Unchosen paths branch */}
              {choice.options.length > 1 && (
                <div className="w-full max-w-sm flex items-start gap-2 mb-1">
                  {choice.options
                    .filter((o) => o.id !== choice.myChoice)
                    .map((opt) => {
                      const stats = choice.stats[opt.id];
                      return (
                        <div
                          key={opt.id}
                          className="flex-1 rounded-xl border border-gray-200/50 bg-white/40 backdrop-blur-md p-2 opacity-50"
                        >
                          <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                            Not taken
                          </div>
                          <div className="text-[11px] text-gray-500 leading-snug mb-1">{opt.text}</div>
                          {stats && (
                            <div className="text-[10px] text-gray-400">
                              {stats.percentage}% chose this
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}

          {/* Connector to current */}
          {pastChoices.length > 0 && currentChoice && (
            <div className="w-px h-6 bg-amber-400/60 my-1" />
          )}

          {/* Current choice node */}
          {currentChoice && (
            <div className="w-full max-w-sm mb-2">
              <BranchNode
                choice={currentChoice}
                isChosen={false}
                isCurrent={true}
                onTap={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail sheet */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-30"
              onClick={() => setExpanded(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="px-5 pt-5 pb-24">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

                <div className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">
                  Chapter {expanded.chapterNum}
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">{expanded.question}</h2>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{expanded.context}</p>

                {/* My choice */}
                {(() => {
                  const mine = expanded.options.find((o) => o.id === expanded.myChoice);
                  return mine ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
                      <div className="text-[10px] text-amber-600 font-semibold mb-0.5">Your choice</div>
                      <div className="text-sm font-semibold text-amber-900">{mine.text}</div>
                      {mine.description && (
                        <div className="text-xs text-amber-700/70 mt-0.5">{mine.description}</div>
                      )}
                    </div>
                  ) : null;
                })()}

                {/* Friends section */}
                {(() => {
                  const allVoters = expanded.options.flatMap((opt) =>
                    (expanded.stats[opt.id]?.voters ?? []).map((v) => ({
                      ...v,
                      optionText: opt.text,
                      isMyChoice: opt.id === expanded.myChoice,
                    }))
                  );
                  return allVoters.length > 0 ? (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Friends</div>
                      <div className="flex flex-col gap-2">
                        {allVoters.slice(0, 6).map((voter) => (
                          <div key={voter.userId} className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                              {voter.userName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-gray-800">{voter.userName}</span>
                              <span className="text-[10px] text-gray-400 ml-1">chose</span>
                              <span className={`text-[10px] ml-1 font-medium ${voter.isMyChoice ? "text-amber-600" : "text-gray-500"}`}>
                                {voter.optionText}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* All readers bar chart */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">All readers</div>
                  <div className="flex flex-col gap-2">
                    {expanded.options.map((opt, i) => {
                      const stats = expanded.stats[opt.id];
                      const pct = stats?.percentage ?? 0;
                      return (
                        <div key={opt.id}>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                            <span>{opt.text}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: i * 0.1 }}
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
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
