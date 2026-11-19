export type AgeGroup = "3-4" | "5" | "6";
export type Difficulty = "gentle" | "standard" | "challenge";
export type Category = "dailyHabit" | "salah" | "quran" | "dua" | "manners" | "goodDeed" | "jummah";

export interface Child {
  id: string;
  nickname: string;
  avatarId: string;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  timeZone: string;
  birthYear: number;
  birthMonth: number;
  totals?: { stars?: number };
}

export interface Activity {
  id: string;
  title: { en: string };
  description: { en: string };
  educationalExplanation: { en: string };
  category: Category;
  ageEligibility: { ageGroups: AgeGroup[] };
  starRuleKey: string;
  verification: "self" | "parent";
  frequency: "daily" | "jummahOnly" | "ramadanOnly" | "eidOnly" | "weekly" | "once";
  together?: boolean;
  themeId?: string | null;
  isPlaceholder?: boolean;
  sortOrder: number;
}

export interface Completion {
  id: string;
  activityId: string;
  status: "done" | "pending" | "declined" | "expired";
  starsAwarded?: number;
  madeUpByParent?: boolean;
}

export interface Approval {
  id: string;
  childId: string;
  activityId: string;
  activityTitleSnapshot: { en: string };
  category?: Category;
  dayKey: string;
  status: "pending" | "approved" | "declined" | "expired";
  stars: number;
  requestedAt?: { toMillis(): number };
  expiresAt?: { toMillis(): number };
}

export interface Streak {
  activityId: string;
  current: number;
  lastDoneDayKey: string | null;
  activeThroughDayKey: string | null;
}

/** A streak is shown only while it is alive. Broken runs are never shown (product decision). */
export function isStreakActive(s: Streak | undefined, today: string): s is Streak {
  return !!s && s.current >= 2 && !!s.activeThroughDayKey && today <= s.activeThroughDayKey;
}

export const STREAK_CELEBRATIONS = [3, 5, 7, 10, 14, 21, 30, 40, 50, 75, 100];

export interface AudioRef {
  path: string;
  reciter: string;
}

export interface Dua {
  id: string;
  category: "sleep" | "wake" | "eating" | "bathroom" | "home" | "rabbana";
  title: string;
  arabic: string;
  translation: string;
  transliteration?: string | null;
  whenToRecite: string;
  repeat: number;
  audio?: AudioRef | null;
  quranRef?: string | null;
  highlightFromWord?: number | null;
  /** Short version shown by default when present (the long narration is hidden). */
  concise?: { arabic: string; translation: string } | null;
  /** Shown in an expandable section, for example what to say if you forgot at the start. */
  ifForgotten?: { label: string; arabic: string; translation: string } | null;
  source: { type: string; work?: string; itemId?: number; surahName?: string; surahNumber?: number; ayahStart?: number; translationSource?: string; transliterationSource?: string; hadithReferenceStatus?: string };
  reviewStatus: string;
  sortOrder: number;
}

export interface SurahAyah {
  ref: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  transliteration: string;
  audio?: AudioRef | null;
}

export interface Surah {
  id: string;
  surahNumber: number;
  nameArabic: string;
  nameTransliterated: string;
  meaning: string;
  ayahs: SurahAyah[];
  childrenRecitation?: AudioRef | null;
  /** Shown on its own line above ayah 1 (not for Al-Fatiha, where it is ayah 1). */
  bismillah?: { arabic: string; transliteration: string; translation: string } | null;
  source?: { translationSource?: string };
  reviewStatus: string;
  sortOrder: number;
}

export type AgeBand = "little" | "young";
export const AGE_BAND_LABEL: Record<AgeBand, string> = { little: "Little Learners (3-5)", young: "Young Explorers (6-8)" };
export function ageBandFor(child: { ageGroup: AgeGroup }): AgeBand {
  return child.ageGroup === "6" ? "young" : "little";
}

export interface Story {
  id: string;
  title: string;
  prophet: string;
  ageBand: AgeBand;
  /** Website groups the story appears under. Missing means ["prophets"]. Not an age filter. */
  categories?: string[];
  coverScene: string;
  scenes: { scene: string; refs: string[]; text: string }[];
  lesson: string;
  verse: {
    ref: string;
    intro: string;
    highlightFromWord?: number;
    surahName: string;
    ayahNumber: number;
    arabic: string;
    translation: string;
    transliteration: string;
    translationSource?: string;
    audio?: AudioRef | null;
  };
  /** Quran order for the verse panel. */
  refOrder?: string[];
  refVerses: Record<string, { surahName: string; ayahNumber: number; arabic: string; translation: string }>;
  sources: string[];
  reviewStatus: string;
  sortOrder: number;
}

export type LearnState = "notStarted" | "learning" | "practising" | "learned";
export const LEARN_LABEL: Record<LearnState, string> = {
  notStarted: "Not started",
  learning: "Learning",
  practising: "Practising",
  learned: "Learned",
};

export interface Theme {
  themeId: string;
  title: string;
  description: string;
  icon: string;
  activityIds: string[];
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  gentle: "Gentle",
  standard: "Standard",
  challenge: "Challenge",
};

/** Removes the "(sample)" suffix from placeholder titles for display; the test banner says it once. */
export function displayTitle(title: string): string {
  return title.replace(/\s*\(sample\)\s*$/i, "");
}

/** Website visitors without an account. Nothing is saved to the server for a guest. */
export const GUEST_ID = "guest";
export function isGuest(child: { id: string }): boolean {
  return child.id === GUEST_ID;
}
export function guestChild(ageGroup: AgeGroup): Child {
  // Guests start games at the Gentle level and unlock the next by playing (Enhancement 6a).
  return { id: GUEST_ID, nickname: "little one", avatarId: "", ageGroup, difficulty: "gentle", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, birthYear: 0, birthMonth: 0 };
}