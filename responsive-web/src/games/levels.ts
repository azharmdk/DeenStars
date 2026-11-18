/**
 * Game levels (Enhancement 6a). Progression, not competition: levels and best times stay on this
 * device and are visible only to this family. No public scores, no ranking, no stars here.
 * Pure module (no imports) so it can be unit tested.
 */
export type Difficulty = "gentle" | "standard" | "challenge";

export interface QuizLevel {
  id: Difficulty;
  label: string;
  questions: number;
  /** Answer choices per question. More choices make it harder. */
  options: number;
}

export const QUIZ_LEVELS: QuizLevel[] = [
  { id: "gentle", label: "Gentle", questions: 4, options: 2 },
  { id: "standard", label: "Standard", questions: 6, options: 3 },
  { id: "challenge", label: "Challenge", questions: 8, options: 4 },
];

export interface MatchLevel {
  level: 1 | 2 | 3;
  label: string;
  pairs: number;
  /** Level 3 is the "new game" unlocked by a 7-day streak. */
  unlock: "start" | "previous" | "streak";
}

export const MATCH_LEVELS: MatchLevel[] = [
  { level: 1, label: "Level 1", pairs: 4, unlock: "start" },
  { level: 2, label: "Level 2", pairs: 6, unlock: "previous" },
  { level: 3, label: "Super Matching", pairs: 8, unlock: "streak" },
];

/** Days in a row that unlock Super Matching. */
export const UNLOCK_STREAK_DAYS = 7;

export function levelIndex(d: Difficulty): number {
  return Math.max(0, QUIZ_LEVELS.findIndex((l) => l.id === d));
}

/**
 * Highest quiz level a child may pick: their difficulty setting, or one past the highest level they
 * have finished, whichever is higher.
 */
export function unlockedQuizIndex(difficulty: Difficulty, highestFinished: number | null): number {
  const fromSetting = levelIndex(difficulty);
  const fromPlay = highestFinished === null ? -1 : highestFinished + 1;
  return Math.min(QUIZ_LEVELS.length - 1, Math.max(fromSetting, fromPlay));
}

/** Whether a matching level can be played. */
export function matchUnlocked(level: MatchLevel, highestFinished: number, longestDayRun: number): boolean {
  if (level.unlock === "start") return true;
  if (level.unlock === "previous") return highestFinished >= level.level - 1;
  return longestDayRun >= UNLOCK_STREAK_DAYS;
}

/** Keeps the faster time. */
export function betterTime(previous: number | null, now: number): number {
  return previous === null || now < previous ? now : previous;
}

export function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
