import { FieldValue } from "firebase-admin/firestore";
import { db } from "./env";
import { addDays, dayKeyFor, weekKeyFromDayKey } from "./time";

/**
 * Positive-only streaks (product decision 2026-11, docs/REWARDS.md).
 * - A run counts days on which the activity was completed (or approved).
 * - Today not being done yet is never a miss.
 * - One missed day per ISO week is forgiven (grace day). Grace days do not add to the count.
 * - A broken run is never shown: the client only shows a streak while today <= activeThroughDayKey.
 */
export const STREAK_CELEBRATIONS = [3, 5, 7, 10, 14, 21, 30, 40, 50, 75, 100];

export interface StreakResult {
  current: number;
  lastDoneDayKey: string | null;
  activeThroughDayKey: string | null;
  graceDaysUsed: number;
}

export function computeStreak(doneDays: Set<string>, today: string): StreakResult {
  let cursor = doneDays.has(today) ? today : addDays(today, -1);
  const graceWeeks = new Set<string>();
  let current = 0;
  let lastDone: string | null = null;

  for (let guard = 0; guard < 800; guard++) {
    if (doneDays.has(cursor)) {
      current++;
      lastDone ??= cursor;
      cursor = addDays(cursor, -1);
      continue;
    }
    const week = weekKeyFromDayKey(cursor);
    const previous = addDays(cursor, -1);
    if (!graceWeeks.has(week) && doneDays.has(previous)) {
      graceWeeks.add(week);
      cursor = previous;
      continue;
    }
    break;
  }

  if (current === 0 || !lastDone) {
    return { current: 0, lastDoneDayKey: null, activeThroughDayKey: null, graceDaysUsed: 0 };
  }

  // The run is alive on the day after the last completion. If that day's week still has its
  // grace day available, it stays alive one more day.
  const nextDay = addDays(lastDone, 1);
  const activeThrough = graceWeeks.has(weekKeyFromDayKey(nextDay)) ? nextDay : addDays(lastDone, 2);
  return { current, lastDoneDayKey: lastDone, activeThroughDayKey: activeThrough, graceDaysUsed: graceWeeks.size };
}

/** Recomputes one activity's streak from completion history and stores it. */
export async function recomputeStreak(childId: string, activityId: string): Promise<StreakResult | null> {
  const childSnap = await db.doc(`children/${childId}`).get();
  const child = childSnap.data();
  if (!childSnap.exists || !child) return null;

  const done = await db
    .collection(`children/${childId}/checklistCompletions`)
    .where("activityId", "==", activityId)
    .where("status", "==", "done")
    .get();
  const days = new Set(done.docs.map((d) => d.data().dayKey as string));
  const today = dayKeyFor(new Date(), child.timeZone);
  const result = computeStreak(days, today);

  await db.doc(`children/${childId}/streaks/${activityId}`).set({
    activityId,
    ...result,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return result;
}
