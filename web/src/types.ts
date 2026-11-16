export type AgeGroup = "3-4" | "5" | "6";
export type Difficulty = "gentle" | "standard" | "challenge";
export type Category = "dailyHabit" | "salah" | "quran" | "dua" | "manners" | "goodDeed" | "jummah";

export interface Child {
  id: string;
  nickname: string;
  avatarId: string;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  timeZone: string;
  birthYear: number;
  birthMonth: number;
  totals?: { stars?: number };
}

export interface Activity {
  id: string;
  title: { en: string };
  description: { en: string };
  educationalExplanation: { en: string };
  category: Category;
  ageEligibility: { ageGroups: AgeGroup[] };
  starRuleKey: string;
  verification: "self" | "parent";
  frequency: "daily" | "jummahOnly" | "weekly" | "once";
  isPlaceholder?: boolean;
  sortOrder: number;
}

export interface Completion {
  id: string;
  activityId: string;
  status: "done" | "pending" | "declined";
  starsAwarded?: number;
}

export interface Approval {
  id: string;
  childId: string;
  activityId: string;
  activityTitleSnapshot: { en: string };
  dayKey: string;
  status: "pending" | "approved" | "declined";
  stars: number;
}

export const CATEGORY_INFO: Record<Category, { label: string; emoji: string; color: string }> = {
  dailyHabit: { label: "Habits", emoji: "🌱", color: "var(--mint)" },
  salah: { label: "Salah", emoji: "🕌", color: "var(--sky-soft)" },
  quran: { label: "Quran", emoji: "📖", color: "var(--lavender-soft)" },
  dua: { label: "Duas", emoji: "🤲", color: "var(--gold-soft)" },
  manners: { label: "Manners", emoji: "💛", color: "var(--coral-soft)" },
  goodDeed: { label: "Good Deeds", emoji: "🌟", color: "var(--gold-soft)" },
  jummah: { label: "Jummah", emoji: "🌙", color: "var(--sky-soft)" },
};

export const AVATARS: { id: string; emoji: string; label: string }[] = [
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "moon", emoji: "🌙", label: "Moon" },
  { id: "lantern", emoji: "🏮", label: "Lantern" },
  { id: "camel", emoji: "🐪", label: "Camel" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "palm", emoji: "🌴", label: "Palm tree" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "flower", emoji: "🌸", label: "Flower" },
];

export function avatarEmoji(id: string): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? "⭐";
}
