/**
 * Pure content helpers (no imports at all), shared by screens, tests and scripts/make-printables.mjs.
 * Display formatting only: imported religious text is never edited (docs/ISLAMIC_CONTENT_POLICY.md §11).
 */

/** Hides the outer brackets Hisn al-Muslim puts around its Arabic text. */
export function cleanHisnDisplay(text: string): string {
  return text
    .trim()
    .replace(/^[\s(.[\]]+/, "")
    .replace(/[\s).[\]]+\.?$/, "")
    .replace(/\(\(|\)\)/g, "")
    .trim();
}

/** Hisn al-Muslim meanings come wrapped in brackets, e.g. "(In Your name ...)". Display only. */
export function cleanMeaning(text: string): string {
  const t = text.trim();
  return t.startsWith("(") && t.endsWith(")") && t.indexOf(")") === t.length - 1 ? t.slice(1, -1).trim() : t;
}

/**
 * Display clean-up for imported transliterations. Removes the outer brackets the Hisn al-Muslim source
 * wraps around each item, and shows its ASCII "AA" spelling of the letter ʿayn as ʿ. Words are unchanged.
 */
export function cleanTransliteration(text: string): string {
  let t = text.trim();
  if (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1).trim();
  return t.replace(/AA/g, "ʿ");
}

/** Short credit for a translation source, for example "Talal Itani, ClearQuran.com". */
export function translationCredit(source?: string): string {
  if (!source) return "";
  return source.replace(/\s*\(.*?\)\s*/g, " ").replace(/,?\s*CC BY-ND 4\.0/, "").replace(/\s+/g, " ").trim();
}

/** Pages in the story reader: one per scene plus the closing verse page. Story cards show the same number. */
export function storyPageCount(s: { scenes: unknown[] }): number {
  return s.scenes.length + 1;
}

/** Lower-case, dash-separated, ASCII only. */
export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Shareable URL name for a dua, from its id: "dua_before_sleeping" becomes "before-sleeping". */
export function duaSlug(id: string): string {
  return slugify(id.replace(/^dua_/, ""));
}

/** Shareable URL name for a surah, from its name: "Al-Ikhlaas" becomes "al-ikhlaas". */
export function surahSlug(s: { nameTransliterated: string }): string {
  return slugify(s.nameTransliterated);
}

/** Quran order for references like "11:40": by surah, then ayah. */
export function quranOrder(a: string, b: string): number {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}
/** Dua Corner landing categories. Existing library categories map onto them; empty ones show a calm "coming soon". */
export interface DuaBrowseCategory {
  id: string;
  label: string;
  blurb: string;
  art: "sunrise" | "night" | "house" | "plate" | "camel" | "bed" | "palms-up";
  /** Library categories (Dua["category"]) that belong here. */
  from: string[];
}
export const DUA_BROWSE: DuaBrowseCategory[] = [
  { id: "morning", label: "Morning Duas", blurb: "Start the day", art: "sunrise", from: ["wake"] },
  { id: "evening", label: "Evening Duas", blurb: "End the day", art: "night", from: [] },
  { id: "daily-life", label: "Daily Life Duas", blurb: "Home and every day", art: "house", from: ["home", "bathroom"] },
  { id: "food-drink", label: "Food & Drink Duas", blurb: "Before and after eating", art: "plate", from: ["eating"] },
  { id: "travel", label: "Travel Duas", blurb: "Going out and journeys", art: "camel", from: [] },
  { id: "sleep", label: "Sleep Duas", blurb: "Bedtime", art: "bed", from: ["sleep"] },
  { id: "quran", label: "Duas from the Quran", blurb: "Words from the Quran", art: "palms-up", from: ["rabbana"] },
];
