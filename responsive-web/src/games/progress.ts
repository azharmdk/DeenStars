/**
 * Play & Learn progress: player level, Today's Islamic Challenge and its streak.
 * Pure module so it can be unit tested. Stored on this device only (see usePlayProgress).
 *
 * Rules (docs/GAME_ENGINE.md, product rules):
 * - Levels grow with completion, never shrink. Nothing is deducted.
 * - The streak shows an active run only. A run that has ended is not shown.
 * - A missed day has no failure state.
 */
import { addDays } from "../time";
import { GameId, dailyPool } from "./catalog";

/** Completed games needed to reach each player level. The last one is "Expert". */
export const PLAYER_LEVELS: { label: string; min: number }[] = [
  { label: "Level 1", min: 0 },
  { label: "Level 2", min: 3 },
  { label: "Level 3", min: 8 },
  { label: "Level 4", min: 15 },
  { label: "Expert", min: 25 },
];

export interface PlayerLevel {
  index: number;
  label: string;
  /** Games still to finish for the next level, or null at Expert. */
  toNext: number | null;
  nextLabel: string | null;
  /** 0 to 1 progress inside the current level. */
  fraction: number;
}

export function playerLevel(totalCompleted: number): PlayerLevel {
  const total = Math.max(0, Math.floor(totalCompleted));
  let index = 0;
  PLAYER_LEVELS.forEach((l, i) => {
    if (total >= l.min) index = i;
  });
  const next = PLAYER_LEVELS[index + 1];
  const cur = PLAYER_LEVELS[index];
  return {
    index,
    label: cur.label,
    toNext: next ? next.min - total : null,
    nextLabel: next ? next.label : null,
    fraction: next ? (total - cur.min) / (next.min - cur.min) : 1,
  };
}

export interface PlayProgress {
  v: 1;
  /** Completed rounds per game id. */
  completions: Partial<Record<GameId, number>>;
  /** Highest Find the Mosque level index finished (-1 when none). */
  mosqueFinished: number;
  /** Daily challenge days finished. "onTime" counts for the streak; "later" is an archive replay. */
  daily: Record<string, "onTime" | "later">;
}

export const emptyProgress = (): PlayProgress => ({ v: 1, completions: {}, mosqueFinished: -1, daily: {} });

export function totalCompleted(p: PlayProgress): number {
  return Object.values(p.completions).reduce<number>((n, v) => n + (v ?? 0), 0);
}

/** Reads saved JSON defensively. Anything unexpected becomes empty progress. */
export function parseProgress(raw: string | null): PlayProgress {
  if (!raw) return emptyProgress();
  try {
    const v = JSON.parse(raw) as Partial<PlayProgress>;
    if (!v || v.v !== 1 || typeof v.completions !== "object" || typeof v.daily !== "object") return emptyProgress();
    return {
      v: 1,
      completions: v.completions ?? {},
      mosqueFinished: typeof v.mosqueFinished === "number" ? v.mosqueFinished : -1,
      daily: v.daily ?? {},
    };
  } catch {
    return emptyProgress();
  }
}

export function withCompletion(p: PlayProgress, game: GameId, opts: { mosqueLevel?: number; dailyDay?: string; today?: string } = {}): PlayProgress {
  const next: PlayProgress = { ...p, completions: { ...p.completions, [game]: (p.completions[game] ?? 0) + 1 }, daily: { ...p.daily } };
  if (game === "find-the-mosque" && typeof opts.mosqueLevel === "number") next.mosqueFinished = Math.max(p.mosqueFinished, opts.mosqueLevel);
  if (opts.dailyDay) {
    const kind = opts.dailyDay === opts.today ? "onTime" : "later";
    // An on-time finish is never downgraded by a later replay.
    if (next.daily[opts.dailyDay] !== "onTime") next.daily[opts.dailyDay] = kind;
  }
  return next;
}

// ---------- Today's Islamic Challenge ----------

/** Whole days since 2024-01-01 for a "YYYY-MM-DD" key. Stable in every time zone. */
export function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2024, 0, 1)) / 86_400_000);
}

/** The featured game for a day. Same answer for everyone on the same day, no server needed. */
export function dailyGameFor(dayKey: string): GameId {
  const pool = dailyPool();
  const n = ((dayNumber(dayKey) % pool.length) + pool.length) % pool.length;
  return pool[n];
}

/**
 * Current run of on-time challenge days. Counts back from today, or from yesterday when today is not
 * done yet, so the run stays visible all day. Returns 0 when there is no active run (nothing is
 * shown for 0, so a finished run is never displayed as broken).
 */
export function dailyStreak(daily: PlayProgress["daily"], today: string): number {
  let day = daily[today] === "onTime" ? today : addDays(today, -1);
  let run = 0;
  while (daily[day] === "onTime") {
    run++;
    day = addDays(day, -1);
  }
  return run;
}

/** Past challenges, newest first, not including today. */
export function archiveDays(today: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, -(i + 1)));
}

// ---------- Find the Mosque unlock ----------

/** A level opens when the one before it has been finished. Level 1 is always open. */
export function mosqueUnlocked(levelIndex: number, mosqueFinished: number): boolean {
  return levelIndex === 0 || mosqueFinished >= levelIndex - 1;
}
