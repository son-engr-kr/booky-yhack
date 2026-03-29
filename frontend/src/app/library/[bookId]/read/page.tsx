"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
// BottomNav hidden during reading
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
  const [showAIMCPopup, setShowAIMCPopup] = useState(false);
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
    // Match by first name or full name (API has "Nick Carraway", text detects "Nick")
    const char = characters.find((c) =>
      c.name === name ||
      c.name.startsWith(name) ||
      c.name.split(" ")[0] === name ||
      c.name.toLowerCase().includes(name.toLowerCase())
    );
    if (char) {
      setSelectedCharacter(char);
    } else {
      // Create a basic character entry for display
      setSelectedCharacter({
        id: name.toLowerCase().replace(/\s/g, "-"),
        name,
        role: "character",
        description: `A character appearing in this chapter.`,
        chapters: [chapterNum],
      });
    }
  }, [characters, chapterNum]);

  // Text selection handler for highlight toolbar
  const toolbarRef = useRef<HTMLDivElement>(null);
  const handleMouseUp = useCallback((e: React.PointerEvent) => {
    // Ignore if clicking on the toolbar itself
    if (toolbarRef.current?.contains(e.target as Node)) return;

    setTimeout(() => {
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
        y: rect.top,
        text,
      });
    }, 10);
  }, []);

  const handleAddHighlight = useCallback(() => {
    if (!selectionToolbar) return;
    const text = selectionToolbar.text;
    const newHighlight: UserHighlight = {
      id: `user-${Date.now()}`,
      text,
      color: "#f59e0b",
    };
    setUserHighlights((prev) => [...prev, newHighlight]);
    setSelectionToolbar(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionToolbar]);

  const handleAnswer = (_answer: string) => {
    // answer is shown inline in AIMCCard
  };

  const handleSkipAIMC = () => {
    setAIMCDismissed(true);
  };

  // Split chapter text into paragraphs
  const allParagraphs = chapter?.text
    ? chapter.text.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  // Pagination: group paragraphs into pages of ~2000 chars
  const CHARS_PER_PAGE = 2000;
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentLen = 0;
  for (const para of allParagraphs) {
    if (currentLen + para.length > CHARS_PER_PAGE && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentLen = 0;
    }
    currentPage.push(para);
    currentLen += para.length;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  const [pageIndex, setPageIndex] = useState(0);

  // Reset page when chapter changes
  useEffect(() => {
    setPageIndex(0);
  }, [chapterNum]);

  const totalPages = pages.length;
  const paragraphs = pages[pageIndex] || [];
  const hasPagePrev = pageIndex > 0;
  const hasPageNext = pageIndex < totalPages - 1;

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
    <div className="fixed inset-0 bg-[#f0f2f8] flex flex-col overflow-hidden z-40" ref={topRef}>
      {/* Header */}
      <div className="flex-shrink-0 z-30 bg-[#f0f2f8]/95 backdrop-blur-sm border-b border-gray-200/60 px-4 py-3 flex items-center justify-between">
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
            {totalPages > 1 && <span className="ml-1">· p.{pageIndex + 1}/{totalPages}</span>}
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

      {/* Chapter text — fixed height, no scroll */}
      <div
        ref={contentRef}
        className="flex-1 overflow-hidden px-5 pt-4 max-w-prose mx-auto w-full flex flex-col select-text"
        onPointerUp={handleMouseUp}
      >
        {pageIndex === 0 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 font-serif mb-1 flex-shrink-0">{chapter.title}</h1>
            <div className="text-xs text-gray-400 mb-4 font-sans flex-shrink-0">
              Chapter {chapterNum}{totalChapters > 0 ? ` of ${totalChapters}` : ""}
            </div>
          </>
        )}

        <div className="flex-1 overflow-hidden relative">
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

      {/* Page navigation — fixed at bottom */}
      <div className="flex-shrink-0 px-5 py-3 max-w-prose mx-auto w-full border-t border-gray-200 bg-[#f0f2f8]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPageIndex((p) => p - 1)}
            disabled={!hasPagePrev}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              hasPagePrev
                ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            ← Prev
          </button>
          <div className="text-xs text-gray-400">
            {totalPages > 1 ? `${pageIndex + 1} / ${totalPages}` : ""}
          </div>
          {hasPageNext ? (
            <button
              onClick={() => {
                if (!aiMCDismissed && !showAIMCPopup) {
                  setShowAIMCPopup(true);
                } else {
                  setPageIndex((p) => p + 1);
                  setShowAIMCPopup(false);
                  setAIMCDismissed(false);
                }
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 shadow-sm transition-all"
            >
              Next →
            </button>
          ) : hasNext ? (
            <Link
              href={`/library/${bookId}/read?chapter=${chapterNum + 1}`}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 shadow-sm transition-all"
            >
              Next Chapter →
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-gray-300">End</span>
          )}
        </div>
      </div>

      {/* Floating highlight toolbar */}
      <AnimatePresence>
        {selectionToolbar && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.15 }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            className="fixed z-[60] -translate-x-1/2 -translate-y-full flex items-center gap-1 bg-gray-900 text-white rounded-xl px-2 py-1.5 shadow-xl"
            style={{
              left: Math.min(Math.max(selectionToolbar.x, 60), window.innerWidth - 60),
              top: selectionToolbar.y - 8,
            }}
          >
            <button
              onClick={() => handleAddHighlight()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <span>✦</span> Highlight
            </button>
            <button
              onClick={() => {
                window.getSelection()?.removeAllRanges();
                setSelectionToolbar(null);
              }}
              className="text-gray-400 hover:text-white text-xs px-1.5 py-1 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booky AI MC Popup — triggered on Next tap */}
      <AnimatePresence>
        {showAIMCPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowAIMCPopup(false);
                setAIMCDismissed(true);
                setPageIndex((p) => Math.min(p + 1, totalPages - 1));
              }}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 max-w-prose mx-auto"
            >
              <AIMCCard
                question={getQuestion(bookId, chapterNum)}
                onAnswer={(answer) => {
                  handleAnswer(answer);
                  setTimeout(() => {
                    setShowAIMCPopup(false);
                    setAIMCDismissed(true);
                    setPageIndex((p) => Math.min(p + 1, totalPages - 1));
                  }, 1500);
                }}
                onSkip={() => {
                  setShowAIMCPopup(false);
                  setAIMCDismissed(true);
                  setPageIndex((p) => Math.min(p + 1, totalPages - 1));
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

    </div>
  );
}
