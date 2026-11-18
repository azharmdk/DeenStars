import { describe, expect, it } from "vitest";
import { computeFacts, earnedBadges, LedgerEntry, longestRun } from "../../src/lib/progress";
import { devBadgesConfig } from "../../src/seed/devContent";
import { addDays } from "../../src/lib/time";

const cfg = devBadgesConfig as never;
const today = "2026-11-18"; // a Wednesday
const days = (n: number, end = today) => Array.from({ length: n }, (_, i) => addDays(end, -i));
const act = (dayKey: string, category = "dailyHabit", amount = 1): LedgerEntry => ({ amount, sourceType: "activity", category, dayKey });

describe("longestRun", () => {
  it("counts strictly consecutive days", () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun(["2026-11-01", "2026-11-02", "2026-11-04"])).toBe(2);
    expect(longestRun(days(7))).toBe(7);
  });
});

describe("day streak", () => {
  it("counts days on which a checklist item earned stars", () => {
    const f = computeFacts(days(3).map((d) => act(d)), 3, today);
    expect(f.dayStreak.current).toBe(3);
  });
  it("several items on one day count as one day", () => {
    const f = computeFacts([act(today), act(today, "manners"), act(addDays(today, -1))], 3, today);
    expect(f.dayStreak.current).toBe(2);
  });
  it("learning stars alone do not make a day count (negative)", () => {
    const f = computeFacts([{ amount: 5, sourceType: "dua", category: "dua", dayKey: today }], 5, today);
    expect(f.dayStreak.current).toBe(0);
  });
  it("today not done yet is not a miss", () => {
    const f = computeFacts(days(3, addDays(today, -1)).map((d) => act(d)), 3, today);
    expect(f.dayStreak.current).toBe(3);
    expect(f.dayStreak.activeThroughDayKey! >= today).toBe(true);
  });
  it("a run that ended is not current (never shown as broken)", () => {
    const f = computeFacts(days(3, addDays(today, -6)).map((d) => act(d)), 3, today);
    expect(f.dayStreak.current).toBe(0);
    expect(f.dayStreak.activeThroughDayKey).toBeNull();
    expect(f.longestDayRun).toBe(3); // still counts for streak badges
  });
});

describe("badges", () => {
  it("awards star badges at their threshold, not before (negative)", () => {
    expect(earnedBadges(cfg, computeFacts([], 9, today))).not.toContain("stars_10");
    expect(earnedBadges(cfg, computeFacts([], 10, today))).toContain("stars_10");
    expect(earnedBadges(cfg, computeFacts([], 100, today))).toEqual(expect.arrayContaining(["stars_10", "stars_50", "stars_100"]));
  });
  it("3-day streak badge needs three days in a row", () => {
    expect(earnedBadges(cfg, computeFacts(days(2).map((d) => act(d)), 2, today))).not.toContain("streak_3");
    expect(earnedBadges(cfg, computeFacts(days(3).map((d) => act(d)), 3, today))).toContain("streak_3");
  });
  it("a streak badge stays earned after the run ends", () => {
    const old = days(7, "2026-10-01").map((d) => act(d));
    const ids = earnedBadges(cfg, computeFacts(old, 7, today));
    expect(ids).toEqual(expect.arrayContaining(["streak_3", "streak_7"]));
  });
  it("Kindness Week needs a good deed on 7 consecutive days", () => {
    const seven = days(7).map((d) => act(d, "goodDeed"));
    expect(earnedBadges(cfg, computeFacts(seven, 7, today))).toContain("kindness_week");
  });
  it("Kindness Week is not earned with a gap, or with other categories (negative)", () => {
    const gap = days(8).filter((_, i) => i !== 3).map((d) => act(d, "goodDeed"));
    expect(earnedBadges(cfg, computeFacts(gap, 7, today))).not.toContain("kindness_week");
    const manners = days(7).map((d) => act(d, "manners"));
    expect(earnedBadges(cfg, computeFacts(manners, 7, today))).not.toContain("kindness_week");
  });
  it("no config, no badges", () => {
    expect(earnedBadges(null, computeFacts([], 500, today))).toEqual([]);
  });
});
