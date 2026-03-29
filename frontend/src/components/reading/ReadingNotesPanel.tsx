"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateBookReadingNotes,
  getBookReadingNotes,
  type ReadingNotes,
  type SavedReadingNote,
} from "@/lib/api";

interface Props {
  bookId: string;
  bookTitle: string;
  onClose: () => void;
}

export default function ReadingNotesPanel({ bookId, bookTitle, onClose }: Props) {
  const [saved, setSaved] = useState<SavedReadingNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    getBookReadingNotes(bookId).then((r) => {
      if (r) setSaved(r);
      setLoading(false);
    });
  }, [bookId]);

  const generate = async () => {
    setGenerating(true);
    const result = await generateBookReadingNotes(bookId);
    if (result) setSaved(result);
    setGenerating(false);
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base">📓</span>
            <div>
              <div className="text-sm font-semibold text-gray-900">Reading Notes</div>
              <div className="text-xs text-gray-400">{bookTitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="px-5 py-8 flex justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
              ))}
            </div>
          </div>
        ) : !saved ? (
          /* No notes yet */
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <GenerateButton generating={generating} onGenerate={generate} />
          </div>
        ) : (
          /* Notes exist */
          <div>
            <div className="px-5 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                Generated {new Date(saved.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                {saved.history.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-[10px] text-indigo-500 underline"
                  >
                    {showHistory ? "Hide history" : `History (${saved.history.length})`}
                  </button>
                )}
                <GenerateButton generating={generating} onGenerate={generate} small />
              </div>
            </div>

            {/* History */}
            <AnimatePresence>
              {showHistory && saved.history.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-3 flex flex-col gap-2">
                    {[...saved.history].reverse().map((h, i) => (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="text-[10px] text-gray-400 mb-1">
                          {new Date(h.generatedAt).toLocaleDateString()} version
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{h.notes.synthesis}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <NotesContent notes={saved.current} />
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateButton({ generating, onGenerate, small }: { generating: boolean; onGenerate: () => void; small?: boolean }) {
  return (
    <button
      onClick={onGenerate}
      disabled={generating}
      className={`${small ? "text-[10px] px-3 py-1" : "text-sm px-5 py-2.5"} bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 transition-opacity flex items-center gap-1.5`}
    >
      {generating ? (
        <>
          <span>Generating</span>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="inline-block w-1 h-1 rounded-full bg-white/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
            ))}
          </span>
        </>
      ) : small ? "Regenerate" : "Generate Reading Notes"}
    </button>
  );
}

function NotesContent({ notes }: { notes: ReadingNotes }) {
  return (
    <div className="divide-y divide-gray-50">
      {notes.shared_passages?.length > 0 && (
        <Section title="Shared Passages" emoji="🔀" subtitle="Same lines, different lenses">
          {notes.shared_passages.map((p, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <blockquote className="text-xs italic text-gray-600 border-l-2 border-amber-300 pl-3 mb-2 leading-relaxed">"{p.text}"</blockquote>
              <div className="space-y-1.5">
                <Chip color="amber" label="You" text={p.my_note || p.my_insight} />
                {p.friends?.map((f, j) => (
                  <Chip key={j} color="blue" label={f.name} text={f.note || f.insight} />
                ))}
              </div>
              {p.tension && (
                <p className="mt-2 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">{p.tension}</p>
              )}
            </div>
          ))}
        </Section>
      )}

      {notes.only_me?.length > 0 && (
        <Section title="Only You Noticed" emoji="✨" subtitle="Your unique observations">
          {notes.only_me.map((p, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <blockquote className="text-xs italic text-gray-600 border-l-2 border-amber-300 pl-3 mb-1.5 leading-relaxed">"{p.text}"</blockquote>
              <p className="text-xs text-gray-500 leading-relaxed">{p.why_unique}</p>
            </div>
          ))}
        </Section>
      )}

      {notes.only_friends?.length > 0 && (
        <Section title="What Friends Saw" emoji="👥" subtitle="Passages you skipped over">
          {notes.only_friends.map((p, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <blockquote className="text-xs italic text-gray-600 border-l-2 border-blue-300 pl-3 mb-1.5 leading-relaxed">"{p.text}"</blockquote>
              <div className="flex items-start gap-1.5">
                <span className="text-xs font-medium text-blue-600">{p.friend_name}:</span>
                <span className="text-xs text-gray-500">{p.note}</span>
              </div>
              {p.what_you_missed && <p className="mt-1 text-xs text-gray-400 italic">{p.what_you_missed}</p>}
            </div>
          ))}
        </Section>
      )}

      {notes.reader_styles && (
        <Section title="Reading Styles" emoji="🎭" subtitle="How each of you reads">
          <StyleCard label="You" text={notes.reader_styles.me} color="amber" />
          {notes.reader_styles.friends?.map((f, i) => (
            <StyleCard key={i} label={f.name} text={f.style} color="blue" />
          ))}
        </Section>
      )}

      {notes.synthesis && (
        <Section title="The Synthesis" emoji="💬" subtitle="">
          <p className="text-xs text-gray-600 leading-relaxed">{notes.synthesis}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, emoji, subtitle, children }: { title: string; emoji: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span>{emoji}</span>
        <span className="text-xs font-bold text-gray-800">{title}</span>
        {subtitle && <span className="text-xs text-gray-400">· {subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ color, label, text }: { color: "amber" | "blue"; label: string; text: string }) {
  const cls = color === "amber" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700";
  return (
    <div className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 ${cls}`}>
      <span className="text-[10px] font-bold shrink-0 mt-0.5">{label}</span>
      <span className="text-[11px] leading-relaxed">{text}</span>
    </div>
  );
}

function StyleCard({ label, text, color }: { label: string; text: string; color: "amber" | "blue" }) {
  const border = color === "amber" ? "border-amber-200" : "border-blue-200";
  const badge = color === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
  return (
    <div className={`mb-2 last:mb-0 rounded-xl border ${border} px-3 py-2.5`}>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
      <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}
