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
  frequency: "daily" | "jummahOnly" | "weekly" | "once";
  together?: boolean;
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

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  gentle: "Gentle",
  standard: "Standard",
  challenge: "Challenge",
};

/** Removes the "(sample)" suffix from placeholder titles for display; the test banner says it once. */
export function displayTitle(title: string): string {
  return title.replace(/\s*\(sample\)\s*$/i, "");
}
