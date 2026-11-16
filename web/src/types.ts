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
  isPlaceholder?: boolean;
  sortOrder: number;
}

export interface Completion {
  id: string;
  activityId: string;
  status: "done" | "pending" | "declined";
  starsAwarded?: number;
}

export interface Approval {
  id: string;
  childId: string;
  activityId: string;
  activityTitleSnapshot: { en: string };
  dayKey: string;
  status: "pending" | "approved" | "declined";
  stars: number;
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
