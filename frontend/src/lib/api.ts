const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

async function fetcher<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      console.warn(`API ${res.status}: ${path}`);
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
export const getCharacters = (bookId: string) =>
  fetcher<Character[]>(`/books/${bookId}/characters`);

// Reading
export const getMyBooks = () => fetcher<ReadingProgress[]>("/reading/");
export const getProgress = (bookId: string) =>
  fetcher<ReadingProgress>(`/reading/${bookId}`);

// Highlights
export const getMyHighlights = (bookId: string) =>
  fetcher<Highlight[]>(`/highlights/${bookId}`);
export const getFriendHighlights = (bookId: string, chapter: number) =>
  fetcher<Highlight[]>(`/highlights/${bookId}/friends?chapter=${chapter}`);

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
export const getFriendPlanets = () =>
  fetcher<FriendPlanet[]>("/planet/friends");
export const getConstellation = (bookId: string) =>
  fetcher<ConstellationData>(`/planet/constellation/${bookId}`);

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
  replies: { userId: string; userName: string; text: string }[];
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
