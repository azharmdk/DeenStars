import { describe, expect, it } from "vitest";
import { computeStreak } from "../../src/lib/streaks";

const set = (...days: string[]) => new Set(days);

// 2025-01-15 is a Wednesday (ISO week 2025-W03, Monday 13th to Sunday 19th).
describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    const r = computeStreak(set("2025-01-13", "2025-01-14", "2025-01-15"), "2025-01-15");
    expect(r.current).toBe(3);
    expect(r.lastDoneDayKey).toBe("2025-01-15");
  });

  it("does not treat today as missed when it is not done yet", () => {
    const r = computeStreak(set("2025-01-13", "2025-01-14"), "2025-01-15");
    expect(r.current).toBe(2);
    expect(r.activeThroughDayKey! >= "2025-01-15").toBe(true);
  });

  it("forgives one missed day per week (grace day) without counting it", () => {
    const r = computeStreak(set("2025-01-13", "2025-01-15", "2025-01-16"), "2025-01-16");
    expect(r.current).toBe(3);
    expect(r.graceDaysUsed).toBe(1);
  });

  it("does not forgive two missed days in the same week", () => {
    const r = computeStreak(set("2025-01-13", "2025-01-15", "2025-01-17"), "2025-01-17");
    expect(r.current).toBe(2); // 17th, grace 16th, 15th; 14th is a second miss in W03
  });

  it("allows one grace day in each week of a long run", () => {
    // Misses on Wed 8th (W02) and Wed 15th (W03).
    const days = ["2025-01-06", "2025-01-07", "2025-01-09", "2025-01-10", "2025-01-11", "2025-01-12", "2025-01-13", "2025-01-14", "2025-01-16"];
    const r = computeStreak(set(...days), "2025-01-16");
    expect(r.current).toBe(days.length);
    expect(r.graceDaysUsed).toBe(2);
  });

  it("returns no streak when nothing is done recently", () => {
    const r = computeStreak(set("2025-01-01"), "2025-01-15");
    expect(r.current).toBe(0);
    expect(r.activeThroughDayKey).toBeNull();
  });

  it("stays alive one extra day while the grace day is unused, and not after", () => {
    const fresh = computeStreak(set("2025-01-14", "2025-01-15"), "2025-01-15");
    expect(fresh.activeThroughDayKey).toBe("2025-01-17");
    const usedGrace = computeStreak(set("2025-01-13", "2025-01-15"), "2025-01-15");
    expect(usedGrace.activeThroughDayKey).toBe("2025-01-16");
  });
});
