"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import CharacterPopup from "@/components/reading/CharacterPopup";
import AIMCCard from "@/components/reading/AIMCCard";
import {
  getChapter,
  getBook,
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

interface UserHighlight {
  id: string;
  text: string;
  color: string;
}

type TextSegment =
  | { type: "text"; content: string }
  | { type: "character"; content: string }
  | { type: "friendHighlight"; content: string; highlight: Highlight }
  | { type: "userHighlight"; content: string; highlight: UserHighlight };

function segmentText(
  text: string,
  characterNames: string[],
  friendHighlights: Highlight[],
  userHighlights: UserHighlight[]
): TextSegment[] {
  if (!text) return [];

  type Range = {
    start: number;
    end: number;
    kind: "character" | "friendHighlight" | "userHighlight";
    name?: string;
    highlight?: Highlight;
    userHighlight?: UserHighlight;
  };

  const ranges: Range[] = [];

  for (const name of characterNames) {
    const regex = new RegExp(`\\b${name}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + name.length, kind: "character", name });
    }
  }

  for (const hl of friendHighlights) {
    const idx = text.indexOf(hl.text);
    if (idx !== -1) {
      ranges.push({ start: idx, end: idx + hl.text.length, kind: "friendHighlight", highlight: hl });
    }
  }

  for (const hl of userHighlights) {
    const idx = text.indexOf(hl.text);
    if (idx !== -1) {
      ranges.push({ start: idx, end: idx + hl.text.length, kind: "userHighlight", userHighlight: hl });
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  const clean: Range[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start >= cursor) {
      clean.push(r);
      cursor = r.end;
    }
  }

  const segments: TextSegment[] = [];
  let pos = 0;
  for (const r of clean) {
    if (pos < r.start) {
      segments.push({ type: "text", content: text.slice(pos, r.start) });
    }
    if (r.kind === "character") {
      segments.push({ type: "character", content: text.slice(r.start, r.end) });
    } else if (r.kind === "friendHighlight" && r.highlight) {
      segments.push({ type: "friendHighlight", content: text.slice(r.start, r.end), highlight: r.highlight });
    } else if (r.kind === "userHighlight" && r.userHighlight) {
      segments.push({ type: "userHighlight", content: text.slice(r.start, r.end), highlight: r.userHighlight });
    }
    pos = r.end;
  }
  if (pos < text.length) {
    segments.push({ type: "text", content: text.slice(pos) });
  }
  return segments;
}

function renderParagraph(
  paragraphText: string,
  paragraphIndex: number,
  characterNames: string[],
  friendHighlights: Highlight[],
  userHighlights: UserHighlight[],
  hoveredHighlight: Highlight | null,
  setHoveredHighlight: (h: Highlight | null) => void,
  handleCharacterTap: (name: string) => void
) {
  const segments = segmentText(paragraphText, characterNames, friendHighlights, userHighlights);
  return (
    <p key={paragraphIndex} className="mb-5 text-gray-800 font-serif text-base leading-loose">
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
        if (seg.type === "friendHighlight") {
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
        if (seg.type === "userHighlight") {
          return (
            <span
              key={i}
              style={{ borderBottom: "2px solid #f59e0b" }}
              className="bg-amber-50/70"
            >
              {seg.content}
            </span>
          );
        }
        return null;
      })}
    </p>
  );
}

interface SelectionToolbar {
  x: number;
  y: number;
  text: string;
}

export default function ReadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookId = params.bookId as string;
  const chapterNum = parseInt(searchParams.get("chapter") ?? "1", 10);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [totalChapters, setTotalChapters] = useState<number>(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [friendHighlights, setFriendHighlights] = useState<Highlight[]>([]);
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [friendHighlightsOn, setFriendHighlightsOn] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<Highlight | null>(null);
  const [aiMCDismissed, setAIMCDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setAIMCDismissed(false);
    setSelectionToolbar(null);

    Promise.all([
      getChapter(bookId, chapterNum),
      getCharacters(bookId),
      getFriendHighlights(bookId, chapterNum),
      getChoices(bookId),
      getBook(bookId),
    ]).then(([ch, charResp, fh, ch2, book]) => {
      setChapter(ch);

      // Bug 1 fix: API may return {bookId, characters:[...]} or a plain array
      const charList = Array.isArray(charResp)
        ? charResp
        : (charResp as { bookId?: string; characters?: Character[] }).characters ?? [];
      setCharacters(charList);

      setFriendHighlights(Array.isArray(fh) ? fh : []);
      setChoices(Array.isArray(ch2) ? ch2 : []);
      setTotalChapters(book.totalChapters ?? 0);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [bookId, chapterNum]);

  // Scroll to top when chapter changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chapterNum]);

  const characterNames = getCharacterNames(bookId);
  const activeHighlights = friendHighlightsOn ? friendHighlights : [];

  const handleCharacterTap = useCallback((name: string) => {
    const char = characters.find((c) => c.name === name);
    if (char) setSelectedCharacter(char);
  }, [characters]);

  // Text selection handler for highlight toolbar
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }
    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      setSelectionToolbar(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionToolbar({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 10,
      text,
    });
  }, []);

  const handleAddHighlight = useCallback(() => {
    if (!selectionToolbar) return;
    const newHighlight: UserHighlight = {
      id: `user-${Date.now()}`,
      text: selectionToolbar.text,
      color: "#f59e0b",
    };
    setUserHighlights((prev) => [...prev, newHighlight]);
    window.getSelection()?.removeAllRanges();
    setSelectionToolbar(null);
  }, [selectionToolbar]);

  const handleAnswer = (_answer: string) => {
    // answer is shown inline in AIMCCard
  };

  const handleSkipAIMC = () => {
    setAIMCDismissed(true);
  };

  // Split chapter text into paragraphs
  const paragraphs = chapter?.text
    ? chapter.text.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  const hasPrev = chapterNum > 1;
  const hasNext = totalChapters === 0 || chapterNum < totalChapters;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-amber-600 text-sm animate-pulse font-serif">Loading chapter...</div>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f8]" ref={topRef}>
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
          <div className="text-xs font-semibold text-gray-900 font-serif truncate max-w-[140px]">
            {chapter.title}
          </div>
          <div className="text-[10px] text-gray-500">
            Chapter {chapterNum}{totalChapters > 0 ? ` of ${totalChapters}` : ""}
          </div>
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

      {/* Progress bar */}
      {totalChapters > 0 && (
        <div className="h-1 bg-gray-200">
          <div
            className="h-1 bg-amber-400 transition-all duration-500"
            style={{ width: `${(chapterNum / totalChapters) * 100}%` }}
          />
        </div>
      )}

      {/* Chapter text */}
      <div
        ref={contentRef}
        className="px-5 pt-6 pb-4 max-w-prose mx-auto"
        onMouseUp={handleMouseUp}
      >
        <h1 className="text-2xl font-bold text-gray-900 font-serif mb-2">{chapter.title}</h1>
        <div className="text-xs text-gray-400 mb-6 font-sans">
          Chapter {chapterNum}{totalChapters > 0 ? ` of ${totalChapters}` : ""}
        </div>

        <div className="relative">
          {paragraphs.length > 0
            ? paragraphs.map((para, idx) =>
                renderParagraph(
                  para,
                  idx,
                  characterNames,
                  activeHighlights,
                  userHighlights,
                  hoveredHighlight,
                  setHoveredHighlight,
                  handleCharacterTap
                )
              )
            : (
              <p className="text-gray-500 italic font-serif text-sm">
                No text available for this chapter.
              </p>
            )}
        </div>
      </div>

      {/* Floating highlight toolbar */}
      <AnimatePresence>
        {selectionToolbar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 -translate-x-1/2 flex items-center gap-1 bg-gray-900 text-white rounded-xl px-2 py-1.5 shadow-xl"
            style={{
              left: selectionToolbar.x,
              top: selectionToolbar.y,
            }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddHighlight();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors"
            >
              <span>✦</span> Highlight
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                window.getSelection()?.removeAllRanges();
                setSelectionToolbar(null);
              }}
              className="text-gray-400 hover:text-white text-xs px-1.5 py-1 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI MC Card */}
      <AnimatePresence>
        {!aiMCDismissed && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="px-4 pb-4 max-w-prose mx-auto"
          >
            <AIMCCard
              question={getQuestion(bookId, chapterNum)}
              onAnswer={handleAnswer}
              onSkip={handleSkipAIMC}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter navigation */}
      <div className="px-4 pb-8 pt-2 max-w-prose mx-auto flex gap-3">
        {hasPrev ? (
          <Link
            href={`/library/${bookId}/read?chapter=${chapterNum - 1}`}
            className="flex-1 flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl px-5 py-4 shadow-sm transition-colors"
          >
            <span className="text-gray-400 text-lg">←</span>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-0.5">Previous</div>
              <div className="text-sm font-semibold">Chapter {chapterNum - 1}</div>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {hasNext && (
          <Link
            href={`/library/${bookId}/read?chapter=${chapterNum + 1}`}
            className="flex-1 flex items-center justify-between bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-5 py-4 shadow-sm transition-colors"
          >
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Next</div>
              <div className="text-sm font-semibold">Chapter {chapterNum + 1}</div>
            </div>
            <span className="text-gray-400 text-lg">→</span>
          </Link>
        )}
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
