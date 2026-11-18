import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Check, ChevronRight, Star } from "lucide-react";
import { Art, ArtName, Banner, SectionHeader } from "../components/ui";
import { db } from "../firebase";
import { useConfig } from "../data";
import { BackLink, ProgressBar } from "../components/common";
import { CategoryChip } from "../components/icons";
import { Activity, Child, Completion, displayTitle, Theme } from "../types";
import { addDays, weekKeyFromDayKey } from "../time";
import { formatHijri, HijriDate, Season } from "../hijri";

const THEME_ART: Record<string, ArtName> = { heart: "heart", sun: "sun", shield: "shield", gift: "gift", hourglass: "hourglass", sparkles: "sparkles" };

export function useCompletionsBetween(childId: string, from: string, to: string) {
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
    return <Banner tone="night" art="moon" wide badge={`Day ${season.day}`} title="Ramadan Mubarak" sub="Open today's Ramadan deed" onClick={() => props.onOpen("ramadan")} />;
  }
  if (season.kind === "eidFitr" || season.kind === "eidAdha") {
    return <Banner tone="orange" art="party" wide badge={season.kind === "eidFitr" ? "Eid al-Fitr" : "Eid al-Adha"} title="Eid Mubarak!" sub="Eid activities" onClick={() => props.onOpen("eid")} />;
  }
  if (props.daysToRamadan != null && props.daysToRamadan <= 60) {
    return (
      <Banner
        tone="night"
        art="moon"
        wide
        title={`Ramadan in ${props.daysToRamadan} ${props.daysToRamadan === 1 ? "day" : "days"}`}
        sub={`In sha Allah · ${formatHijri(props.hijri)}`}
      />
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
  const art = THEME_ART[theme.icon] ?? "sparkles";
  const deeds = theme.activityIds.map((id) => activities.find((a) => a.id === id)).filter(Boolean) as Activity[];
  if (deeds.length === 0) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="art-chip" style={{ background: "var(--c-manners-bg)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true"><Art name={art} size={36} /></span>
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
    <div className="screen reading">
      <BackLink onClick={props.onBack} />
      <div className="hero night stack" style={{ gap: 12 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="faint small strong">Ramadan Mubarak</span>
            <h1 style={{ color: "#fff" }}>Day {props.day}</h1>
          </div>
          <Art name="moon" size={72} />
        </div>
        <ProgressBar value={doneDays.size / 30} label="Ramadan days with a good deed" />
        <span className="faint small">{doneDays.size} Ramadan days with a good deed</span>
      </div>

      {todays && (
        <>
          <SectionHeader title="Today's Ramadan deed" />
          <div className="list">
            <DeedRow a={todays} c={props.completions[todays.id]} onOpen={props.onOpen} />
          </div>
        </>
      )}

      <SectionHeader title="My Ramadan calendar" />
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
          <Art name="medal" size={56} />
          <div>
            <h3>Ramadan Star</h3>
            <p className="muted small">Good deeds on {doneDays.size} days of Ramadan. Masha Allah!</p>
          </div>
        </div>
      )}

      {others.length > 0 && (
        <>
          <SectionHeader title="More Ramadan deeds" />
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
    <div className="screen reading">
      <BackLink onClick={props.onBack} />
      <Banner tone="orange" art="party" wide badge={name} title="Eid Mubarak!" sub="A happy day to thank Allah and share with family." />
      <SectionHeader title="Eid activities" />
      <div className="list">
        {items.map((a) => (
          <DeedRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
    </div>
  );
}
