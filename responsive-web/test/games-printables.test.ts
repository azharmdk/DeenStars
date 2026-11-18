import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { betterTime, formatTime, MATCH_LEVELS, matchUnlocked, QUIZ_LEVELS, unlockedQuizIndex } from "../src/games/levels";
import { listedPrintables, PACKS, PRINTABLES } from "../src/printables/catalog";
import { duaSlug, slugify, surahSlug } from "../src/content";

describe("quiz levels", () => {
  it("Gentle 4, Standard 6, Challenge 8 questions, with more choices at each level", () => {
    expect(QUIZ_LEVELS.map((l) => [l.id, l.questions, l.options])).toEqual([["gentle", 4, 2], ["standard", 6, 3], ["challenge", 8, 4]]);
  });
  it("there are enough sample questions for the top level", () => {
    const src = readFileSync("src/screens/Play.tsx", "utf8");
    expect((src.match(/prompt: "/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });
  it("starts at the child's difficulty setting", () => {
    expect(unlockedQuizIndex("gentle", null)).toBe(0);
    expect(unlockedQuizIndex("challenge", null)).toBe(2);
  });
  it("finishing a level unlocks the next, never past the top", () => {
    expect(unlockedQuizIndex("gentle", 0)).toBe(1);
    expect(unlockedQuizIndex("gentle", 1)).toBe(2);
    expect(unlockedQuizIndex("gentle", 2)).toBe(2);
  });
  it("a setting above progress is kept (negative: progress never lowers it)", () => {
    expect(unlockedQuizIndex("challenge", 0)).toBe(2);
  });
});

describe("matching levels", () => {
  it("4, 6 and 8 pairs", () => expect(MATCH_LEVELS.map((l) => l.pairs)).toEqual([4, 6, 8]));
  it("level 2 after level 1; Super Matching only after a 7-day streak", () => {
    const [l1, l2, l3] = MATCH_LEVELS;
    expect(matchUnlocked(l1, 0, 0)).toBe(true);
    expect(matchUnlocked(l2, 0, 0)).toBe(false);
    expect(matchUnlocked(l2, 1, 0)).toBe(true);
    expect(matchUnlocked(l3, 2, 6)).toBe(false);
    expect(matchUnlocked(l3, 0, 7)).toBe(true);
  });
  it("keeps the best time", () => {
    expect(betterTime(null, 42000)).toBe(42000);
    expect(betterTime(30000, 42000)).toBe(30000);
    expect(betterTime(50000, 42000)).toBe(42000);
    expect(formatTime(65000)).toBe("1:05");
  });
});

describe("printables", () => {
  it("lists the free sheets that are ready, not the 99 Names placeholder", () => {
    expect(listedPrintables().map((p) => p.id)).toEqual(["bedtime-dua-chart", "weekly-salah-tracker", "good-deeds-star-chart", "ramadan-countdown"]);
  });
  it("every listed PDF and preview exists and is a real PDF", () => {
    for (const p of listedPrintables()) {
      for (const f of [p.files.colour, p.files.bw, p.preview].filter(Boolean) as string[]) {
        const path = `public${f}`;
        expect(existsSync(path), path).toBe(true);
        expect(statSync(path).size, path).toBeGreaterThan(10_000);
      }
      for (const f of [p.files.colour, p.files.bw].filter(Boolean) as string[]) {
        const head = readFileSync(`public${f}`).subarray(0, 5).toString("latin1");
        expect(head, f).toBe("%PDF-");
      }
    }
  });
  it("paid packs are hidden: no paywall, nothing to buy (negative)", () => {
    const packs = [...PACKS, { id: "paid", title: "Paid", isPaid: true }];
    const all = [...PRINTABLES, { ...PRINTABLES[0], id: "paid-sheet", packId: "paid" }];
    expect(listedPrintables(all, packs).map((p) => p.id)).not.toContain("paid-sheet");
    // The screens (not code comments) must contain no payment step.
    for (const f of ["src/components/Printables.tsx", "src/screens/ChildApp.tsx", "src/screens/ParentApp.tsx", "src/screens/GuestLearn.tsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/\bprice\b|checkout|purchase|stripe|paypal|buy now|\$\d/i);
    }
  });
  it("the child Home view lists printables without download links", () => {
    const src = readFileSync("src/screens/ChildApp.tsx", "utf8");
    expect(src).toMatch(/<PrintablesGrid mode="list" \/>/);
    expect(src).not.toMatch(/PrintablesGrid mode="download"/);
  });
});

describe("shareable URLs", () => {
  it("makes clean slugs", () => {
    expect(duaSlug("dua_before_sleeping")).toBe("before-sleeping");
    expect(surahSlug({ nameTransliterated: "Al-Ikhlaas" })).toBe("al-ikhlaas");
    expect(slugify("  An-Naas!  ")).toBe("an-naas");
  });
});
