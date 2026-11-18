import { describe, expect, it } from "vitest";
import { dailyPool, GAMES } from "../src/games/catalog";
import { HINT_AFTER, makeRound, MOSQUE_LEVELS, starsForLevel } from "../src/games/mosque";
import {
  archiveDays,
  dailyGameFor,
  dailyStreak,
  dayNumber,
  emptyProgress,
  mosqueUnlocked,
  parseProgress,
  playerLevel,
  totalCompleted,
  withCompletion,
} from "../src/games/progress";

// Small deterministic random generator for repeatable rounds.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("player level", () => {
  it("has Level 1 to 4 and Expert", () => {
    expect([0, 3, 8, 15, 25].map((n) => playerLevel(n).label)).toEqual(["Level 1", "Level 2", "Level 3", "Level 4", "Expert"]);
  });
  it("reports games left to the next level and a 0 to 1 fraction", () => {
    const p = playerLevel(1);
    expect(p.toNext).toBe(2);
    expect(p.nextLabel).toBe("Level 2");
    expect(p.fraction).toBeCloseTo(1 / 3);
  });
  it("Expert has no next level", () => {
    const p = playerLevel(99);
    expect(p.toNext).toBeNull();
    expect(p.fraction).toBe(1);
  });
  it("never goes below Level 1 (negative input)", () => {
    expect(playerLevel(-5).label).toBe("Level 1");
  });
});

describe("Find the Mosque", () => {
  it("has five levels ending in Expert with growing difficulty", () => {
    expect(MOSQUE_LEVELS.map((l) => l.label)).toEqual(["Level 1", "Level 2", "Level 3", "Level 4", "Expert"]);
    const spots = MOSQUE_LEVELS.map((l) => l.spots);
    expect([...spots].sort((a, b) => a - b)).toEqual(spots);
    expect(new Set(spots).size).toBe(spots.length);
  });
  it("every round has the right number of pictures and exactly one masjid", () => {
    for (const lvl of MOSQUE_LEVELS) {
      for (let seed = 1; seed <= 40; seed++) {
        const round = makeRound(lvl, seeded(seed));
        expect(round).toHaveLength(lvl.spots);
        expect(round.filter((s) => s.target)).toHaveLength(1);
        expect(round.find((s) => s.target)!.art).toBe("mosque");
        expect(new Set(round.map((s) => s.art)).size).toBe(round.length);
        expect(new Set(round.map((s) => s.key)).size).toBe(round.length);
      }
    }
  });
  it("moves the masjid around between rounds", () => {
    const lvl = MOSQUE_LEVELS[3];
    const places = new Set(Array.from({ length: 60 }, (_, i) => makeRound(lvl, seeded(i + 1)).findIndex((s) => s.target)));
    expect(places.size).toBeGreaterThan(3);
  });
  it("stars equal rounds finished and cannot be reduced by wrong taps (no input for misses)", () => {
    expect(starsForLevel.length).toBe(1);
    expect(starsForLevel(MOSQUE_LEVELS[4])).toBe(MOSQUE_LEVELS[4].rounds);
  });
  it("a hint is offered after two wrong taps", () => expect(HINT_AFTER).toBe(2));
  it("level 1 is always open and the rest need the one before", () => {
    expect(mosqueUnlocked(0, -1)).toBe(true);
    expect(mosqueUnlocked(1, -1)).toBe(false);
    expect(mosqueUnlocked(1, 0)).toBe(true);
    expect(mosqueUnlocked(4, 2)).toBe(false);
    expect(mosqueUnlocked(4, 3)).toBe(true);
  });
});

describe("progress", () => {
  it("counts completions and the highest mosque level, never lowering it", () => {
    let p = withCompletion(emptyProgress(), "find-the-mosque", { mosqueLevel: 2 });
    p = withCompletion(p, "find-the-mosque", { mosqueLevel: 0 });
    p = withCompletion(p, "kindness-quiz");
    expect(p.mosqueFinished).toBe(2);
    expect(totalCompleted(p)).toBe(3);
  });
  it("does not change the original object", () => {
    const p = emptyProgress();
    withCompletion(p, "picture-matching", { dailyDay: "2026-03-02", today: "2026-03-02" });
    expect(p.daily).toEqual({});
    expect(p.completions).toEqual({});
  });
  it("bad or missing saved data becomes empty progress", () => {
    for (const raw of [null, "", "not json", "{}", '{"v":2}', "[1,2]"]) expect(parseProgress(raw)).toEqual(emptyProgress());
  });
  it("round-trips through JSON", () => {
    const p = withCompletion(emptyProgress(), "picture-matching", { dailyDay: "2026-03-02", today: "2026-03-02" });
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });
});

describe("Today's Islamic Challenge", () => {
  it("gives the same game for the same day, only from available games", () => {
    const pool = dailyPool();
    expect(pool.length).toBeGreaterThanOrEqual(3);
    expect(pool).toContain("find-the-mosque");
    for (let i = 0; i < 60; i++) {
      const day = `2026-03-${String((i % 28) + 1).padStart(2, "0")}`;
      expect(dailyGameFor(day)).toBe(dailyGameFor(day));
      expect(pool).toContain(dailyGameFor(day));
    }
  });
  it("never features a coming-soon game", () => {
    const soon = GAMES.filter((g) => g.status === "soon").map((g) => g.id);
    for (let i = 0; i < 90; i++) expect(soon).not.toContain(dailyGameFor(`2026-04-${String((i % 28) + 1).padStart(2, "0")}`));
  });
  it("rotates through every game in the pool", () => {
    const seen = new Set(Array.from({ length: dailyPool().length }, (_, i) => dailyGameFor(`2026-05-${String(i + 1).padStart(2, "0")}`)));
    expect(seen.size).toBe(dailyPool().length);
  });
  it("counts days from a fixed date, also before it", () => {
    expect(dayNumber("2024-01-01")).toBe(0);
    expect(dayNumber("2024-01-02")).toBe(1);
    expect(dailyPool()).toContain(dailyGameFor("2023-06-01"));
  });
  it("on-time days make a streak that stays visible until today is done", () => {
    const daily = { "2026-03-01": "onTime", "2026-03-02": "onTime", "2026-03-03": "onTime" } as const;
    expect(dailyStreak(daily, "2026-03-03")).toBe(3);
    expect(dailyStreak(daily, "2026-03-04")).toBe(3); // today not done yet, run still shown
  });
  it("shows nothing once a run has ended (no broken run)", () => {
    const daily = { "2026-03-01": "onTime", "2026-03-02": "onTime" } as const;
    expect(dailyStreak(daily, "2026-03-05")).toBe(0);
  });
  it("archive replays do not extend the streak", () => {
    const daily = { "2026-03-01": "later", "2026-03-02": "later", "2026-03-03": "onTime" } as const;
    expect(dailyStreak(daily, "2026-03-03")).toBe(1);
  });
  it("an on-time finish is not downgraded by a later replay", () => {
    let p = withCompletion(emptyProgress(), "kindness-quiz", { dailyDay: "2026-03-02", today: "2026-03-02" });
    p = withCompletion(p, "kindness-quiz", { dailyDay: "2026-03-02", today: "2026-03-09" });
    expect(p.daily["2026-03-02"]).toBe("onTime");
  });
  it("finishing an earlier day later is recorded as later", () => {
    const p = withCompletion(emptyProgress(), "kindness-quiz", { dailyDay: "2026-03-02", today: "2026-03-09" });
    expect(p.daily["2026-03-02"]).toBe("later");
  });
  it("archive lists the days before today, newest first", () => {
    expect(archiveDays("2026-03-10", 3)).toEqual(["2026-03-09", "2026-03-08", "2026-03-07"]);
  });
});
