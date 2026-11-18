/**
 * Builds Dua Corner, Surah learning, stories and bedtime documents from the imported source packs
 * (scripts/import-content.mjs, docs/ISLAMIC_CONTENT_POLICY.md §11). Arabic text and audio come only
 * from the packs; nothing here is typed by hand.
 * Every item is "pendingReview" until a qualified reviewer approves it.
 */
import quran from "./packs/quran.json";
import duas from "./packs/duas.json";
import surahs from "./packs/surahs.json";
import stories from "./packs/stories.json";

type Ayah = (typeof quran)[keyof typeof quran];
const Q = quran as Record<string, Ayah>;

const REVIEW = { reviewStatus: "pendingReview", reviewer: null, version: 1 };

function ayah(ref: string) {
  const a = Q[ref];
  if (!a) throw new Error(`Missing imported ayah ${ref}. Re-run scripts/import-content.mjs.`);
  return a;
}

// Word index where the dua part starts inside a longer verse (from the imported text, see import notes).
const QURAN_DUA_HIGHLIGHT: Record<string, number> = { "2:201": 3, "7:23": 1, "17:24": 7, "20:114": 14 };

export function buildDuaLibrary() {
  return duas.map((d, i) => {
    const ref = d.source.type === "quran" ? `${(d.source as { surahNumber: number }).surahNumber}:${(d.source as { ayahStart: number }).ayahStart}` : null;
    return {
      id: d.duaId,
      data: {
        ...d,
        transliteration: (d as { transliteration?: string }).transliteration ?? null,
        quranRef: ref,
        highlightFromWord: ref ? QURAN_DUA_HIGHLIGHT[ref] ?? 0 : null,
        ageGroups: ["3-4", "5", "6"],
        sortOrder: i,
        ...REVIEW,
      },
    };
  });
}

/** Quran order for references like "11:40": by surah, then ayah. */
export function compareRefs(a: string, b: string): number {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

/**
 * The Tanzil text puts the Bismillah in front of ayah 1 of each surah except Al-Fatiha (where it is ayah 1)
 * and At-Tawbah (which has none). It is shown on its own line, using the Al-Fatiha 1:1 text, transliteration
 * and translation from the same sources. Nothing is retyped: the ayah keeps the rest of the imported text.
 */
export function splitBismillah(surahNumber: number, arabic: string): { bismillah: boolean; arabic: string } {
  const b = ayah("1:1").arabic;
  if (surahNumber === 1 || surahNumber === 9 || !arabic.startsWith(b)) return { bismillah: false, arabic };
  return { bismillah: true, arabic: arabic.slice(b.length).trim() };
}

export function buildSurahLibrary() {
  return surahs.map((s, i) => {
    let hasBismillah = false;
    const ayahs = s.ayahRefs.map((ref) => {
      const a = ayah(ref);
      const split = a.ayahNumber === 1 ? splitBismillah(s.surahNumber, a.arabic) : { bismillah: false, arabic: a.arabic };
      if (split.bismillah) hasBismillah = true;
      return { ref, ayahNumber: a.ayahNumber, arabic: split.arabic, translation: a.translation, transliteration: a.transliteration, audio: (a as { audio?: unknown }).audio ?? null };
    });
    const b = ayah("1:1");
    return {
    id: s.surahId,
    data: {
      ...s,
      ayahs,
      bismillah: hasBismillah ? { arabic: b.arabic, transliteration: b.transliteration, translation: b.translation } : null,
      source: { type: "quran", arabicEdition: "Tanzil Project, Uthmani", translationSource: b.source.translationSource },
      ageGroups: ["3-4", "5", "6"],
      sortOrder: i,
      ...REVIEW,
    },
    };
  });
}

export function buildStories() {
  return stories.map((s, i) => {
    const v = ayah(s.verse.ref);
    const refs = Array.from(new Set(s.scenes.flatMap((sc) => sc.refs))).sort(compareRefs);
    return {
      id: s.storyId,
      data: {
        ...s,
        verse: {
          ...s.verse,
          surahName: v.surahName,
          surahNumber: v.surahNumber,
          ayahNumber: v.ayahNumber,
          arabic: v.arabic,
          translation: v.translation,
          transliteration: v.transliteration,
          translationSource: v.source.translationSource,
          audio: (v as { audio?: unknown }).audio ?? null,
        },
        // Quran order for the "Read the verses" panel (map key order is not kept by Firestore).
        refOrder: refs,
        refVerses: Object.fromEntries(
          refs.map((r) => {
            const a = ayah(r);
            return [r, { surahName: a.surahName, ayahNumber: a.ayahNumber, arabic: a.arabic, translation: a.translation }];
          }),
        ),
        draftOrigin: "ai-assisted",
        sortOrder: i,
        ...REVIEW,
      },
    };
  });
}

export function buildBedtimeConfig() {
  const kursi = ayah("2:255");
  return {
    duaIds: ["dua_before_sleeping"],
    surahIds: ["surah_112", "surah_113", "surah_114"],
    ayatAlKursi: { ref: "2:255", arabic: kursi.arabic, translation: kursi.translation, transliteration: kursi.transliteration, audio: (kursi as { audio?: unknown }).audio ?? null },
    ...REVIEW,
  };
}
