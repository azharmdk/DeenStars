import { Check } from "lucide-react";
import { BadgeRule, DayStreak, StarEntry, useConfig, useEarnedBadges, useLibrary, useProgressSummary, useStarHistory } from "../data";
import { relativeDayLabel } from "../time";
import { Activity, displayTitle, Dua, Surah } from "../types";
import { Art, ArtName } from "./ui";

/**
 * Star history, day streak and badges (Fix 3). Everything here is read from server-written data.
 * Positive only: no broken streaks, no "missed" days, no lost badges.
 */

/** A day streak is shown only while it is alive and at least 2 days long (same rule as activity streaks). */
export function activeDayStreak(s: DayStreak | undefined, today: string): number {
  if (!s || s.current < 2 || !s.activeThroughDayKey || today > s.activeThroughDayKey) return 0;
  return s.current;
}

export function DayStreakCard({ childId, today }: { childId: string; today: string }) {
  const summary = useProgressSummary(childId);
  const n = activeDayStreak(summary?.dayStreak, today);
  if (!n) return null;
  return (
    <div className="card row day-streak" role="status">
      <Art name="calendar" size={44} />
      <span className="stack" style={{ gap: 2 }}>
        <span className="strong">{n}-day streak</span>
        <span className="small muted">Stars earned {n} days in a row. Keep going!</span>
      </span>
    </div>
  );
}

function badgeHint(b: BadgeRule, totalStars: number): string {
  if (b.type === "totalStars" && b.threshold) return `${Math.max(0, b.threshold - totalStars)} stars to go`;
  return b.description;
}

export function BadgeGrid({ childId, totalStars }: { childId: string; totalStars: number }) {
  const config = useConfig<{ badges: BadgeRule[] }>("badges");
  const earned = useEarnedBadges(childId);
  const rules = [...(config?.badges ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (rules.length === 0) return null;
  return (
    <div className="badge-grid" role="list" aria-label="Badges">
      {rules.map((b) => {
        const got = b.id in earned;
        return (
          <div key={b.id} role="listitem" className={`badge-card${got ? "" : " dim"}`} aria-label={`${b.title}${got ? ", earned" : ""}`}>
            <Art name={b.art as ArtName} size={52} />
            <span>{b.title}</span>
            {got ? (
              <span className="status done">
                <Check size={12} aria-hidden="true" />
                Earned
              </span>
            ) : (
              <span className="faint">{badgeHint(b, totalStars)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Badges a child has earned, as small chips (parent report). */
export function EarnedBadgeChips({ childId }: { childId: string }) {
  const config = useConfig<{ badges: BadgeRule[] }>("badges");
  const earned = useEarnedBadges(childId);
  const list = (config?.badges ?? []).filter((b) => b.id in earned).sort((a, b) => a.sortOrder - b.sortOrder);
  if (list.length === 0) return null;
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }} aria-label="Badges earned">
      {list.map((b) => (
        <span key={b.id} className="badge-chip">
          <Art name={b.art as ArtName} size={18} />
          {b.title}
        </span>
      ))}
    </div>
  );
}

function entryTitle(e: StarEntry, activities: Activity[], duas: Dua[] | null, surahs: Surah[] | null): string {
  if (e.sourceType === "activity") return displayTitle(activities.find((a) => a.id === e.sourceId)?.title.en ?? "An activity");
  if (e.sourceType === "dua") return duas?.find((d) => d.id === e.sourceId)?.title ?? "A dua";
  if (e.sourceType === "surah") {
    const s = surahs?.find((x) => x.id === e.sourceId);
    return s ? `Surah ${s.nameTransliterated}` : "A Surah";
  }
  return "Stars";
}

function entryHow(e: StarEntry, activities: Activity[]): string {
  if (e.sourceType === "dua" || e.sourceType === "surah") return "learned by heart";
  const a = activities.find((x) => x.id === e.sourceId);
  return a?.verification === "parent" ? "approved" : "done";
}

/** What earned each star, newest first (Fix 3.1). */
export function StarHistory({ childId, today, activities, max = 20 }: { childId: string; today: string; activities: Activity[]; max?: number }) {
  const items = useStarHistory(childId, max);
  const duas = useLibrary<Dua>("duaLibrary").items;
  const surahs = useLibrary<Surah>("surahLibrary").items;
  if (!items) return <p className="small muted">Loading…</p>;
  if (items.length === 0) return <p className="small muted">Stars will show here as they are earned.</p>;
  return (
    <ul className="list star-history" aria-label="Star history">
      {items.map((e) => (
        <li key={e.id} className="list-item" style={{ cursor: "default" }}>
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span className="strong">{entryTitle(e, activities, duas, surahs)}</span>
            <span className="small faint">
              {entryHow(e, activities)} {relativeDayLabel(e.dayKey, today).replace(/^Today$/, "today").replace(/^Yesterday$/, "yesterday")}
            </span>
          </span>
          <span className="star-gain" aria-label={`plus ${e.amount} ${e.amount === 1 ? "star" : "stars"}`}>
            +{e.amount}
            <Art name="glowing-star" size={20} />
          </span>
        </li>
      ))}
    </ul>
  );
}
