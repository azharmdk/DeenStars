import type { ArtName, Tone } from "../components/ui";

/**
 * Game registry. Adding a game means adding one entry here and one component in Play.tsx's
 * GAME_VIEWS. Games marked "soon" show as coming-soon cards and are never picked as the daily game.
 *
 * Design rules for every game (docs/GAME_ENGINE.md): 2D only, light and fast to load, no timers,
 * no lives, no deductions, gentle feedback, tap controls with large targets.
 * Content here is SAMPLE content for the website prototype. It moves to Firestore (`games`,
 * `gameContent`) with the reviewed content pipeline; nothing here makes Quran or Hadith claims.
 */
export type GameId = "kindness-quiz" | "picture-matching" | "find-the-mosque";

export interface GameInfo {
  id: string;
  title: string;
  art: ArtName;
  tone: Tone;
  status: "available" | "soon";
  /** One line shown on the card. */
  blurb: string;
  /** Can be the featured game of the day. */
  daily?: boolean;
}

export const GAMES: GameInfo[] = [
  { id: "find-the-mosque", title: "Find the Mosque", art: "mosque", tone: "teal", status: "available", blurb: "Tap the masjid. It gets trickier!", daily: true },
  { id: "kindness-quiz", title: "Kindness Quiz", art: "question", tone: "blue", status: "available", blurb: "Kind choices for everyday moments", daily: true },
  { id: "picture-matching", title: "Picture Matching", art: "cards", tone: "pink", status: "available", blurb: "Find the matching pictures", daily: true },
  // Planned. Architecture only for now; see docs/WEBSITE_IMPROVEMENTS.md.
  { id: "good-deeds-collector", title: "Good Deeds Collector", art: "sparkling-heart", tone: "green", status: "soon", blurb: "Walk the map and collect good deeds" },
  { id: "journey-to-the-masjid", title: "Journey to the Masjid", art: "door", tone: "blue", status: "soon", blurb: "Guide the way to the masjid" },
  { id: "ramadan-lantern-quest", title: "Ramadan Lantern Quest", art: "night", tone: "night", status: "soon", blurb: "Collect lanterns before sunset" },
  { id: "kindness-adventure", title: "Kindness Adventure", art: "heart", tone: "orange", status: "soon", blurb: "Help friends with good manners" },
];

/** Games that can be the daily challenge, in rotation order. */
export function dailyPool(): GameId[] {
  return GAMES.filter((g) => g.status === "available" && g.daily).map((g) => g.id as GameId);
}

export function gameInfo(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
