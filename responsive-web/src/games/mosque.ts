/**
 * Find the Mosque. Pure module (no React) so rounds can be unit tested.
 * A round shows several pictures and one of them is the masjid. The player taps the masjid.
 * Levels add pictures and rounds. Nothing is timed and a wrong tap costs nothing.
 */
import type { ArtName } from "../components/ui";

export interface MosqueLevel {
  index: number;
  label: string;
  /** Pictures on screen in each round. */
  spots: number;
  /** Rounds to finish the level. */
  rounds: number;
  columns: number;
}

export const MOSQUE_LEVELS: MosqueLevel[] = [
  { index: 0, label: "Level 1", spots: 3, rounds: 3, columns: 3 },
  { index: 1, label: "Level 2", spots: 4, rounds: 3, columns: 2 },
  { index: 2, label: "Level 3", spots: 6, rounds: 4, columns: 3 },
  { index: 3, label: "Level 4", spots: 9, rounds: 4, columns: 3 },
  { index: 4, label: "Expert", spots: 12, rounds: 5, columns: 4 },
];

export interface Spot {
  key: string;
  art: ArtName;
  label: string;
  target: boolean;
}

const TARGET: Omit<Spot, "key"> = { art: "mosque", label: "Masjid", target: true };
const DECOYS: Omit<Spot, "key">[] = [
  { art: "house", label: "House", target: false },
  { art: "palm", label: "Date palm", target: false },
  { art: "camel", label: "Camel", target: false },
  { art: "flower", label: "Flower", target: false },
  { art: "rainbow", label: "Rainbow", target: false },
  { art: "door", label: "Door", target: false },
  { art: "cat", label: "Cat", target: false },
  { art: "bird", label: "Bird", target: false },
  { art: "fish", label: "Fish", target: false },
  { art: "clover", label: "Clover", target: false },
  { art: "moon", label: "Crescent moon", target: false },
];

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One round for a level: exactly one masjid among distinct other pictures, in random places. */
export function makeRound(level: MosqueLevel, rng: () => number = Math.random): Spot[] {
  const decoys = shuffled(DECOYS, rng).slice(0, level.spots - 1);
  return shuffled([TARGET, ...decoys], rng).map((s, i) => ({ ...s, key: `${s.art}-${i}` }));
}

/** After this many wrong taps in a round the masjid gently glows. */
export const HINT_AFTER = 2;

/** Stars for finishing a level: one per round. Participation based, never reduced by wrong taps. */
export function starsForLevel(level: MosqueLevel): number {
  return level.rounds;
}
