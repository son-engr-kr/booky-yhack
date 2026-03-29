const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

async function fetcher<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      if (res.status !== 404) console.warn(`API ${res.status}: ${path}`);
      return null as T;
    }
    return res.json();
  } catch (e) {
    console.warn(`API fetch failed: ${path}`, e);
    return null as T;
  }
}

// Auth
export const getMe = () => fetcher<User>("/auth/");
export const getUsers = () => fetcher<User[]>("/auth/users");

// Books
export const listBooks = () => fetcher<Book[]>("/books/");
export const getBook = (id: string) => fetcher<Book>(`/books/${id}`);
export const getChapter = (bookId: string, num: number) =>
  fetcher<Chapter>(`/books/${bookId}/chapters/${num}`);
export const getCharacters = (bookId: string, chapter?: number) =>
  fetcher<Character[]>(`/books/${bookId}/characters${chapter ? `?chapter=${chapter}` : ""}`);

// Reading
export const getMyBooks = () => fetcher<ReadingProgress[]>("/reading/");
export const getProgress = (bookId: string) =>
  fetcher<ReadingProgress>(`/reading/${bookId}`);

// Highlights
export const getMyHighlights = (bookId: string) =>
  fetcher<Highlight[]>(`/highlights/${bookId}`);
export const getFriendHighlights = (bookId: string, chapter?: number) =>
  fetcher<Highlight[]>(`/highlights/${bookId}/friends${chapter != null ? `?chapter=${chapter}` : ""}`);

// Highlights - create & reply
export const createHighlight = (bookId: string, chapter: number, text: string, note?: string) =>
  postJson<Highlight>(`/highlights/${bookId}`, { chapter, text, note });
export const addHighlightReply = (bookId: string, highlightId: string, text: string) =>
  postJson<{ id: string; userId: string; userName: string; text: string; createdAt: string }>(`/highlights/${bookId}/${highlightId}/reply`, { text });
export const deleteHighlight = (bookId: string, highlightId: string) =>
  fetch(`${API_BASE}/highlights/${bookId}/${highlightId}`, { method: "DELETE" }).then((r) => r.ok);
export const toggleHighlightLike = (bookId: string, highlightId: string) =>
  postJson<{ likes: number; liked: boolean }>(`/highlights/${bookId}/${highlightId}/like`, {});

// Feed
export const getFeed = () => fetcher<FeedPost[]>("/feed/");

// Friends
export const getFriends = () => fetcher<Friend[]>("/friends/");
export const getFriend = (id: string) => fetcher<Friend>(`/friends/${id}`);
export const getFriendProgress = (id: string) =>
  fetcher<ReadingProgress[]>(`/friends/${id}/progress`);

// Choices
export const getChoices = (bookId: string) =>
  fetcher<Choice[]>(`/choices/${bookId}`);
export const getChoice = (bookId: string, choiceId: string) =>
  fetcher<Choice>(`/choices/${bookId}/${choiceId}`);
export const getReadingProfile = () =>
  fetcher<ReadingProfile>("/choices/profile");

// Planet
export const getMyPlanet = () => fetcher<PlanetData>("/planet/me");
export const updatePlanetName = (name: string) =>
  fetch(`${API_BASE}/planet/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => r.ok ? r.json() as Promise<{ name: string }> : null);
export const getFriendPlanets = () =>
  fetcher<FriendPlanet[]>("/planet/friends");
export const getConstellation = (bookId: string) =>
  fetcher<ConstellationData>(`/planet/constellation/${bookId}`);

// AI (K2 Think V2)
async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`API ${res.status}: ${path}`);
      return null as T;
    }
    return res.json();
  } catch (e) {
    console.warn(`API post failed: ${path}`, e);
    return null as T;
  }
}

export const aiGenerateQuestions = (bookTitle: string, author: string, chapterTitle: string, passage: string) =>
  postJson<{ questions: string[] }>("/ai/questions", { book_title: bookTitle, author, chapter_title: chapterTitle, passage });

export const aiAuthorChat = (bookTitle: string, author: string, message: string, history: { role: string; content: string }[] = []) =>
  postJson<{ response: string }>("/ai/author-chat", { book_title: bookTitle, author, message, history });

export const aiGenerateChoice = (bookTitle: string, author: string, chapterNum: number, context: string) =>
  postJson<{ question: string; context: string; options: { id: string; text: string; description: string }[] }>("/ai/choice", { book_title: bookTitle, author, chapter_num: chapterNum, context });

export const aiGenerateRecap = (bookTitle: string, author: string, chaptersSummary: string) =>
  postJson<{ panels: { panel: number; emoji: string; title: string; description: string }[] }>("/ai/recap", { book_title: bookTitle, author, chapters_summary: chaptersSummary });

export const aiSpoilerCheck = (text: string, bookTitle: string, readerChapter: number) =>
  postJson<{ is_spoiler: boolean; reason: string }>("/ai/spoiler-check", { text, book_title: bookTitle, reader_chapter: readerChapter });

export interface ReadingNotes {
  shared_passages: {
    text: string;
    my_note: string;
    my_insight: string;
    friends: { name: string; note: string; insight: string }[];
    tension: string;
  }[];
  only_me: { text: string; my_note: string; why_unique: string }[];
  only_friends: { text: string; friend_name: string; note: string; what_you_missed: string }[];
  reader_styles: { me: string; friends: { name: string; style: string }[] };
  synthesis: string;
}

// Reading Notes (persisted)
export interface SavedReadingNote {
  userId: string;
  bookId: string;
  bookTitle: string;
  author: string;
  current: ReadingNotes;
  history: { notes: ReadingNotes; generatedAt: string }[];
  updatedAt: string;
}

export const getMyReadingNotes = () =>
  fetcher<{ notes: SavedReadingNote[]; generatable: Book[] }>("/reading-notes/");

export const getBookReadingNotes = (bookId: string) =>
  fetcher<SavedReadingNote>(`/reading-notes/${bookId}`);

export const generateBookReadingNotes = (bookId: string) =>
  postJson<SavedReadingNote>(`/reading-notes/${bookId}/generate`, {});

// AI reading notes (direct, no persistence)
export const aiGenerateReadingNotes = (
  bookTitle: string,
  author: string,
  myHighlights: { text: string; comment?: string }[],
  friendHighlights: { text: string; userName?: string; comment?: string }[]
) =>
  postJson<ReadingNotes>("/ai/reading-notes", {
    book_title: bookTitle,
    author,
    my_highlights: myHighlights,
    friend_highlights: friendHighlights,
  });

// Comic recap
export const generateComic = (bookTitle: string, author: string, chaptersSummary: string) =>
  postJson<{ image: string | null; panels: { panel: number; title: string; description: string; image: string | null }[] }>("/comic/generate", { book_title: bookTitle, author, chapters_summary: chaptersSummary });

export const generateComicScenes = (bookTitle: string, author: string, chaptersSummary: string) =>
  postJson<{ panels: { panel: number; title: string; description: string; image_prompt: string }[] }>("/comic/scenes", { book_title: bookTitle, author, chapters_summary: chaptersSummary });

// Types
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  cover: string;
  totalChapters: number;
  description: string;
  year: number;
}

export interface Chapter {
  bookId: string;
  chapterNum: number;
  title: string;
  text: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  chapters: number[];
}

export interface ReadingProgress {
  userId: string;
  bookId: string;
  currentChapter: number;
  totalChapters: number;
  percentage: number;
  status: "reading" | "completed" | "not-started";
  notesCount: number;
  questionsAnswered: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  chapterNum: number;
  userId: string;
  userName: string;
  text: string;
  comment: string;
  color: string;
  likes: number;
  replies: { id?: string; userId: string; userName: string; text: string; createdAt?: string }[];
  createdAt: string;
}

export interface FeedPost {
  id: string;
  type: "highlight" | "story" | "completion";
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  chapterNum?: number;
  text: string;
  quote?: string;
  rating?: number;
  likes: number;
  comments: { userId: string; userName: string; text: string; createdAt: string }[];
  createdAt: string;
  isSpoiler: boolean;
  planetImage?: string;
}

export interface Friend {
  id: string;
  name: string;
  planetImage: string;
  planetStyle: string;
  level: number;
  booksRead: number;
  totalNotes: number;
  similarity: number;
  genres: Record<string, number>;
}

export interface Choice {
  id: string;
  bookId: string;
  chapterNum: number;
  question: string;
  context: string;
  options: { id: string; text: string; description: string }[];
  stats: Record<string, { percentage: number; voters: { userId: string; userName: string; comment: string }[] }>;
  myChoice: string;
}

export interface ReadingProfile {
  spectrum: { label: string; left: string; right: string; value: number }[];
  radar: Record<string, number>;
  tendencies: { text: string; percentage: number }[];
  friendComparison: { friendId: string; friendName: string; matchPercentage: number }[];
}

export interface PlanetData {
  id: string;
  name: string;
  planetImage: string;
  planetStyle: string;
  level: number;
  booksRead: number;
  totalNotes: number;
  totalChoices: number;
  genres: Record<string, number>;
  satellites: { bookId: string; bookTitle: string; status: string }[];
}

export interface FriendPlanet {
  id: string;
  name: string;
  planetImage: string;
  similarity: number;
  position: { x: number; y: number; z: number };
  latestFeed?: string;
}

export interface ConstellationData {
  bookId: string;
  readers: {
    userId: string;
    userName: string;
    similarity: number;
    position: { x: number; y: number };
    topHighlight?: string;
    choice?: string;
  }[];
  connections: { from: string; to: string; strength: number }[];
}
