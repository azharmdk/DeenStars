import { FieldValue } from "firebase-admin/firestore";
import { db } from "./env";
import { computeStreak, StreakResult } from "./streaks";
import { addDays, dayKeyFor } from "./time";

/**
 * Day streak and badges (Fix 3.2). Server-side only; clients read the results and never write them.
 * - A day counts when at least one checklist item earned stars that day (self-check "I did it" or a
 *   grown-up's approval or make-up). Learning stars do not make a day count.
 * - The day streak follows the same positive-only rules as activity streaks (one grace day per week,
 *   a broken run is never shown).
 * - Badge rules come from appConfiguration/badges. Earned badges are kept for good (never removed).
 */
export type BadgeRule =
  | { id: string; type: "totalStars"; threshold: number; title: string; description: string; art: string; sortOrder: number }
  | { id: string; type: "dayStreak"; days: number; title: string; description: string; art: string; sortOrder: number }
  | { id: string; type: "categoryRun"; category: string; days: number; title: string; description: string; art: string; sortOrder: number };

export interface BadgesConfig {
  configVersion: number;
  badges: BadgeRule[];
}

export interface LedgerEntry {
  amount: number;
  sourceType: string;
  sourceId?: string;
  category?: string | null;
  dayKey: string;
}

export interface ProgressFacts {
  totalStars: number;
  dayStreak: StreakResult;
  /** Longest run of consecutive days, ever, with a starred item of each category. */
  longestCategoryRun: Record<string, number>;
  /** Longest day streak ever reached (so a streak badge stays earned after the run ends). */
  longestDayRun: number;
}

/** Longest run of strictly consecutive days in a set of day keys. */
export function longestRun(days: Iterable<string>): number {
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue; // not the start of a run
    let n = 1;
    while (set.has(addDays(d, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

export function computeFacts(entries: LedgerEntry[], totalStars: number, today: string): ProgressFacts {
  const activity = entries.filter((e) => e.sourceType === "activity" && e.amount > 0);
  const days = new Set(activity.map((e) => e.dayKey));
  const byCategory: Record<string, Set<string>> = {};
  for (const e of activity) {
    if (!e.category) continue;
    (byCategory[e.category] ??= new Set()).add(e.dayKey);
  }
  const longestCategoryRun = Object.fromEntries(Object.entries(byCategory).map(([c, s]) => [c, longestRun(s)]));
  const dayStreak = computeStreak(days, today);
  return { totalStars, dayStreak, longestCategoryRun, longestDayRun: Math.max(longestRun(days), dayStreak.current) };
}

/** Which badges the facts earn. Pure, so the rules can be unit tested. */
export function earnedBadges(config: BadgesConfig | null, facts: ProgressFacts): string[] {
  if (!config) return [];
  return config.badges
    .filter((b) => {
      if (b.type === "totalStars") return facts.totalStars >= b.threshold;
      if (b.type === "dayStreak") return facts.longestDayRun >= b.days;
      if (b.type === "categoryRun") return (facts.longestCategoryRun[b.category] ?? 0) >= b.days;
      return false;
    })
    .map((b) => b.id);
}

/** Recomputes the day streak and awards any new badges for one child. Idempotent. */
export async function recomputeProgress(childId: string): Promise<{ dayStreak: StreakResult; newBadges: string[] } | null> {
  const childRef = db.doc(`children/${childId}`);
  const childSnap = await childRef.get();
  const child = childSnap.data();
  if (!childSnap.exists || !child || child.deletion) return null;
  const [ledgerSnap, configSnap, badgesSnap] = await Promise.all([
    childRef.collection("starTransactions").get(),
    db.doc("appConfiguration/badges").get(),
    childRef.collection("badges").get(),
  ]);
  // Ledger entries written before the category field existed get it from the activity.
  const raw = ledgerSnap.docs.map((d) => d.data() as LedgerEntry);
  const missing = Array.from(new Set(raw.filter((e) => e.sourceType === "activity" && !e.category && e.sourceId).map((e) => e.sourceId!)));
  const categoryOf = new Map<string, string>();
  if (missing.length) {
    const snaps = await db.getAll(...missing.map((id) => db.doc(`activities/${id}`)));
    for (const s of snaps) if (s.exists && s.data()?.category) categoryOf.set(s.id, s.data()!.category as string);
  }
  const entries = raw.map((e) => (e.category || !e.sourceId ? e : { ...e, category: categoryOf.get(e.sourceId) ?? null }));
  const totalStars = entries.reduce((n, e) => n + (e.amount > 0 ? e.amount : 0), 0);
  const today = dayKeyFor(new Date(), child.timeZone);
  const facts = computeFacts(entries, totalStars, today);
  const config = (configSnap.data() as BadgesConfig | undefined) ?? null;
  const have = new Set(badgesSnap.docs.map((d) => d.id));
  const newBadges = earnedBadges(config, facts).filter((id) => !have.has(id));

  await childRef.collection("progress").doc("summary").set({
    dayStreak: facts.dayStreak,
    longestDayRun: facts.longestDayRun,
    updatedAt: FieldValue.serverTimestamp(),
  });
  // create() never overwrites, so a badge keeps its first earned date. Two triggers racing on the
  // same badge both succeed: the second sees ALREADY_EXISTS (gRPC code 6) and moves on.
  for (const id of newBadges) {
    await childRef
      .collection("badges")
      .doc(id)
      .create({ badgeId: id, earnedDayKey: today, configVersion: config?.configVersion ?? null, earnedAt: FieldValue.serverTimestamp() })
      .catch((e: { code?: number }) => {
        if (e.code !== 6) throw e;
      });
  }
  return { dayStreak: facts.dayStreak, newBadges };
}
