"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import CharacterPopup from "@/components/reading/CharacterPopup";
import AIMCCard from "@/components/reading/AIMCCard";
import {
  getChapter,
  getFriendHighlights,
  getCharacters,
  getChoices,
  type Chapter,
  type Character,
  type Highlight,
  type Choice,
} from "@/lib/api";

// Character names to detect per book (extend as needed)
const BOOK_CHARACTERS: Record<string, string[]> = {
  "great-gatsby": [
    "Gatsby", "Nick", "Daisy", "Tom", "Jordan", "Myrtle", "Wilson", "Wolfshiem",
  ],
};

// AI MC questions per chapter
const AI_QUESTIONS: Record<string, string[]> = {
  "great-gatsby": [
    "Why do you think Gatsby throws such extravagant parties without attending them himself?",
    "What does the green light across the bay symbolize to Gatsby — and to you?",
    "How does Fitzgerald use setting (East Egg vs West Egg) to comment on class?",
    "Is Gatsby's obsession with Daisy romantic or possessive? Where do you draw the line?",
    "What does Tom's behavior at the dinner table reveal about old money values?",
  ],
};

function getQuestion(bookId: string, chapterNum: number): string {
  const qs = AI_QUESTIONS[bookId] ?? AI_QUESTIONS["great-gatsby"];
  return qs[(chapterNum - 1) % qs.length];
}

function getCharacterNames(bookId: string): string[] {
  return BOOK_CHARACTERS[bookId] ?? [];
}

type TextSegment =
  | { type: "text"; content: string }
  | { type: "character"; content: string }
  | { type: "highlight"; content: string; highlight: Highlight };

function segmentText(
  text: string,
  characterNames: string[],
  highlights: Highlight[]
): TextSegment[] {
  if (!text) return [];

  // Build a flat list of ranges to annotate
  type Range = {
    start: number;
    end: number;
    kind: "character" | "highlight";
    name?: string;
    highlight?: Highlight;
  };

  const ranges: Range[] = [];

  // Find character name positions
  for (const name of characterNames) {
    const regex = new RegExp(`\\b${name}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + name.length, kind: "character", name });
    }
  }

  // Find friend highlight positions
  for (const hl of highlights) {
    const idx = text.indexOf(hl.text);
    if (idx !== -1) {
      ranges.push({ start: idx, end: idx + hl.text.length, kind: "highlight", highlight: hl });
    }
  }

  // Sort by start, remove overlaps (first wins)
  ranges.sort((a, b) => a.start - b.start);
  const clean: Range[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start >= cursor) {
      clean.push(r);
      cursor = r.end;
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let pos = 0;
  for (const r of clean) {
    if (pos < r.start) {
      segments.push({ type: "text", content: text.slice(pos, r.start) });
    }
    if (r.kind === "character") {
      segments.push({ type: "character", content: text.slice(r.start, r.end) });
    } else if (r.kind === "highlight" && r.highlight) {
      segments.push({ type: "highlight", content: text.slice(r.start, r.end), highlight: r.highlight });
    }
    pos = r.end;
  }
  if (pos < text.length) {
    segments.push({ type: "text", content: text.slice(pos) });
  }
  return segments;
}

export default function ReadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookId = params.bookId as string;
  const chapterNum = parseInt(searchParams.get("chapter") ?? "1", 10);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [friendHighlights, setFriendHighlights] = useState<Highlight[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [friendHighlightsOn, setFriendHighlightsOn] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<Highlight | null>(null);
  const [aiMCDismissed, setAIMCDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getChapter(bookId, chapterNum),
      getCharacters(bookId),
      getFriendHighlights(bookId, chapterNum),
      getChoices(bookId),
    ]).then(([ch, chars, fh, ch2]) => {
      setChapter(ch);
      setCharacters(chars);
      setFriendHighlights(fh);
      setChoices(ch2);
      setLoading(false);
    });
  }, [bookId, chapterNum]);

  const characterNames = getCharacterNames(bookId);
  const activeHighlights = friendHighlightsOn ? friendHighlights : [];
  const segments = chapter
    ? segmentText(chapter.text, characterNames, activeHighlights)
    : [];

  const handleCharacterTap = (name: string) => {
    const char = characters.find((c) => c.name === name);
    if (char) setSelectedCharacter(char);
  };

  const handleAnswer = (_answer: string) => {
    // answer is shown inline in AIMCCard
  };

  const handleSkipAIMC = () => {
    setAIMCDismissed(true);
  };

  const nextChapter = chapterNum + 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-amber-600 text-sm animate-pulse font-serif">Loading chapter...</div>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f8]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0f2f8]/95 backdrop-blur-sm border-b border-gray-200/60 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/library/${bookId}`}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-lg">←</span>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-900 font-serif">{chapter.title}</div>
          <div className="text-[10px] text-gray-500">Chapter {chapterNum}</div>
        </div>
        <button
          onClick={() => setFriendHighlightsOn((v) => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
            friendHighlightsOn
              ? "bg-blue-100 border-blue-300 text-blue-700"
              : "bg-white border-gray-200 text-gray-500"
          }`}
        >
          {friendHighlightsOn ? "Friends ON" : "Friends OFF"}
        </button>
      </div>

      {/* Chapter text */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 font-serif mb-6">{chapter.title}</h1>
        <div className="text-[15px] leading-8 text-gray-800 font-serif relative">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.content}</span>;
            }
            if (seg.type === "character") {
              return (
                <button
                  key={i}
                  onClick={() => handleCharacterTap(seg.content)}
                  className="text-amber-700 font-semibold bg-amber-100/70 px-0.5 rounded hover:bg-amber-200 transition-colors"
                >
                  {seg.content}
                </button>
              );
            }
            if (seg.type === "highlight") {
              const hl = seg.highlight;
              return (
                <span
                  key={i}
                  className="relative inline cursor-pointer"
                  onMouseEnter={() => setHoveredHighlight(hl)}
                  onMouseLeave={() => setHoveredHighlight(null)}
                  onTouchStart={() => setHoveredHighlight(hl)}
                >
                  <span
                    style={{ borderBottom: `2px solid ${hl.color || "#60a5fa"}` }}
                    className="bg-blue-50/60"
                  >
                    {seg.content}
                  </span>
                  <AnimatePresence>
                    {hoveredHighlight?.id === hl.id && (
                      <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full left-0 z-40 mb-1 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl min-w-[160px] max-w-[220px]"
                      >
                        <div className="font-semibold text-amber-400 mb-1">{hl.userName}</div>
                        <div className="leading-relaxed">{hl.comment}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* AI MC Card */}
      <AnimatePresence>
        {!aiMCDismissed && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="px-4 pb-4"
          >
            <AIMCCard
              question={getQuestion(bookId, chapterNum)}
              onAnswer={handleAnswer}
              onSkip={handleSkipAIMC}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue to next chapter */}
      <div className="px-4 pb-8 pt-2">
        <Link
          href={`/library/${bookId}/read?chapter=${nextChapter}`}
          className="flex items-center justify-between w-full bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-5 py-4 shadow-sm transition-colors"
        >
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Up Next</div>
            <div className="text-sm font-semibold">Chapter {nextChapter}</div>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>
      </div>

      {/* Character popup */}
      <AnimatePresence>
        {selectedCharacter && (
          <CharacterPopup
            character={selectedCharacter}
            currentChapter={chapterNum}
            onClose={() => setSelectedCharacter(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
