"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateBookReadingNotes,
  getBookReadingNotes,
  getChoices,
  type ReadingNotes,
  type SavedReadingNote,
  type Choice,
} from "@/lib/api";

interface Props {
  bookId: string;
  bookTitle: string;
  onClose: () => void;
}

export default function ReadingNotesPanel({ bookId, bookTitle, onClose }: Props) {
  const [saved, setSaved] = useState<SavedReadingNote | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getBookReadingNotes(bookId).then((r) => {
      if (r) setSaved(r);
      setLoading(false);
    });
    getChoices(bookId).then((c) => c && setChoices(c));
  }, [bookId]);

  const generate = async () => {
    setGenerating(true);
    const result = await generateBookReadingNotes(bookId);
    if (result) setSaved(result);
    setGenerating(false);
  };

  const notes = saved?.current;
  const myChoices = choices.filter((c) => c.myChoice);

  return (
    <div className="px-4 pb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-900">Reading Report</div>
            <div className="text-xs text-gray-400">{bookTitle}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <LoadingDots />
        ) : !notes ? (
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <GenerateButton generating={generating} onGenerate={generate} />
          </div>
        ) : (
          <div>
            <div className="px-5 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {new Date(saved!.updatedAt).toLocaleDateString()}
              </span>
              <GenerateButton generating={generating} onGenerate={generate} small />
            </div>

            <div className="divide-y divide-gray-50">
              {/* 1. My Summary */}
              <Section emoji="📖" title="My Reading">
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  {notes.my_summary || notes.synthesis || ""}
                </p>
              </Section>

              {/* 2. Friends' Summary */}
              {notes.friends_summary && (
                <Section emoji="👥" title="Friends' Reading">
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    {notes.friends_summary}
                  </p>
                </Section>
              )}

              {/* 3. Branch Choices */}
              {myChoices.length > 0 && (
                <Section emoji="⚡" title="Story Branches">
                  <div className="flex flex-col gap-4">
                    {myChoices.map((choice) => (
                      <BranchCard key={choice.id} choice={choice} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Synthesis */}
              {notes.synthesis && notes.my_summary && (
                <div className="px-5 py-4 bg-amber-50/50">
                  <p className="text-xs text-amber-800 leading-relaxed italic">
                    {notes.synthesis}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BranchCard({ choice }: { choice: Choice }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-3 py-2.5 bg-gray-50">
        <div className="text-[10px] text-indigo-500 font-bold mb-0.5">Ch.{choice.chapterNum}</div>
        <div className="text-xs text-gray-800 font-medium leading-relaxed">{choice.question}</div>
      </div>
      <div className="px-3 py-2.5">
        <div className="flex flex-col gap-2">
          {choice.options.map((opt) => {
            const stats = choice.stats?.[opt.id];
            const pct = stats?.percentage || 0;
            const isMine = opt.id === choice.myChoice;
            const voters = stats?.voters?.filter((v) => v.userId !== "me") || [];
            return (
              <div key={opt.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center w-4 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${isMine ? "bg-indigo-500" : "bg-gray-200"}`} />
                  <div className={`w-0.5 h-3 ${isMine ? "bg-indigo-300" : "bg-gray-100"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${isMine ? "text-indigo-600" : "text-gray-500"}`}>
                      {isMine && "✦ "}{opt.text}
                    </span>
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${isMine ? "bg-indigo-400" : "bg-gray-300"}`}
                    />
                  </div>
                  {voters.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {voters.slice(0, 4).map((v) => (
                        <span key={v.userId} className="text-[9px] text-gray-400">{v.userName?.split(" ")[0]}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span>{emoji}</span>
        <span className="text-xs font-bold text-gray-800">{title}</span>
      </div>
      {children}
    </div>
  );
}

function GenerateButton({ generating, onGenerate, small }: { generating: boolean; onGenerate: () => void; small?: boolean }) {
  return (
    <button
      onClick={onGenerate}
      disabled={generating}
      className={`${small ? "text-[10px] px-3 py-1" : "text-sm px-5 py-2.5"} bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 transition-opacity`}
    >
      {generating ? "Generating..." : small ? "Regenerate" : "Generate Report"}
    </button>
  );
}

function LoadingDots() {
  return (
    <div className="px-5 py-8 flex justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
        ))}
      </div>
    </div>
  );
}
