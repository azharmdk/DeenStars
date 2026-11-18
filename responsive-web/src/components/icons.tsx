/**
 * Icons and art. UI controls use Lucide (ISC licence). Content and avatars use the Fluent Emoji 3D
 * art set (MIT, self-hosted in public/art). Placeholder until a commissioned DeenStars set exists
 * (docs/DESIGN_SYSTEM.md section 6). Avatar IDs are stored on child profiles, so keep them stable.
 */
import type { LucideIcon } from "lucide-react";
import { BookOpen, HandHeart, Heart, Landmark, MoonStar, Sparkles, Sprout } from "lucide-react";
import type { Category } from "../types";
import { Art, ArtName, Tone } from "./ui";

export const CATEGORY_STYLE: Record<Category, { label: string; Icon: LucideIcon; art: ArtName; tone: Tone; fg: string; bg: string }> = {
  dailyHabit: { label: "Habits", Icon: Sprout, art: "seedling", tone: "green", fg: "var(--c-habit)", bg: "var(--c-habit-bg)" },
  salah: { label: "Salah", Icon: Landmark, art: "mosque", tone: "blue", fg: "var(--c-salah)", bg: "var(--c-salah-bg)" },
  quran: { label: "Quran", Icon: BookOpen, art: "book", tone: "purple", fg: "var(--c-quran)", bg: "var(--c-quran-bg)" },
  dua: { label: "Duas", Icon: HandHeart, art: "palms-up", tone: "gold", fg: "var(--c-dua)", bg: "var(--c-dua-bg)" },
  manners: { label: "Manners", Icon: Heart, art: "heart", tone: "pink", fg: "var(--c-manners)", bg: "var(--c-manners-bg)" },
  goodDeed: { label: "Good Deeds", Icon: Sparkles, art: "sparkling-heart", tone: "teal", fg: "var(--c-deed)", bg: "var(--c-deed-bg)" },
  jummah: { label: "Jummah", Icon: MoonStar, art: "moon", tone: "night", fg: "var(--c-jummah)", bg: "var(--c-jummah-bg)" },
};

/** Category picture on its tinted tile. */
export function CategoryChip({ category, size = 48 }: { category: Category; size?: number }) {
  const s = CATEGORY_STYLE[category];
  return (
    <span className="art-chip" style={{ background: s.bg, width: size, height: size, borderRadius: size * 0.32 }} aria-hidden="true">
      <Art name={s.art} size={Math.round(size * 0.68)} />
    </span>
  );
}

/** Avatars: art on a tinted circle. */
export const AVATAR_STYLES: { id: string; label: string; art: ArtName; bg: string }[] = [
  { id: "star", label: "Star", art: "glowing-star", bg: "#fff2cc" },
  { id: "moon", label: "Moon", art: "moon", bg: "#e3e8f6" },
  { id: "sun", label: "Sun", art: "sun", bg: "#ffe8d6" },
  { id: "leaf", label: "Clover", art: "clover", bg: "#dff4e8" },
  { id: "flower", label: "Flower", art: "flower", bg: "#fde4ea" },
  { id: "bird", label: "Bird", art: "bird", bg: "#deecfa" },
  { id: "fish", label: "Fish", art: "fish", bg: "#d9f1f1" },
  { id: "rocket", label: "Rocket", art: "rocket", bg: "#e8e8fb" },
  { id: "cat", label: "Cat", art: "cat", bg: "#fff0c9" },
  { id: "camel", label: "Camel", art: "camel", bg: "#ffe8d6" },
  { id: "palm", label: "Palm tree", art: "palm", bg: "#dff4e8" },
  { id: "rainbow", label: "Rainbow", art: "rainbow", bg: "#e6f0fa" },
];

// Older avatar IDs from the first prototype build.
const LEGACY: Record<string, { art: ArtName; bg: string }> = {
  lantern: { art: "night", bg: "#e3e8f6" },
};

export function Avatar({ id, size = 48, ring = false }: { id: string; size?: number; ring?: boolean }) {
  const a = AVATAR_STYLES.find((x) => x.id === id) ?? LEGACY[id] ?? AVATAR_STYLES[0];
  return (
    <span className={`avatar${ring ? " ring" : ""}`} style={{ width: size, height: size, background: a.bg }} aria-hidden="true">
      <Art name={a.art} size={Math.round(size * 0.66)} />
    </span>
  );
}

export const DUA_CATEGORY_ART: Record<string, ArtName> = {
  eating: "plate",
  sleep: "bed",
  wake: "sunrise",
  bathroom: "soap",
  home: "house",
  rabbana: "palms-up",
  smile: "smile",
};

/** Brand mark: crescent and star. Replaces the cartoon mascot until a commissioned mascot exists (D-4). */
export function BrandMark({ size = 56, inverted = false }: { size?: number; inverted?: boolean }) {
  const fg = inverted ? "#ffffff" : "#0e5c4f";
  const star = inverted ? "#f2c14e" : "#c98a12";
  const maskId = inverted ? "ds-crescent-inv" : "ds-crescent";
  // Five-point star centred at (44, 24).
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 7.5 : 3.2;
    pts.push(`${(44 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="37" cy="27" r="15" fill="#000" />
        </mask>
      </defs>
      {!inverted && <rect width="64" height="64" rx="18" fill="#e4f0ec" />}
      <circle cx="29" cy="34" r="18" fill={fg} mask={`url(#${maskId})`} />
      <polygon points={pts.join(" ")} fill={star} />
    </svg>
  );
}
