import { describe, expect, it } from "vitest";
import { cleanTransliteration, translationCredit } from "../src/components/ArabicText";
import { quranOrder, storyPageCount } from "../src/content";

describe("transliteration display", () => {
  it("removes the source's outer brackets and shows AA as the letter ayn", () => {
    expect(cleanTransliteration("(Bismikal-lahumma amootu wa-ahya.)")).toBe("Bismikal-lahumma amootu wa-ahya.");
    expect(cleanTransliteration("(Alhamdu lillahil-lathee ahyana baAAda ma amatana)")).toBe("Alhamdu lillahil-lathee ahyana baʿda ma amatana");
  });
  it("leaves Quran transliterations unchanged", () => {
    expect(cleanTransliteration("Qul huwal laahu ahad")).toBe("Qul huwal laahu ahad");
  });
});

describe("translation credit", () => {
  it("shortens the stored source to the required credit", () => {
    expect(translationCredit("Talal Itani, ClearQuran.com (Allah Edition), CC BY-ND 4.0")).toBe("Talal Itani, ClearQuran.com");
    expect(translationCredit(undefined)).toBe("");
  });
});

describe("story page count", () => {
  it("matches the reader: every scene plus the verse page", () => {
    expect(storyPageCount({ scenes: [{}, {}, {}, {}, {}, {}] })).toBe(7); // Yunus: 6 scenes, 7 pages
    expect(storyPageCount({ scenes: [{}, {}, {}, {}, {}] })).toBe(6); // Nuh: 5 scenes, 6 pages
  });
  it("sorts verse references in Quran order", () => {
    expect(["11:41", "11:42", "11:37", "11:44", "11:40"].sort(quranOrder)).toEqual(["11:37", "11:40", "11:41", "11:42", "11:44"]);
  });
});