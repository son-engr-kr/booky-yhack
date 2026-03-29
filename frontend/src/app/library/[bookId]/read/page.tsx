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
  submitChoice,
  aiAuthorChat,
  aiGenerateQuestions,
  createHighlight,
  getMyHighlights,
  addHighlightReply,
  deleteHighlight,
  deleteHighlightReply,
  toggleHighlightLike,
  aiVoiceAsk,
  type Chapter,
  type Character,
  type Highlight,
  type Choice,
  type Book,
} from "@/lib/api";

// Character names to detect per book (extend as needed)
const BOOK_CHARACTERS: Record<string, string[]> = {
  "great-gatsby": [
    "Gatsby", "Nick", "Daisy", "Tom", "Jordan", "Myrtle", "Wilson", "Wolfshiem",
  ],
};

// Fallback questions if AI generation fails
const FALLBACK_QUESTIONS: string[] = [
  "What stood out to you most in this passage?",
  "How does this moment make you feel about the characters?",
  "What would you have done differently in this situation?",
];

function getCharacterNames(bookId: string): string[] {
  return BOOK_CHARACTERS[bookId] ?? [];
}

interface UserHighlight {
  id: string;
  text: string;
  color: string;
  bookId?: string;
  comment?: string;
  replies?: { id?: string; userId: string; userName: string; text: string; createdAt?: string }[];
  likes?: number;
  liked?: boolean;
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
  handleCharacterTap: (name: string) => void,
  onHighlightClick?: (hl: UserHighlight | Highlight) => void,
) {
  const segments = segmentText(paragraphText, characterNames, friendHighlights, userHighlights);
  return (
    <p key={paragraphIndex} className="mb-5 text-gray-800 font-serif text-base leading-loose">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.content}</span>;
        }
        if (seg.type === "character") {
          return <span key={i}>{seg.content}</span>;
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
              onClick={() => onHighlightClick?.(hl)}
            >
              <span
                style={{ borderBottom: `2px solid ${hl.color || "#60a5fa"}` }}
                className="bg-blue-50/60"
              >
                {seg.content}
              </span>
              <AnimatePresence>
                {hoveredHighlight?.id === hl.id && (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute bottom-full left-0 z-40 mb-1 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl min-w-[160px] max-w-[220px]"
                  >
                    <span className="block font-semibold text-amber-400 mb-1">{hl.userName}</span>
                    <span className="block leading-relaxed">{hl.comment}</span>
                  </motion.span>
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
              className="bg-amber-50/70 cursor-pointer hover:bg-amber-100/80 transition-colors"
              onClick={() => onHighlightClick?.(seg.highlight)}
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
  const initialPanel = searchParams.get("panel") as "notes" | "characters" | "chat" | null;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [book, setBook] = useState<Book | null>(null);
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
  const [aiMCQuestion, setAIMCQuestion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar | null>(null);
  const [highlightComment, setHighlightComment] = useState<{ text: string; x: number; y: number } | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [activePanel, setActivePanel] = useState<"notes" | "characters" | "chat" | null>(initialPanel);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [viewingHighlight, setViewingHighlight] = useState<(UserHighlight | Highlight) | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [voiceAsk, setVoiceAsk] = useState<{ passage: string; listening: boolean; question: string; answer: string; loading: boolean } | null>(null);
  const [showChapterChoice, setShowChapterChoice] = useState<Choice | null>(null);
  const [chapterChoiceDismissed, setChapterChoiceDismissed] = useState(false);
  const [submittingChoice, setSubmittingChoice] = useState(false);

  // Store selected text in a ref so it survives the re-render caused by setSelectionToolbar
  const selectedTextRef = useRef<string>("");

  // Swipe gesture — defined below after hasPageNext/hasPagePrev
  const touchStartX = useRef<number>(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setAIMCDismissed(false);
    setChapterChoiceDismissed(false);
    setShowChapterChoice(null);
    setSelectionToolbar(null);

    // Fast path: load chapter content without waiting for K2 character generation
    Promise.all([
      getChapter(bookId, chapterNum),
      getFriendHighlights(bookId, chapterNum),
      getChoices(bookId),
      getBook(bookId),
      getMyHighlights(bookId),
    ]).then(([ch, fh, ch2, bookData, myHl]) => {
      setChapter(ch);
      setBook(bookData);
      setFriendHighlights(Array.isArray(fh) ? fh : []);
      setChoices(Array.isArray(ch2) ? ch2 : []);
      setTotalChapters(bookData.totalChapters ?? 0);

      const savedHighlights: UserHighlight[] = (Array.isArray(myHl) ? myHl : [])
        .filter((h: Highlight) => h.chapterNum === chapterNum)
        .map((h: Highlight) => ({
          id: h.id,
          text: h.text,
          color: h.color || "#f59e0b",
          bookId: h.bookId,
          comment: h.comment,
          replies: h.replies ?? [],
          likes: h.likes ?? 0,
          liked: (h as Highlight & { likers?: string[] }).likers?.includes("me") ?? false,
        }));
      setUserHighlights(savedHighlights);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Slow path: K2 character generation loads in background
    getCharacters(bookId, chapterNum).then((charResp) => {
      const charList = Array.isArray(charResp)
        ? charResp
        : (charResp as { bookId?: string; characters?: Character[] }).characters ?? [];
      setCharacters(charList);
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
    // Ignore if the pointer event originated inside the toolbar
    if (toolbarRef.current?.contains(e.target as Node)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        // Only dismiss toolbar if there's truly no selection
        setSelectionToolbar(null);
        return;
      }
      const text = selection.toString().trim();
      if (!text || text.length < 3) {
        setSelectionToolbar(null);
        return;
      }
      // Store in ref immediately — this survives the upcoming re-render
      selectedTextRef.current = text;
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
    const text = selectedTextRef.current || selectionToolbar?.text;
    if (!text || !selectionToolbar) return;
    // Show comment input instead of saving immediately
    setHighlightComment({ text, x: selectionToolbar.x, y: selectionToolbar.y });
    setCommentInput("");
    setSelectionToolbar(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionToolbar]);

  const handleSaveHighlight = useCallback((withComment: boolean) => {
    if (!highlightComment) return;
    const note = withComment ? commentInput : undefined;
    setHighlightComment(null);
    setCommentInput("");
    selectedTextRef.current = "";
    const capturedText = highlightComment.text;
    createHighlight(bookId, chapterNum, capturedText, note).then((saved) => {
      const newHighlight: UserHighlight = {
        id: saved?.id ?? `user-${Date.now()}`,
        text: capturedText,
        color: saved?.color ?? "#f59e0b",
        bookId,
        comment: note || saved?.comment || "",
        replies: saved?.replies ?? [],
        likes: saved?.likes ?? 0,
        liked: false,
      };
      setUserHighlights((prev) => [...prev, newHighlight]);
    });
  }, [highlightComment, commentInput, bookId, chapterNum]);

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

  // Pagination: group paragraphs into pages sized for one screen (no scroll)
  const CHARS_PER_PAGE = 900;
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

  // Swipe gesture for page turning
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && hasPageNext) {
      setPageIndex((p) => p + 1);
    } else if (dx > 0 && hasPagePrev) {
      setPageIndex((p) => p - 1);
    }
  }, [hasPageNext, hasPagePrev]);

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
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-900 font-serif truncate max-w-[120px]">
              {chapter.title}
            </div>
            <div className="text-[10px] text-gray-500">
              Chapter {chapterNum}{totalChapters > 0 ? ` of ${totalChapters}` : ""}
              {totalPages > 1 && <span className="ml-1">· p.{pageIndex + 1}/{totalPages}</span>}
            </div>
          </div>
          {/* Ship-window porthole */}
          <div className="w-6 h-6 rounded-full bg-[#0c0e1a] border-2 border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            <div className="w-1 h-1 rounded-full bg-white/60" />
          </div>
        </div>
        {/* Pill toggle for friend highlights */}
        <button
          onClick={() => setFriendHighlightsOn((v) => !v)}
          aria-label="Toggle friend highlights"
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors flex-shrink-0 ${
            friendHighlightsOn ? "bg-blue-500 border-blue-600" : "bg-gray-200 border-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              friendHighlightsOn ? "translate-x-6" : "translate-x-1"
            }`}
          />
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

      {/* Chapter text — paginated, no scroll */}
      <div
        ref={contentRef}
        className="flex-1 overflow-hidden px-5 pt-4 max-w-prose mx-auto w-full flex flex-col select-text"
        onPointerUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {pageIndex === 0 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 font-serif mb-1 flex-shrink-0">{chapter.title}</h1>
            <div className="text-xs text-gray-400 mb-4 font-sans flex-shrink-0">
              Chapter {chapterNum}{totalChapters > 0 ? ` of ${totalChapters}` : ""}
            </div>
          </>
        )}

        {/* Characters on this page */}
        {(() => {
          const pageText = paragraphs.join(" ");
          const found = characterNames.filter((name) => new RegExp(`\\b${name}\\b`).test(pageText));
          if (found.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
              {found.map((name) => (
                <button
                  key={name}
                  onClick={() => handleCharacterTap(name)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium hover:bg-amber-100 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          );
        })()}

        <div className="flex-1 relative">
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
                  handleCharacterTap,
                  setViewingHighlight,
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
          {hasPagePrev ? (
            <button
              onClick={() => setPageIndex((p) => p - 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              ← Prev
            </button>
          ) : chapterNum > 1 ? (
            <Link
              href={`/library/${bookId}/read?chapter=${chapterNum - 1}`}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              ← Ch.{chapterNum - 1}
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-gray-300">← Prev</span>
          )}
          <div className="text-xs text-gray-400">
            {totalPages > 1 ? `${pageIndex + 1} / ${totalPages}` : ""}
          </div>
          {hasPageNext ? (
            <button
              onClick={() => {
                if (!aiMCDismissed && !showAIMCPopup) {
                  // Generate AI question from current page text
                  const pageText = paragraphs.slice(0, 3).join(" ").slice(0, 500);
                  setAIMCQuestion("");
                  setShowAIMCPopup(true);
                  aiGenerateQuestions(book?.title || bookId, book?.author || "", chapter?.title || "", pageText).then((res) => {
                    setAIMCQuestion(res?.questions?.[0] || FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)]);
                  });
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
            (() => {
              const chapterChoice = choices.find((c) => c.chapterNum === chapterNum);
              if (chapterChoice && !chapterChoice.myChoice && !chapterChoiceDismissed) {
                return (
                  <button
                    onClick={() => setShowChapterChoice(chapterChoice)}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-all animate-pulse"
                  >
                    ⚡ Choice Point
                  </button>
                );
              }
              return (
                <Link
                  href={`/library/${bookId}/read?chapter=${chapterNum + 1}`}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 shadow-sm transition-all"
                >
                  Next Chapter →
                </Link>
              );
            })()
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
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddHighlight();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <span>✦</span> Highlight
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const passage = selectedTextRef.current || selectionToolbar?.text || "";
                window.getSelection()?.removeAllRanges();
                setSelectionToolbar(null);
                selectedTextRef.current = "";
                setVoiceAsk({ passage, listening: true, question: "", answer: "", loading: false });
                // Start speech recognition
                const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                  setVoiceAsk((v) => v ? { ...v, listening: false, question: "(Speech recognition not supported)" } : v);
                  return;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recognition = new (SpeechRecognition as any)();
                recognition.lang = "en-US";
                recognition.interimResults = false;
                recognition.onresult = (event: any) => {
                  const transcript = event.results[0][0].transcript;
                  setVoiceAsk((v) => v ? { ...v, listening: false, question: transcript, loading: true } : v);
                  aiVoiceAsk(transcript, passage, book?.title || "", book?.author || "", chapterNum).then((res) => {
                    const answer = res?.answer || "Sorry, I couldn't generate an answer.";
                    setVoiceAsk((v) => v ? { ...v, loading: false, answer } : v);
                    // TTS
                    if ("speechSynthesis" in window) {
                      const utter = new SpeechSynthesisUtterance(answer);
                      utter.rate = 1.0;
                      utter.lang = "en-US";
                      window.speechSynthesis.speak(utter);
                    }
                  });
                };
                recognition.onerror = () => {
                  setVoiceAsk((v) => v ? { ...v, listening: false, question: "(Could not hear you. Try again.)" } : v);
                };
                recognition.start();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors cursor-pointer"
            >
              <span>🎤</span> Ask
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.getSelection()?.removeAllRanges();
                setSelectionToolbar(null);
                selectedTextRef.current = "";
              }}
              className="text-gray-400 hover:text-white text-xs px-1.5 py-1 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Ask Modal */}
      <AnimatePresence>
        {voiceAsk && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40"
              onClick={() => { setVoiceAsk(null); window.speechSynthesis?.cancel(); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="px-5 pt-5 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎤</span>
                    <span className="text-sm font-bold text-gray-900">Ask about this passage</span>
                  </div>
                  <button onClick={() => { setVoiceAsk(null); window.speechSynthesis?.cancel(); }} className="text-gray-400 text-lg">✕</button>
                </div>

                {/* Selected passage */}
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-3 py-2 mb-4">
                  <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">"{voiceAsk.passage}"</p>
                </div>

                {/* Listening state */}
                {voiceAsk.listening && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <motion.div
                      className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-2xl text-white">🎤</span>
                    </motion.div>
                    <p className="text-sm text-gray-500">Listening... Ask your question</p>
                  </div>
                )}

                {/* Question */}
                {voiceAsk.question && (
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Your question</p>
                    <p className="text-sm text-gray-800">{voiceAsk.question}</p>
                  </div>
                )}

                {/* Loading */}
                {voiceAsk.loading && (
                  <div className="flex items-center gap-2 py-4">
                    <motion.div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-indigo-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </motion.div>
                    <span className="text-xs text-gray-400">Gemini is thinking...</span>
                  </div>
                )}

                {/* Answer */}
                {voiceAsk.answer && (
                  <div className="bg-indigo-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase mb-1">Gemini</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{voiceAsk.answer}</p>
                  </div>
                )}

                {/* Ask again button */}
                {voiceAsk.answer && (
                  <button
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      const passage = voiceAsk.passage;
                      setVoiceAsk({ passage, listening: true, question: "", answer: "", loading: false });
                      const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
                      if (!SpeechRecognition) return;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recognition = new (SpeechRecognition as any)();
                      recognition.lang = "en-US";
                      recognition.interimResults = false;
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setVoiceAsk((v) => v ? { ...v, listening: false, question: transcript, loading: true } : v);
                        aiVoiceAsk(transcript, passage, book?.title || "", book?.author || "", chapterNum).then((res) => {
                          const answer = res?.answer || "Sorry, I couldn't generate an answer.";
                          setVoiceAsk((v) => v ? { ...v, loading: false, answer } : v);
                          if ("speechSynthesis" in window) {
                            const utter = new SpeechSynthesisUtterance(answer);
                            utter.rate = 1.0;
                            utter.lang = "en-US";
                            window.speechSynthesis.speak(utter);
                          }
                        });
                      };
                      recognition.onerror = () => {
                        setVoiceAsk((v) => v ? { ...v, listening: false, question: "(Could not hear you. Try again.)" } : v);
                      };
                      recognition.start();
                    }}
                    className="mt-4 w-full py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-400 transition-colors"
                  >
                    🎤 Ask another question
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detroit-style Chapter Choice Modal */}
      <AnimatePresence>
        {showChapterChoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60"
              onClick={() => { setShowChapterChoice(null); setChapterChoiceDismissed(true); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="px-5 pt-5 pb-8">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">⚡ Choice Point</span>
                  <span className="text-[10px] text-gray-400">Ch.{showChapterChoice.chapterNum}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{showChapterChoice.question}</h2>
                {showChapterChoice.context && (
                  <p className="text-xs text-gray-500 leading-relaxed mb-5 italic">{showChapterChoice.context}</p>
                )}

                {/* Options */}
                <div className="flex flex-col gap-3 mb-5">
                  {showChapterChoice.options.map((opt) => {
                    const stats = showChapterChoice.stats?.[opt.id];
                    const isMyChoice = showChapterChoice.myChoice === opt.id;
                    const hasVoted = !!showChapterChoice.myChoice;
                    return (
                      <button
                        key={opt.id}
                        disabled={submittingChoice || hasVoted}
                        onClick={() => {
                          setSubmittingChoice(true);
                          submitChoice(bookId, showChapterChoice.id, opt.id).then((res) => {
                            if (res) {
                              setShowChapterChoice((prev) => prev ? { ...prev, myChoice: opt.id, stats: res.stats as typeof prev.stats, totalVotes: res.totalVotes } : prev);
                              setChoices((prev) => prev.map((c) => c.id === showChapterChoice.id ? { ...c, myChoice: opt.id } : c));
                            }
                            setSubmittingChoice(false);
                          });
                        }}
                        className={`relative text-left rounded-2xl border-2 px-4 py-3.5 transition-all ${
                          isMyChoice
                            ? "border-indigo-500 bg-indigo-50"
                            : hasVoted
                            ? "border-gray-100 bg-gray-50 opacity-70"
                            : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                              {isMyChoice && <span className="text-indigo-500">✦</span>}
                              {opt.text}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
                          </div>
                          {hasVoted && stats && (
                            <span className="text-sm font-bold text-indigo-600 flex-shrink-0">{stats.percentage}%</span>
                          )}
                        </div>
                        {/* Progress bar after voting */}
                        {hasVoted && stats && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.percentage}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`absolute bottom-0 left-0 h-1 rounded-b-2xl ${isMyChoice ? "bg-indigo-400" : "bg-gray-200"}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Stats after voting */}
                {showChapterChoice.myChoice && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      {showChapterChoice.totalVotes || Object.values(showChapterChoice.stats || {}).reduce((s, v) => s + (v.count || v.voters?.length || 0), 0)} readers voted
                    </div>
                    {/* Friends' choices */}
                    {(() => {
                      const allVoters = Object.entries(showChapterChoice.stats || {}).flatMap(([optId, s]) =>
                        (s.voters || []).filter((v) => v.userId !== "me").map((v) => ({ ...v, optId }))
                      );
                      if (allVoters.length === 0) return null;
                      return (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1.5">Friends</div>
                          <div className="flex flex-wrap gap-2">
                            {allVoters.map((v) => {
                              const optLabel = showChapterChoice.options.find((o) => o.id === v.optId)?.text || v.optId;
                              return (
                                <div key={v.userId} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                                  <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                                    {v.userName?.[0] || "?"}
                                  </div>
                                  <span className="text-[11px] text-gray-700">{v.userName?.split(" ")[0]}</span>
                                  <span className={`text-[10px] font-bold ${v.optId === showChapterChoice.myChoice ? "text-indigo-500" : "text-gray-400"}`}>{optLabel}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                {/* Continue button after voting */}
                {showChapterChoice.myChoice && (
                  <Link
                    href={`/library/${bookId}/read?chapter=${chapterNum + 1}`}
                    className="block w-full text-center py-3 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-500 transition-colors"
                    onClick={() => setShowChapterChoice(null)}
                  >
                    Continue to Chapter {chapterNum + 1} →
                  </Link>
                )}

                {/* Skip */}
                {!showChapterChoice.myChoice && (
                  <button
                    onClick={() => { setShowChapterChoice(null); setChapterChoiceDismissed(true); }}
                    className="w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Highlight detail popup with comments */}
      <AnimatePresence>
        {viewingHighlight && (() => {
          // UserHighlight has optional bookId/comment/replies
          // Highlight (friend) has userId/userName/bookId/comment/replies
          const isFriendHl = "userName" in viewingHighlight;
          const hlBookId = viewingHighlight.bookId ?? bookId;
          const hlComment = viewingHighlight.comment ?? (isFriendHl ? (viewingHighlight as Highlight).comment : undefined);
          const hlReplies = viewingHighlight.replies ?? [];
          const hlUserName = isFriendHl ? (viewingHighlight as Highlight).userName : "Me";
          const hlUserId = isFriendHl ? (viewingHighlight as Highlight).userId : "me";

          const sendReply = () => {
            if (!replyInput.trim()) return;
            const text = replyInput.trim();
            setReplyInput("");
            addHighlightReply(hlBookId, viewingHighlight.id, text).then((reply) => {
              if (reply) {
                setViewingHighlight((prev) => {
                  if (!prev) return prev;
                  const updated = { ...prev, replies: [...(prev.replies ?? []), reply] };
                  // Keep userHighlights in sync so data persists after popup close/reopen
                  if (!("userName" in prev) || (prev as Highlight).userId === "me") {
                    setUserHighlights((hs) => hs.map((h) => h.id === prev.id ? { ...h, replies: updated.replies } : h));
                  }
                  return updated;
                });
              }
            });
          };

          const handleLike = () => {
            const hl = viewingHighlight as UserHighlight;
            const newLiked = !hl.liked;
            const newLikes = (hl.likes ?? 0) + (newLiked ? 1 : -1);
            setViewingHighlight((prev) => prev ? { ...prev, liked: newLiked, likes: newLikes } : prev);
            if (!isFriendHl) {
              setUserHighlights((prev) => prev.map((h) => h.id === viewingHighlight.id ? { ...h, liked: newLiked, likes: newLikes } : h));
            }
            toggleHighlightLike(hlBookId, viewingHighlight.id);
          };

          const handleDelete = () => {
            deleteHighlight(hlBookId, viewingHighlight.id).then((ok) => {
              if (ok) {
                setUserHighlights((prev) => prev.filter((h) => h.id !== viewingHighlight.id));
                setViewingHighlight(null);
                setReplyInput("");
              }
            });
          };

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/30"
                onClick={() => { setViewingHighlight(null); setReplyInput(""); }}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl px-4 pt-4 pb-6 max-w-prose mx-auto max-h-[70vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-500">
                    {hlUserId === "me" ? "My Highlight" : hlUserName}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Like button */}
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        (viewingHighlight as UserHighlight).liked
                          ? "bg-rose-50 border-rose-300 text-rose-500"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-400"
                      }`}
                    >
                      <span>{(viewingHighlight as UserHighlight).liked ? "♥" : "♡"}</span>
                      <span>{(viewingHighlight as UserHighlight).likes ?? 0}</span>
                    </button>
                    {/* Delete — only for own highlights */}
                    {hlUserId === "me" && (
                      <button
                        onClick={handleDelete}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors px-1.5 py-1"
                      >
                        🗑
                      </button>
                    )}
                    <button onClick={() => { setViewingHighlight(null); setReplyInput(""); }} className="text-gray-400 text-lg">✕</button>
                  </div>
                </div>

                {/* Highlighted text */}
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-3 py-2 mb-3 flex-shrink-0">
                  <p className="text-sm text-gray-700 italic">"{viewingHighlight.text}"</p>
                </div>

                {/* Note */}
                {hlComment && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Note</p>
                    <p className="text-sm text-gray-600">{hlComment}</p>
                  </div>
                )}

                {/* Replies */}
                <div className="flex-1 overflow-y-auto mb-3">
                  {hlReplies.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-400 font-semibold">Comments ({hlReplies.length})</p>
                      {hlReplies.map((r, ri) => (
                        <div key={r.id || ri} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                            {r.userName[0]}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-gray-700">{r.userName}</span>
                            <p className="text-sm text-gray-600">{r.text}</p>
                          </div>
                          {r.userId === "me" && r.id && (
                            <button
                              onClick={() => {
                                deleteHighlightReply(hlBookId, viewingHighlight.id, r.id!).then((ok) => {
                                  if (ok) {
                                    setViewingHighlight((prev) => {
                                      if (!prev) return prev;
                                      const updated = { ...prev, replies: (prev.replies ?? []).filter((_, j) => j !== ri) };
                                      if (!("userName" in prev) || (prev as Highlight).userId === "me") {
                                        setUserHighlights((hs) => hs.map((h) => h.id === prev.id ? { ...h, replies: updated.replies } : h));
                                      }
                                      return updated;
                                    });
                                  }
                                });
                              }}
                              className="text-[10px] text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">No comments yet</p>
                  )}
                </div>

                {/* Comment input */}
                <div className="flex gap-2 flex-shrink-0">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                    placeholder="Add a comment..."
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                  />
                  <button onClick={sendReply} className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors">
                    Send
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Highlight comment input */}
      <AnimatePresence>
        {highlightComment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30"
              onClick={() => { handleSaveHighlight(false); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl px-4 pt-4 pb-6 max-w-prose mx-auto"
            >
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-3 py-2 mb-3">
                <p className="text-sm text-gray-700 italic line-clamp-2">"{highlightComment.text}"</p>
              </div>
              <textarea
                autoFocus
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a note (optional)..."
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-amber-400 resize-none h-20 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveHighlight(false)}
                  className="flex-1 text-sm font-medium text-gray-500 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Save without note
                </button>
                <button
                  onClick={() => handleSaveHighlight(true)}
                  className="flex-1 text-sm font-semibold text-white py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors"
                >
                  Save with note
                </button>
              </div>
            </motion.div>
          </>
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
                question={aiMCQuestion || "Thinking..."}
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

      {/* Side panels */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setActivePanel(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[85%] max-w-sm bg-white shadow-2xl flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">
                  {activePanel === "notes" && "My Notes"}
                  {activePanel === "characters" && "Characters"}
                  {activePanel === "chat" && "Booky Chat"}
                </h2>
                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Notes panel */}
                {activePanel === "notes" && (
                  <div className="flex flex-col gap-3">
                    {userHighlights.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No highlights yet. Select text while reading to add highlights.</p>
                    ) : (
                      userHighlights.map((hl) => (
                        <div key={hl.id} className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-3 py-2">
                          <p className="text-sm text-gray-800 italic">"{hl.text}"</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Characters panel */}
                {activePanel === "characters" && (
                  <div className="flex flex-col gap-3">
                    {characters.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No characters found for this book.</p>
                    ) : (
                      characters.map((char) => (
                        <button
                          key={char.id}
                          onClick={() => { setSelectedCharacter(char); setActivePanel(null); }}
                          className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-left hover:bg-amber-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">
                            {char.role.includes("protagonist") ? "🧑" : char.role.includes("love") ? "💚" : "👤"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{char.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{char.role}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Chat panel */}
                {activePanel === "chat" && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col gap-3 mb-4">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-2xl mb-2">📚</div>
                          <p className="text-sm text-gray-500">Ask Booky anything about the book!</p>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-amber-500 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-400 animate-pulse">Thinking...</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              {activePanel === "chat" && (
                <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInput.trim() && !chatLoading) {
                        const msg = chatInput.trim();
                        setChatInput("");
                        const newMessages = [...chatMessages, { role: "user", content: msg }];
                        setChatMessages(newMessages);
                        setChatLoading(true);
                        aiAuthorChat(book?.title ?? "", book?.author ?? "", msg, newMessages)
                          .then((res) => {
                            if (res?.response) {
                              setChatMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
                            }
                          })
                          .finally(() => setChatLoading(false));
                      }
                    }}
                    placeholder="Ask about the book..."
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (!chatInput.trim() || chatLoading) return;
                      const msg = chatInput.trim();
                      setChatInput("");
                      const newMessages = [...chatMessages, { role: "user", content: msg }];
                      setChatMessages(newMessages);
                      setChatLoading(true);
                      aiAuthorChat(book?.title ?? "", book?.author ?? "", msg, newMessages)
                        .then((res) => {
                          if (res?.response) {
                            setChatMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
                          }
                        })
                        .finally(() => setChatLoading(false));
                    }}
                    className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
