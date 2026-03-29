"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import ReadingNotesPanel from "@/components/reading/ReadingNotesPanel";
import {
  getMyPlanet,
  getMyBooks,
  getMyReadingNotes,
  getChoices,
  generatePlanetImage,
  type PlanetData,
  type ReadingProgress,
  type SavedReadingNote,
  type Choice,
} from "@/lib/api";

export default function MyPlanetDetailPage() {
  const router = useRouter();
  const [planet, setPlanet] = useState<PlanetData | null>(null);
  const [books, setBooks] = useState<ReadingProgress[]>([]);
  const [readingNotes, setReadingNotes] = useState<SavedReadingNote[]>([]);
  const [openNoteBookId, setOpenNoteBookId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "notes">("overview");
  const [generatingPlanet, setGeneratingPlanet] = useState(false);

  useEffect(() => {
    getMyPlanet().then(setPlanet);
    getMyBooks().then(setBooks);
    getMyReadingNotes().then((r) => {
      if (r) setReadingNotes(r.notes ?? []);
    });
    Promise.all([
      getChoices("great-gatsby"),
      getChoices("1984"),
      getChoices("pride-prejudice"),
      getChoices("frankenstein"),
      getChoices("dracula"),
      getChoices("alice-wonderland"),
      getChoices("romeo-juliet"),
      getChoices("sherlock-holmes"),
    ]).then((results) => {
      setChoices(results.flatMap((r) => r || []));
    });
  }, []);

  if (!planet) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-amber-500/50 text-sm animate-pulse">Loading planet...</div>
      </div>
    );
  }

  const topGenre = Object.keys(planet.genres)[0] ?? "Literature";
  const bestMatch = "91%";

  return (
    <div className="min-h-screen bg-[#050507] pb-24 overflow-y-auto">
      {/* Back button */}
      <button
        onClick={() => router.push("/planet")}
        className="absolute top-4 left-4 z-20 text-gray-400 text-sm flex items-center gap-1 hover:text-white transition-colors"
      >
        ← Back
      </button>

      {/* Planet image */}
      <div className="flex justify-center pt-16 pb-6">
        <div className="relative">
          {generatingPlanet ? (
            <div className="w-40 h-40 rounded-full bg-gray-800 border-2 border-amber-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.3)]">
              <div className="w-10 h-10 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
            </div>
          ) : (
            <motion.img
              src={planet.generatedPlanetImage || `/assets/${planet.planetImage || 'planet2.png'}`}
              alt="My Planet"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
              className="w-40 h-40 rounded-full object-cover shadow-[0_0_60px_rgba(245,158,11,0.3)]"
            />
          )}
          <button
            onClick={async () => {
              setGeneratingPlanet(true);
              const res = await generatePlanetImage();
              if (res?.success && res.image) {
                setPlanet((prev) => prev ? { ...prev, generatedPlanetImage: res.image } : prev);
              }
              setGeneratingPlanet(false);
            }}
            disabled={generatingPlanet}
            className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 rounded-full w-8 h-8 flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-50"
            title="Regenerate planet image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4 px-4">
        <h1 className="text-2xl font-bold text-white">My Planet</h1>
        <p className="text-sm text-gray-400 mt-1">
          {topGenre} explorer · Lv.{planet.level}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex mx-4 mb-4 bg-white/5 rounded-xl p-1 border border-white/10">
        {(["overview", "notes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? "bg-amber-500/20 text-amber-400"
                : "text-gray-500"
            }`}
          >
            {tab === "overview" ? "Overview" : "My Reading Notes"}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4">
        {activeTab === "notes" ? (
          <>
            {/* My Reading Notes */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                My Reading Notes ({readingNotes.length})
              </h2>
              {readingNotes.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No reading notes yet. Generate them from a book's detail page!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {readingNotes.map((note, i) => (
                    <div key={note.bookId}>
                      {openNoteBookId === note.bookId ? (
                        <ReadingNotesPanel
                          bookId={note.bookId}
                          bookTitle={note.bookTitle}
                          onClose={() => setOpenNoteBookId(null)}
                        />
                      ) : (
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setOpenNoteBookId(note.bookId)}
                          className="w-full text-left bg-white/5 rounded-xl p-3 border border-white/5 hover:border-amber-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-amber-500 mb-1 font-semibold">{note.bookTitle}</div>
                              <div className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                                {note.current?.synthesis}
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-600 flex-shrink-0">
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        ) : (
        <>
        {/* 2x2 Overview */}
        {(() => {
          const avgProgress = books.length
            ? Math.round(books.reduce((s, b) => s + b.percentage, 0) / books.length)
            : 0;
          const stats = [
            { value: planet.booksRead, label: "books" },
            { value: planet.totalNotes, label: "notes" },
            { value: planet.totalChoices, label: "choices" },
            { value: `${avgProgress}%`, label: "progress" },
          ];
          return (
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-2xl px-4 py-4 border border-white/10 text-center"
                >
                  <span className="text-2xl font-bold text-amber-400 leading-none block">{s.value}</span>
                  <span className="text-xs text-gray-500 block mt-1">{s.label}</span>
                </motion.div>
              ))}
            </div>
          );
        })()}

        {/* Genre Donut */}
        {Object.keys(planet.genres).length > 0 && (() => {
          const COLORS = ["#f59e0b", "#6366f1", "#ec4899", "#10b981", "#3b82f6", "#f97316", "#8b5cf6"];
          const entries = Object.entries(planet.genres).sort((a, b) => b[1] - a[1]);
          const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
          const r = 52, cx = 70, cy = 70;
          const circ = 2 * Math.PI * r;
          let offset = 0;
          const slices = entries.map(([label, value], i) => {
            const pct = value / total;
            const dash = pct * circ;
            const sl = { label, pct, dash, offset, color: COLORS[i % COLORS.length] };
            offset += dash;
            return sl;
          });
          return (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Genres</h2>
              <div className="flex items-center gap-4">
                <svg width={140} height={140} viewBox="0 0 140 140" className="flex-shrink-0">
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={18} />
                  {slices.map((s, i) => (
                    <motion.circle
                      key={i}
                      cx={cx} cy={cy} r={r}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={18}
                      strokeDasharray={`${s.dash} ${circ - s.dash}`}
                      strokeDashoffset={-s.offset + circ / 4}
                      strokeLinecap="butt"
                      initial={{ strokeDasharray: `0 ${circ}` }}
                      animate={{ strokeDasharray: `${s.dash} ${circ - s.dash}` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                    />
                  ))}
                  <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#fbbf24" fontWeight="700">{entries.length}</text>
                  <text x={cx} y={cy + 8} textAnchor="middle" fontSize={8} fill="#6b7280">genres</text>
                </svg>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {slices.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[11px] text-gray-300 truncate flex-1">{s.label}</span>
                      <span className="text-[11px] font-semibold text-gray-500 flex-shrink-0">{Math.round(s.pct * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Satellites / Books in progress */}
        {books.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Satellites — Currently Reading
            </h2>
            <div className="flex flex-col gap-4">
              {books
                .filter((b) => b.status === "reading")
                .map((b, i) => (
                  <motion.div
                    key={b.bookId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-medium truncate pr-2">
                        {planet.satellites.find((s) => s.bookId === b.bookId)?.bookTitle ??
                          b.bookId}
                      </span>
                      <span className="text-amber-400 flex-shrink-0">
                        {b.percentage}%
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-white/10 rounded-full overflow-visible">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${b.percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 + 0.2 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      />
                      <motion.span
                        initial={{ left: 0 }}
                        animate={{ left: `${b.percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 + 0.2 }}
                        className="absolute -top-2 -translate-x-1/2 text-[10px]"
                      >
                        🚀
                      </motion.span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      Ch. {b.currentChapter} / {b.totalChapters}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
