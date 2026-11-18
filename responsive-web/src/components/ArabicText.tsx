/**
 * Renders imported Arabic text exactly as stored. Only display formatting happens here:
 * outer brackets used by Hisn al-Muslim are hidden, and the dua part of a verse can be highlighted.
 * The text itself is never edited (docs/ISLAMIC_CONTENT_POLICY.md §11).
 */
import { cleanHisnDisplay } from "../content";

// Display helpers live in src/content.ts (no dependencies) so the printables script shares them.
export { cleanHisnDisplay, cleanMeaning, cleanTransliteration, translationCredit } from "../content";

const PAUSE_ONLY = /^[\u06D6-\u06ED]+$/;

export function ArabicText({
  text,
  size = 28,
  highlightFromWord,
  color,
  quran = false,
}: {
  text: string;
  size?: number;
  highlightFromWord?: number | null;
  color?: string;
  quran?: boolean;
}) {
  const shown = quran ? text : cleanHisnDisplay(text);
  if (!highlightFromWord || highlightFromWord <= 0) {
    return (
      <p dir="rtl" lang="ar" className="arabic-text" style={{ fontSize: size, color }}>
        {shown}
      </p>
    );
  }
  // Split once at the start of the highlighted word, so the highlight is one continuous run.
  const tokens = shown.split(/(\s+)/);
  let wordIndex = -1;
  let splitAt = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i]) || PAUSE_ONLY.test(tokens[i])) continue;
    wordIndex++;
    if (wordIndex === highlightFromWord) {
      splitAt = i;
      break;
    }
  }
  return (
    <p dir="rtl" lang="ar" className="arabic-text" style={{ fontSize: size, color }}>
      {tokens.slice(0, splitAt).join("")}
      <mark className="arabic-hl">{tokens.slice(splitAt).join("")}</mark>
    </p>
  );
}
