"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import BottomNav from "@/components/nav/BottomNav";
import {
  getMyPlanet,
  getMyBooks,
  getMyHighlights,
  getChoices,
  getReadingProfile,
  type PlanetData,
  type ReadingProgress,
  type Highlight,
  type Choice,
  type ReadingProfile,
} from "@/lib/api";

export default function MyPlanetDetailPage() {
  const router = useRouter();
  const [planet, setPlanet] = useState<PlanetData | null>(null);
  const [books, setBooks] = useState<ReadingProgress[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [profile, setProfile] = useState<ReadingProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "notes">("overview");

  useEffect(() => {
    getMyPlanet().then(setPlanet);
    getMyBooks().then(setBooks);
    getReadingProfile().then(setProfile);
    // Fetch highlights and choices for all books
    Promise.all([
      getMyHighlights("great-gatsby"),
      getMyHighlights("pride-prejudice"),
      getMyHighlights("frankenstein"),
    ]).then(([h1, h2, h3]) => {
      setHighlights([...(h1 || []), ...(h2 || []), ...(h3 || [])]);
    });
    Promise.all([
      getChoices("great-gatsby"),
      getChoices("pride-prejudice"),
      getChoices("frankenstein"),
    ]).then(([c1, c2, c3]) => {
      setChoices([...(c1 || []), ...(c2 || []), ...(c3 || [])]);
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
        <motion.img
          src={`/assets/${planet.planetImage || 'planet2.png'}`}
          alt="My Planet"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
          className="w-40 h-40 rounded-full object-cover shadow-[0_0_60px_rgba(245,158,11,0.3)]"
        />
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
            {/* My Highlights */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                My Highlights ({highlights.length})
              </h2>
              {highlights.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No highlights yet. Start reading and highlight passages!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {highlights.map((hl, i) => (
                    <motion.div
                      key={hl.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <div className="text-[10px] text-amber-500 mb-1 font-semibold">
                        {hl.bookId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} · Ch.{hl.chapterNum}
                      </div>
                      <div className="text-xs text-gray-300 italic leading-relaxed mb-2 border-l-2 border-amber-500/30 pl-2">
                        &ldquo;{hl.text.length > 120 ? hl.text.slice(0, 120) + "..." : hl.text}&rdquo;
                      </div>
                      {hl.comment && (
                        <div className="text-xs text-gray-400">
                          {hl.comment}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* My Choices */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                My Choices ({choices.filter((c) => c.myChoice).length})
              </h2>
              {choices.filter((c) => c.myChoice).length === 0 ? (
                <p className="text-xs text-gray-600 italic">No choices made yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {choices.filter((c) => c.myChoice).map((choice, i) => {
                    const myOption = choice.options.find((o) => o.id === choice.myChoice);
                    return (
                      <motion.div
                        key={choice.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white/5 rounded-xl p-3 border border-white/5"
                      >
                        <div className="text-[10px] text-amber-500 mb-1 font-semibold">
                          {choice.bookId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} · Ch.{choice.chapterNum}
                        </div>
                        <div className="text-xs text-gray-300 mb-1">
                          {choice.question}
                        </div>
                        <div className="text-xs text-amber-400 font-semibold">
                          → {myOption?.text || choice.myChoice}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reading Profile Summary */}
            {profile && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Reading Tendencies
                </h2>
                <div className="flex flex-col gap-2">
                  {profile.tendencies.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs font-bold flex-shrink-0">{t.percentage}%</span>
                      <span className="text-xs text-gray-400">{t.text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/profile"
                  className="block mt-3 text-center text-xs text-amber-500 font-semibold"
                >
                  View Full Profile →
                </Link>
              </div>
            )}
          </>
        ) : (
        <>
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
          {[
            { value: planet.booksRead, label: "Books" },
            { value: planet.totalNotes, label: "Notes" },
            { value: planet.totalChoices, label: "Choices" },
            { value: bestMatch, label: "Best Match" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-amber-400 font-bold text-xl">{s.value}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Genre tags */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Genres
          </h2>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(planet.genres).map(([genre, pct]) => (
              <span
                key={genre}
                className="text-[11px] px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400"
              >
                {genre} {pct}%
              </span>
            ))}
          </div>
        </div>

        {/* Reading Profile link */}
        <Link
          href="/profile"
          className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-colors"
        >
          <div>
            <div className="text-sm font-semibold text-white">My Reading Profile</div>
            <div className="text-xs text-gray-500 mt-0.5">Spectrum, archetypes & friend match</div>
          </div>
          <span className="text-amber-400 text-lg">→</span>
        </Link>

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
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${b.percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 + 0.2 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      />
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
