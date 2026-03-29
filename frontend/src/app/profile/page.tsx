"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import {
  getFriends, getMyPlanet, getMyBooks, getMyReadingNotes, generateBookReadingNotes, updatePlanetName, generatePlanetImage,
  type Friend, type PlanetData, type ReadingProgress, type SavedReadingNote, type Book,
} from "@/lib/api";
import ReadingNotesPanel from "@/components/reading/ReadingNotesPanel";

const GENRE_COLORS = [
  "#f59e0b", "#6366f1", "#ec4899", "#10b981", "#3b82f6",
  "#f97316", "#8b5cf6", "#14b8a6", "#ef4444", "#84cc16",
];

function DonutChart({ genres }: { genres: Record<string, number> }) {
  const entries = Object.entries(genres).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = entries.map(([label, value], i) => {
    const pct = value / total;
    const dash = pct * circumference;
    const slice = { label, value, pct, dash, offset, color: GENRE_COLORS[i % GENRE_COLORS.length] };
    offset += dash;
    return slice;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={140} height={140} viewBox="0 0 140 140" className="flex-shrink-0">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={18} />
        {slices.map((s, i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={18}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset + circumference / 4}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${s.dash} ${circumference - s.dash}` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#374151" fontWeight="700">
          {entries.length}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={8} fill="#9ca3af">
          genres
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-gray-700 truncate flex-1">{s.label}</span>
            <span className="text-[11px] font-semibold text-gray-500 flex-shrink-0">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RADAR_AXES = ["Empathy", "Logic", "Adventure", "Caution", "Optimism"] as const;
const RADAR_COUNT = RADAR_AXES.length;

function radarPoints(values: number[], cx: number, cy: number, r: number): string {
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2;
      const dist = (v / 100) * r;
      return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
    })
    .join(" ");
}

function axisEndpoints(cx: number, cy: number, r: number) {
  return Array.from({ length: RADAR_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default function ProfilePage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [planet, setPlanet] = useState<PlanetData | null>(null);
  const [myBooks, setMyBooks] = useState<ReadingProgress[]>([]);
  const [readingNotes, setReadingNotes] = useState<SavedReadingNote[]>([]);
  const [generatable, setGeneratable] = useState<Book[]>([]);
  const [openNoteBookId, setOpenNoteBookId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [generatingPlanet, setGeneratingPlanet] = useState(false);

  useEffect(() => {
    getFriends().then(setFriends);
    getMyPlanet().then(setPlanet);
    getMyBooks().then((b) => setMyBooks(Array.isArray(b) ? b : []));
    getMyReadingNotes().then((r) => {
      if (r) {
        setReadingNotes(r.notes ?? []);
        setGeneratable(r.generatable ?? []);
      }
    });
  }, []);

  const handleGenerate = async (bookId: string) => {
    setGenerating(bookId);
    const result = await generateBookReadingNotes(bookId);
    if (result) {
      setReadingNotes((prev) => [...prev.filter((n) => n.bookId !== bookId), result]);
      setGeneratable((prev) => prev.filter((b) => b.id !== bookId));
    }
    setGenerating(null);
    setOpenNoteBookId(bookId);
  };

  if (!planet) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading your profile...</div>
      </div>
    );
  }

  const cx = 100;
  const cy = 100;
  const r = 70;
  const radarValues = RADAR_AXES.map((ax) => planet.radar?.[ax] ?? 0);
  const endpoints = axisEndpoints(cx, cy, r);

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 text-center">
        <div className="relative w-24 h-24 mx-auto mb-3 group">
          {generatingPlanet ? (
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
            </div>
          ) : (
            <img
              src={planet?.generatedPlanetImage || "/assets/planet2.png"}
              alt="Your planet"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
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
            className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 rounded-full w-7 h-7 flex items-center justify-center text-white shadow transition-colors disabled:opacity-50"
            title="Generate planet image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
        {editingName ? (
          <div className="flex items-center justify-center gap-2 mt-1">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = nameInput.trim();
                  if (trimmed) {
                    updatePlanetName(trimmed).then(() => {
                      setPlanet((prev) => prev ? { ...prev, name: trimmed } : prev);
                    });
                  }
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              onBlur={() => setEditingName(false)}
              className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-amber-400 outline-none text-center w-48"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <h1 className="text-xl font-bold text-gray-900">{planet?.name || "My Planet"}</h1>
            <button
              onClick={() => { setNameInput(planet?.name || ""); setEditingName(true); }}
              className="text-gray-400 hover:text-amber-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-0.5">Based on your choices across all books</p>
      </div>

      {/* 2x2 overview */}
      {(() => {
        const avgProgress = myBooks.length
          ? Math.round(myBooks.reduce((s, b) => s + b.percentage, 0) / myBooks.length)
          : 0;
        const stats = [
          { label: "books", value: planet?.booksRead ?? myBooks.length },
          { label: "notes", value: planet?.totalNotes ?? 0 },
          { label: "choices", value: planet?.totalChoices ?? 0 },
          { label: "progress", value: `${avgProgress}%` },
        ];
        return (
          <div className="px-4 mb-1">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 22, stiffness: 280 }}
                  className="bg-white/85 backdrop-blur-md rounded-2xl px-4 py-4 shadow-sm border border-white flex flex-col"
                >
                  <span className="text-2xl font-bold text-gray-900 leading-none">{s.value}</span>
                  <span className="text-xs text-gray-400 mt-1">{s.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="px-4 flex flex-col gap-5">
        {/* Spectrum sliders */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Reading Spectrum</h2>
          <div className="flex flex-col gap-4">
            {planet.spectrum.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{item.left}</span>
                  <span className="font-medium text-gray-600">{item.label}</span>
                  <span>{item.right}</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full">
                  <motion.div
                    initial={{ left: "50%" }}
                    animate={{ left: `${item.value}%` }}
                    transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                    className="absolute -top-0.5 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full shadow border-2 border-white"
                    style={{ left: `${item.value}%` }}
                  />
                  <div
                    className="absolute h-full bg-amber-200 rounded-full"
                    style={{
                      left: item.value < 50 ? `${item.value}%` : "50%",
                      width: `${Math.abs(item.value - 50)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Reader Archetype</h2>
          <div className="flex justify-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48">
              {/* Concentric grid rings */}
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={radarPoints(
                    Array(RADAR_COUNT).fill(scale * 100),
                    cx,
                    cy,
                    r
                  )}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}

              {/* Axis lines */}
              {endpoints.map((ep, i) => (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={ep.x}
                  y2={ep.y}
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}

              {/* Filled area */}
              <motion.polygon
                initial={{ points: radarPoints(Array(RADAR_COUNT).fill(0), cx, cy, r) }}
                animate={{ points: radarPoints(radarValues, cx, cy, r) }}
                transition={{ duration: 1, delay: 0.3 }}
                fill="rgba(217,119,6,0.15)"
                stroke="#d97706"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* Axis labels */}
              {endpoints.map((ep, i) => {
                const labelX = cx + (r + 14) * Math.cos((Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2);
                const labelY = cy + (r + 14) * Math.sin((Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2);
                return (
                  <text
                    key={i}
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={7}
                    fill="#6b7280"
                    fontWeight="600"
                  >
                    {RADAR_AXES[i]}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Genre breakdown */}
        {planet && Object.keys(planet.genres).length > 0 && (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Genre Breakdown</h2>
            <DonutChart genres={planet.genres} />
          </div>
        )}

        {/* Insights */}
        {planet.tendencies.length > 0 && (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Your Tendencies</h2>
            <div className="flex flex-col gap-3">
              {planet.tendencies.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm flex-shrink-0">
                    {i === 0 ? "💛" : i === 1 ? "🔍" : "🌟"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 leading-relaxed">{t.text}</p>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full w-32 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                        className="h-full bg-amber-400 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{t.percentage}% of the time</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friend comparison */}
        {planet.friendComparison.length > 0 && (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Friend Match</h2>
            <div className="flex flex-col gap-3">
              {planet.friendComparison.map((fc) => {
                const friend = friends.find((f) => f.id === fc.friendId);
                const matchColor =
                  fc.matchPercentage >= 80
                    ? "bg-amber-400"
                    : fc.matchPercentage >= 60
                    ? "bg-indigo-400"
                    : "bg-gray-300";
                return (
                  <div key={fc.friendId} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {friend?.planetImage ? (
                        <img
                          src={`/assets/${friend.planetImage}`}
                          alt={fc.friendName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        fc.friendName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800">{fc.friendName}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fc.matchPercentage}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${matchColor}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 w-8 text-right">
                          {fc.matchPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reading Notes section — only show if notes exist */}
      {readingNotes.length > 0 && (
        <div className="px-4 mt-1 flex flex-col gap-3 pb-4">
          <h2 className="text-sm font-bold text-gray-800 px-1">My Reading Notes</h2>
          {readingNotes.map((note) => (
            <div key={note.bookId}>
              {openNoteBookId === note.bookId ? (
                <ReadingNotesPanel
                  bookId={note.bookId}
                  bookTitle={note.bookTitle}
                  onClose={() => setOpenNoteBookId(null)}
                />
              ) : (
                <button
                  onClick={() => setOpenNoteBookId(note.bookId)}
                  className="w-full text-left bg-white/85 backdrop-blur-md rounded-2xl border border-white shadow-sm px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{note.bookTitle}</div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {note.current?.synthesis}
                      </p>
                    </div>
                    <div className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
