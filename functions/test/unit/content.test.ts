import { describe, expect, it } from "vitest";
import quran from "../../src/seed/packs/quran.json";
import duasPack from "../../src/seed/packs/duas.json";
import { buildBedtimeConfig, buildDuaLibrary, buildStories, buildSurahLibrary, compareRefs, splitBismillah } from "../../src/seed/learningContent";

type Ayah = { arabic: string; translation: string; transliteration: string; source: { translationSource: string; transliterationSource: string } };
const Q = quran as unknown as Record<string, Ayah>;
const BISMILLAH = Q["1:1"].arabic;
// Pickthall-era words that are too hard for ages 3 to 7 (Fix 2.5).
const ARCHAIC = /\b(lo!?|saith|begetteth|besought|thou|thee|thy|thine|hath|doth|unto|ye|ere|verily|art thou)\b/i;

describe("imported Quran text", () => {
  it("has no stray byte-order mark", () => {
    for (const [ref, a] of Object.entries(Q)) expect(a.arabic.startsWith("\uFEFF"), ref).toBe(false);
  });
  it("uses the ClearQuran (Itani) translation everywhere", () => {
    for (const [ref, a] of Object.entries(Q)) expect(a.source.translationSource, ref).toMatch(/Talal Itani, ClearQuran/);
  });
  it("has no archaic Pickthall wording in any translation", () => {
    for (const [ref, a] of Object.entries(Q)) expect(a.translation, ref).not.toMatch(ARCHAIC);
  });
  it("21:87 transliteration no longer repeats a phrase", () => {
    const t = Q["21:87"].transliteration;
    expect(t.match(/lan naqdira/g)?.length).toBe(1);
    expect(t).not.toMatch(/fanaanna/);
    expect(Q["21:87"].source.transliterationSource).toMatch(/Quran\.com/);
  });
  it("no transliteration repeats a 3-word phrase unless the Arabic repeats it (103:3 repeats watawasaw)", () => {
    const allowed = new Set(["103:3"]);
    for (const [ref, a] of Object.entries(Q)) {
      const w = a.transliteration.toLowerCase().split(/\s+/);
      let repeated = false;
      for (let i = 0; i + 3 <= w.length && !repeated; i++)
        for (let j = i + 3; j + 3 <= w.length; j++) if (w.slice(i, i + 3).join(" ") === w.slice(j, j + 3).join(" ")) repeated = true;
      if (!allowed.has(ref)) expect(repeated, `${ref}: ${a.transliteration}`).toBe(false);
    }
  });
});

describe("Bismillah", () => {
  it("is split off ayah 1 for surahs other than Al-Fatiha", () => {
    const s = splitBismillah(112, Q["112:1"].arabic);
    expect(s.bismillah).toBe(true);
    expect(s.arabic.startsWith(BISMILLAH)).toBe(false);
    expect(BISMILLAH + " " + s.arabic).toBe(Q["112:1"].arabic); // nothing lost or retyped
  });
  it("stays as ayah 1 in Al-Fatiha and is never added to At-Tawbah", () => {
    expect(splitBismillah(1, Q["1:1"].arabic)).toEqual({ bismillah: false, arabic: Q["1:1"].arabic });
    expect(splitBismillah(9, "x").bismillah).toBe(false);
  });
  it("every surah doc shows it on its own line, from the 1:1 sources", () => {
    for (const s of buildSurahLibrary()) {
      const first = s.data.ayahs[0];
      if (s.data.surahNumber === 1) {
        expect(s.data.bismillah).toBeNull();
        expect(first.arabic).toBe(BISMILLAH);
      } else {
        expect(s.data.bismillah?.arabic, s.id).toBe(BISMILLAH);
        expect(s.data.bismillah?.translation).toBe(Q["1:1"].translation);
        expect(first.arabic.startsWith(BISMILLAH), s.id).toBe(false);
      }
      expect(s.data.source.translationSource).toMatch(/Itani/);
    }
  });
});

describe("stories", () => {
  it("verse panel references are in Quran order", () => {
    for (const s of buildStories()) {
      const order = s.data.refOrder as string[];
      expect([...order].sort(compareRefs), s.id).toEqual(order);
      expect(Object.keys(s.data.refVerses).sort()).toEqual([...order].sort());
    }
  });
  it("compareRefs sorts numerically, not as text", () => {
    expect(["11:44", "11:37", "71:1", "11:40", "2:5"].sort(compareRefs)).toEqual(["2:5", "11:37", "11:40", "11:44", "71:1"]);
  });
  it("final verse carries the translation credit and no archaic words", () => {
    for (const s of buildStories()) {
      expect(s.data.verse.translationSource).toMatch(/Itani/);
      expect(s.data.verse.translation).not.toMatch(ARCHAIC);
      for (const v of Object.values(s.data.refVerses)) expect((v as { translation: string }).translation).not.toMatch(ARCHAIC);
    }
  });
});

describe("duas", () => {
  it("every dua has a transliteration, imported from its source", () => {
    for (const d of buildDuaLibrary()) expect(d.data.transliteration, d.id).toBeTruthy();
  });
  it("Hisn duas keep their imported Arabic and translation unchanged", () => {
    const pack = duasPack as { duaId: string; arabic: string; translation: string }[];
    for (const d of buildDuaLibrary()) {
      const src = pack.find((x) => x.duaId === d.id)!;
      expect(d.data.arabic).toBe(src.arabic);
      expect(d.data.translation).toBe(src.translation);
    }
  });
  it("Quran duas use the Itani translation", () => {
    for (const d of buildDuaLibrary().filter((x) => x.data.source.type === "quran")) {
      expect((d.data.source as { translationSource: string }).translationSource).toMatch(/Itani/);
      expect(d.data.translation).not.toMatch(ARCHAIC);
    }
  });
  it("bedtime Ayat al-Kursi uses the Itani translation", () => {
    expect(buildBedtimeConfig().ayatAlKursi.translation).not.toMatch(ARCHAIC);
  });
});
