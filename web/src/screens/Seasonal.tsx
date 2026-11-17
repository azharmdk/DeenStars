import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { LucideIcon } from "lucide-react";
import { Award, Check, ChevronRight, Gift, Heart, Hourglass, MoonStar, Shield, Sparkles, Star, Sun } from "lucide-react";
import { db } from "../firebase";
import { useConfig } from "../data";
import { BackLink, ProgressBar } from "../components/common";
import { CategoryChip } from "../components/icons";
import { Activity, Child, Completion, displayTitle, Theme } from "../types";
import { addDays, weekKeyFromDayKey } from "../time";
import { formatHijri, HijriDate, Season } from "../hijri";

const THEME_ICONS: Record<string, LucideIcon> = { heart: Heart, sun: Sun, shield: Shield, gift: Gift, hourglass: Hourglass, sparkles: Sparkles };

function useCompletionsBetween(childId: string, from: string, to: string) {
  const [list, setList] = useState<Completion[]>([]);
  useEffect(() => {
    const q = query(collection(db, "children", childId, "checklistCompletions"), where("dayKey", ">=", from), where("dayKey", "<=", to));
    return onSnapshot(q, (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Completion, "id">) }))));
  }, [childId, from, to]);
  return list;
}

function DeedRow({ a, c, onOpen }: { a: Activity; c?: Completion; onOpen: (a: Activity) => void }) {
  return (
    <button className="list-item" onClick={() => onOpen(a)}>
      <CategoryChip category={a.category} />
      <span className="title">{displayTitle(a.title.en)}</span>
      {c?.status === "done" ? (
        <span className="check-circle done" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
      ) : c?.status === "pending" ? (
        <span className="status pending">Waiting for grown-up</span>
      ) : (
        <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
      )}
    </button>
  );
}

/** Home card for the current season: Ramadan countdown, Ramadan day, or Eid. */
export function SeasonCard(props: { season: Season; daysToRamadan: number | null; hijri: HijriDate; onOpen: (s: "ramadan" | "eid") => void }) {
  const { season } = props;
  if (season.kind === "ramadan") {
    return (
      <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "var(--c-jummah-bg)", borderColor: "#d3d9ea" }} onClick={() => props.onOpen("ramadan")}>
        <span className="icon-chip" style={{ background: "var(--c-jummah)", color: "#f2c14e" }} aria-hidden="true"><MoonStar size={22} /></span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span>Ramadan Mubarak · Day {season.day}</span>
          <span className="sub">Open today's Ramadan deed</span>
        </span>
        <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
      </button>
    );
  }
  if (season.kind === "eidFitr" || season.kind === "eidAdha") {
    return (
      <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "var(--accent-soft)", borderColor: "#f0dfb5" }} onClick={() => props.onOpen("eid")}>
        <span className="icon-chip" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true"><Gift size={22} /></span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span>Eid Mubarak!</span>
          <span className="sub">{season.kind === "eidFitr" ? "Eid al-Fitr" : "Eid al-Adha"} · Eid activities</span>
        </span>
        <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
      </button>
    );
  }
  if (props.daysToRamadan != null && props.daysToRamadan <= 60) {
    return (
      <div className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", cursor: "default" }}>
        <span className="icon-chip" style={{ background: "var(--c-jummah-bg)", color: "var(--c-jummah)" }} aria-hidden="true"><MoonStar size={22} /></span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span>Ramadan is coming in {props.daysToRamadan} {props.daysToRamadan === 1 ? "day" : "days"}</span>
          <span className="sub">In sha Allah · {formatHijri(props.hijri)}</span>
        </span>
      </div>
    );
  }
  return null;
}

export function ThemeCard({ dayKey, activities, completions, onOpen }: { dayKey: string; activities: Activity[]; completions: Record<string, Completion>; onOpen: (a: Activity) => void }) {
  const config = useConfig<{ themes: Theme[] }>("themes");
  const themes = config?.themes ?? [];
  if (themes.length === 0) return null;
  const week = Number(weekKeyFromDayKey(dayKey).split("-W")[1]);
  const theme = themes[week % themes.length];
  const Icon = THEME_ICONS[theme.icon] ?? Sparkles;
  const deeds = theme.activityIds.map((id) => activities.find((a) => a.id === id)).filter(Boolean) as Activity[];
  if (deeds.length === 0) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="icon-chip" style={{ background: "var(--c-manners-bg)", color: "var(--c-manners)" }} aria-hidden="true"><Icon size={22} /></span>
        <span className="stack" style={{ gap: 0 }}>
          <span className="eyebrow">This week</span>
          <h3>{theme.title}</h3>
        </span>
      </div>
      <p className="small muted">{theme.description}</p>
      <div className="list">
        {deeds.map((a) => (
          <DeedRow key={a.id} a={a} c={completions[a.id]} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function RamadanScreen(props: { child: Child; dayKey: string; day: number; activities: Activity[]; completions: Record<string, Completion>; onOpen: (a: Activity) => void; onBack: () => void }) {
  const config = useConfig<{ dailyActivityIds: string[]; starBadgeDays: number }>("ramadan");
  const start = addDays(props.dayKey, -(props.day - 1));
  const end = addDays(start, 29);
  const history = useCompletionsBetween(props.child.id, start, props.dayKey);
  const ramadanItems = props.activities.filter((a) => a.frequency === "ramadanOnly");
  const ramadanIds = new Set(ramadanItems.map((a) => a.id));
  const doneDays = new Set(history.filter((c) => c.status === "done" && ramadanIds.has(c.activityId)).map((c) => (c as Completion & { dayKey: string }).dayKey));

  const ids = (config?.dailyActivityIds ?? []).filter((id) => ramadanIds.has(id));
  const todaysId = ids.length ? ids[(props.day - 1) % ids.length] : undefined;
  const todays = ramadanItems.find((a) => a.id === todaysId);
  const others = ramadanItems.filter((a) => a.id !== todaysId);
  const badgeDays = config?.starBadgeDays ?? 20;

  return (
    <div className="screen">
      <BackLink onClick={props.onBack} />
      <div className="hero night stack" style={{ gap: 12 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="faint small strong">Ramadan Mubarak</span>
            <h1 style={{ color: "#fff" }}>Day {props.day}</h1>
          </div>
          <MoonStar size={44} color="#f2c14e" aria-hidden="true" />
        </div>
        <ProgressBar value={doneDays.size / 30} label="Ramadan days with a good deed" />
        <span className="faint small">{doneDays.size} Ramadan days with a good deed</span>
      </div>

      {todays && (
        <>
          <span className="section-title">Today's Ramadan deed</span>
          <div className="list">
            <DeedRow a={todays} c={props.completions[todays.id]} onOpen={props.onOpen} />
          </div>
        </>
      )}

      <span className="section-title">My Ramadan calendar</span>
      <div className="ramadan-grid" role="list" aria-label="Ramadan calendar">
        {Array.from({ length: 30 }, (_, i) => {
          const d = i + 1;
          const key = addDays(start, i);
          const done = doneDays.has(key);
          const cls = done ? "done" : d === props.day ? "today" : key > props.dayKey ? "future" : "";
          return (
            <div key={d} role="listitem" className={`ramadan-day ${cls}`} aria-label={`Day ${d}${done ? ", done" : ""}`}>
              {done ? <Star size={16} fill="#f2c14e" aria-hidden="true" /> : null}
              <span>{d}</span>
            </div>
          );
        })}
      </div>
      <span className="tiny faint">Ramadan has 29 or 30 days. The calendar ends on {end} or the day before, depending on the moon.</span>

      {doneDays.size >= badgeDays && (
        <div className="card row" role="status">
          <span className="icon-chip lg" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} aria-hidden="true"><Award size={28} /></span>
          <div>
            <h3>Ramadan Star</h3>
            <p className="muted small">Good deeds on {doneDays.size} days of Ramadan. Masha Allah!</p>
          </div>
        </div>
      )}

      {others.length > 0 && (
        <>
          <span className="section-title">More Ramadan deeds</span>
          <div className="list">
            {others.map((a) => (
              <DeedRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function EidScreen(props: { season: Season; activities: Activity[]; completions: Record<string, Completion>; onOpen: (a: Activity) => void; onBack: () => void }) {
  const items = props.activities.filter((a) => a.frequency === "eidOnly");
  const name = props.season.kind === "eidAdha" ? "Eid al-Adha" : "Eid al-Fitr";
  return (
    <div className="screen">
      <BackLink onClick={props.onBack} />
      <div className="hero stack" style={{ gap: 8, backgroundColor: "#a2531a" }}>
        <span className="faint small strong">{name}</span>
        <h1 style={{ color: "#fff" }}>Eid Mubarak!</h1>
        <span className="faint small">A happy day to thank Allah and share with family.</span>
      </div>
      <span className="section-title">Eid activities</span>
      <div className="list">
        {items.map((a) => (
          <DeedRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
    </div>
  );
}
