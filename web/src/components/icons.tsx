/**
 * Single source of icons (Lucide, ISC licence, bundled, no network). Placeholder until the
 * commissioned DeenStars illustration and icon set exists (docs/DESIGN_SYSTEM.md section 6).
 */
import type { LucideIcon } from "lucide-react";
import {
  Bird,
  BookOpen,
  DoorOpen,
  Flower2,
  HandHeart,
  Heart,
  Lamp,
  Landmark,
  Leaf,
  MoonStar,
  Moon,
  Rabbit,
  Rainbow,
  Rocket,
  ShowerHead,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Sunrise,
  TreePalm,
  Utensils,
  Bed,
  Fish,
  Cat,
} from "lucide-react";
import type { Category } from "../types";

export const CATEGORY_STYLE: Record<Category, { label: string; Icon: LucideIcon; fg: string; bg: string }> = {
  dailyHabit: { label: "Habits", Icon: Sprout, fg: "var(--c-habit)", bg: "var(--c-habit-bg)" },
  salah: { label: "Salah", Icon: Landmark, fg: "var(--c-salah)", bg: "var(--c-salah-bg)" },
  quran: { label: "Quran", Icon: BookOpen, fg: "var(--c-quran)", bg: "var(--c-quran-bg)" },
  dua: { label: "Duas", Icon: HandHeart, fg: "var(--c-dua)", bg: "var(--c-dua-bg)" },
  manners: { label: "Manners", Icon: Heart, fg: "var(--c-manners)", bg: "var(--c-manners-bg)" },
  goodDeed: { label: "Good Deeds", Icon: Sparkles, fg: "var(--c-deed)", bg: "var(--c-deed-bg)" },
  jummah: { label: "Jummah", Icon: MoonStar, fg: "var(--c-jummah)", bg: "var(--c-jummah-bg)" },
};

export function CategoryChip({ category, size = 44 }: { category: Category; size?: number }) {
  const s = CATEGORY_STYLE[category];
  return (
    <span className="icon-chip" style={{ background: s.bg, color: s.fg, width: size, height: size, borderRadius: size * 0.28 }} aria-hidden="true">
      <s.Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}

/** Avatars: simple icon on a tinted circle. IDs are stored on the child profile. */
export const AVATAR_STYLES: { id: string; label: string; Icon: LucideIcon; fg: string; bg: string }[] = [
  { id: "star", label: "Star", Icon: Star, fg: "#9a6410", bg: "#fbf1dc" },
  { id: "moon", label: "Moon", Icon: Moon, fg: "#2a3a6a", bg: "#e6eaf4" },
  { id: "sun", label: "Sun", Icon: Sun, fg: "#a2531a", bg: "#fbe9dc" },
  { id: "leaf", label: "Leaf", Icon: Leaf, fg: "#2f7d5b", bg: "#e6f2ec" },
  { id: "flower", label: "Flower", Icon: Flower2, fg: "#a1475a", bg: "#f8e8eb" },
  { id: "bird", label: "Bird", Icon: Bird, fg: "#2f5d8a", bg: "#e5edf6" },
  { id: "fish", label: "Fish", Icon: Fish, fg: "#1f7377", bg: "#e2f1f1" },
  { id: "rocket", label: "Rocket", Icon: Rocket, fg: "#4a4f96", bg: "#ecebf7" },
];

// Older avatar IDs from the first prototype build.
const LEGACY: Record<string, { Icon: LucideIcon; fg: string; bg: string }> = {
  lantern: { Icon: Lamp, fg: "#9a6410", bg: "#fbf1dc" },
  camel: { Icon: Rabbit, fg: "#a2531a", bg: "#fbe9dc" },
  cat: { Icon: Cat, fg: "#4a4f96", bg: "#ecebf7" },
  palm: { Icon: TreePalm, fg: "#2f7d5b", bg: "#e6f2ec" },
  rainbow: { Icon: Rainbow, fg: "#a1475a", bg: "#f8e8eb" },
};

export function Avatar({ id, size = 48 }: { id: string; size?: number }) {
  const a = AVATAR_STYLES.find((x) => x.id === id) ?? LEGACY[id] ?? AVATAR_STYLES[0];
  return (
    <span className="avatar" style={{ width: size, height: size, background: a.bg, color: a.fg }} aria-hidden="true">
      <a.Icon size={size * 0.48} strokeWidth={2} />
    </span>
  );
}

export const DUA_ICONS: Record<string, LucideIcon> = {
  eat_before: Utensils,
  eat_after: Smile,
  sleep: Bed,
  wake: Sunrise,
  bathroom: ShowerHead,
  home: DoorOpen,
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
