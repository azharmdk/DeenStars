import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Activity, Approval, Category, Child, Completion, LearnState, Streak } from "./types";
import { dayKeyFor, daysOfWeek, weekKeyFromDayKey } from "./time";
import { countryForTimeZone, daysUntilRamadan, hijriForDayKey, Season, seasonFor, totalAdjust } from "./hijri";
import { testerToolsEnabled } from "./devFlags";

export function useAuthUser(): { user: User | null; ready: boolean } {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, ready: true })), []);
  return state;
}

export interface ParentDoc {
  consent?: { version?: string };
  pin?: { hash?: string };
  childCount?: number;
}

export function useParentDoc(uid: string | undefined) {
  const [state, setState] = useState<{ data: ParentDoc | null; ready: boolean }>({ data: null, ready: false });
  useEffect(() => {
    if (!uid) return;
    setState({ data: null, ready: false });
    return onSnapshot(
      doc(db, "parents", uid),
      (snap) => setState({ data: (snap.data() as ParentDoc) ?? null, ready: true }),
      () => setState({ data: null, ready: true }),
    );
  }, [uid]);
  return state;
}

export function useChildren(uid: string | undefined) {
  const [state, setState] = useState<{ children: Child[]; ready: boolean }>({ children: [], ready: false });
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "children"), where("ownerUid", "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        const children = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Child, "id">) }))
          .sort((a, b) => a.nickname.localeCompare(b.nickname));
        setState({ children, ready: true });
      },
      () => setState({ children: [], ready: true }),
    );
  }, [uid]);
  return state;
}

let activityCache: Activity[] | null = null;

export function useActivities() {
  const [activities, setActivities] = useState<Activity[] | null>(activityCache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (activityCache) return;
    getDocs(query(collection(db, "activities"), orderBy("sortOrder")))
      .then((snap) => {
        activityCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, "id">) }));
        setActivities(activityCache);
      })
      .catch(() => setError(true));
  }, []);
  return { activities, error };
}

/** Current local day for a child. Recomputed on focus and every minute so the day rolls over. */
export function useToday(child: Child) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const onVis = () => setNow(new Date());
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(onVis, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);
  const dayKey = dayKeyFor(now, child.timeZone);
  return { dayKey, weekKey: weekKeyFromDayKey(dayKey), now };
}

export function useCompletionsForDay(childId: string, dayKey: string) {
  const [map, setMap] = useState<Record<string, Completion>>({});
  useEffect(() => {
    const q = query(collection(db, "children", childId, "checklistCompletions"), where("dayKey", "==", dayKey));
    return onSnapshot(q, (snap) => {
      const next: Record<string, Completion> = {};
      snap.docs.forEach((d) => {
        const c = { id: d.id, ...(d.data() as Omit<Completion, "id">) };
        next[c.activityId] = c;
      });
      setMap(next);
    });
  }, [childId, dayKey]);
  return map;
}

export const useTodayCompletions = useCompletionsForDay;

interface RollupDoc {
  stars?: number;
  count?: number;
  countByCategory?: Partial<Record<Category, number>>;
}

function useRollups(childId: string) {
  const [docs, setDocs] = useState<Record<string, RollupDoc>>({});
  useEffect(() => {
    return onSnapshot(collection(db, "children", childId, "rollups"), (snap) => {
      const next: Record<string, RollupDoc> = {};
      snap.docs.forEach((d) => (next[d.id] = d.data() as RollupDoc));
      setDocs(next);
    });
  }, [childId]);
  return docs;
}

export function useStarRollups(childId: string, dayKey: string, weekKey: string) {
  const docs = useRollups(childId);
  return {
    total: docs.total?.stars ?? 0,
    today: docs[`d_${dayKey}`]?.stars ?? 0,
    week: docs[`w_${weekKey}`]?.stars ?? 0,
    month: docs[`m_${dayKey.slice(0, 7)}`]?.stars ?? 0,
  };
}

export interface WeekSummary {
  stars: number;
  items: number;
  activeDays: number;
  byCategory: Partial<Record<Category, number>>;
}

/** Weekly report numbers, read from server-written rollups. */
export function useWeekSummary(child: Child, dayKey: string): WeekSummary {
  const docs = useRollups(child.id);
  const week = docs[`w_${weekKeyFromDayKey(dayKey)}`];
  const activeDays = daysOfWeek(dayKey).filter((d) => (docs[`d_${d}`]?.stars ?? 0) > 0).length;
  return { stars: week?.stars ?? 0, items: week?.count ?? 0, activeDays, byCategory: week?.countByCategory ?? {} };
}

export function useStreaks(childId: string) {
  const [streaks, setStreaks] = useState<Record<string, Streak>>({});
  useEffect(() => {
    return onSnapshot(collection(db, "children", childId, "streaks"), (snap) => {
      const next: Record<string, Streak> = {};
      snap.docs.forEach((d) => (next[d.id] = d.data() as Streak));
      setStreaks(next);
    });
  }, [childId]);
  return streaks;
}

/** Pending approvals for each child. Items past their expiry are hidden (the server expires them). */
export function usePendingApprovals(children: Child[]) {
  const [byChild, setByChild] = useState<Record<string, Approval[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const ids = useMemo(() => children.map((c) => c.id).join(","), [children]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const unsubs = children.map((c) =>
      onSnapshot(query(collection(db, "children", c.id, "parentApprovals"), where("status", "==", "pending")), (snap) =>
        setByChild((prev) => ({
          ...prev,
          [c.id]: snap.docs.map((d) => ({ id: d.id, childId: c.id, ...(d.data() as Omit<Approval, "id" | "childId">) })),
        })),
      ),
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(() => {
    const live: Record<string, Approval[]> = {};
    for (const [k, list] of Object.entries(byChild)) {
      live[k] = list.filter((a) => !a.expiresAt || a.expiresAt.toMillis() > now);
    }
    return live;
  }, [byChild, now]);
}

/**
 * Activities a child sees today: matching age group. Jummah items only on Friday, Ramadan items only
 * in Ramadan, Eid items only at Eid (each can be simulated by tester tools).
 */
export function activitiesForChild(all: Activity[], child: Child, friday: boolean, season: Season = { kind: "none" }): Activity[] {
  return all.filter((a) => {
    if (!a.ageEligibility?.ageGroups?.includes(child.ageGroup)) return false;
    if (a.frequency === "jummahOnly") return friday;
    if (a.frequency === "ramadanOnly") return season.kind === "ramadan";
    if (a.frequency === "eidOnly") return season.kind === "eidFitr" || season.kind === "eidAdha";
    return true;
  });
}

// ---------- Learning content and configuration ----------

const docCache = new Map<string, unknown>();

/** Reads an appConfiguration document once and caches it for the session. */
export function useConfig<T>(id: string): T | null {
  const [data, setData] = useState<T | null>((docCache.get(`cfg/${id}`) as T) ?? null);
  useEffect(() => {
    if (docCache.has(`cfg/${id}`)) return;
    getDoc(doc(db, "appConfiguration", id))
      .then((snap) => {
        const v = (snap.data() as T) ?? null;
        docCache.set(`cfg/${id}`, v);
        setData(v);
      })
      .catch(() => setData(null));
  }, [id]);
  return data;
}

/** Reads a published content collection once (duaLibrary, surahLibrary, stories) sorted by sortOrder. */
export function useLibrary<T extends { sortOrder: number }>(name: "duaLibrary" | "surahLibrary" | "stories") {
  const [items, setItems] = useState<T[] | null>((docCache.get(`lib/${name}`) as T[]) ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (docCache.has(`lib/${name}`)) return;
    getDocs(collection(db, name))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as unknown as T).sort((a, b) => a.sortOrder - b.sortOrder);
        docCache.set(`lib/${name}`, list);
        setItems(list);
      })
      .catch(() => setError(true));
  }, [name]);
  return { items, error };
}

export function useLearningProgress(childId: string, kind: "dua" | "surah") {
  const [map, setMap] = useState<Record<string, LearnState>>({});
  useEffect(() => {
    return onSnapshot(collection(db, "children", childId, kind === "dua" ? "duaProgress" : "surahProgress"), (snap) => {
      const next: Record<string, LearnState> = {};
      snap.docs.forEach((d) => (next[d.id] = (d.data().state as LearnState) ?? "notStarted"));
      setMap(next);
    });
  }, [childId, kind]);
  return map;
}

export interface LearnedItem {
  itemId: string;
  kind: "dua" | "surah";
  learnedDayKey?: string;
}

export function useLearnedItems(childId: string) {
  const [items, setItems] = useState<LearnedItem[]>([]);
  useEffect(() => {
    const unsubs = (["duaProgress", "surahProgress"] as const).map((col) =>
      onSnapshot(query(collection(db, "children", childId, col), where("state", "==", "learned")), (snap) => {
        const kind = col === "duaProgress" ? "dua" : "surah";
        setItems((prev) => [
          ...prev.filter((p) => p.kind !== kind),
          ...snap.docs.map((d) => ({ itemId: d.id, kind, learnedDayKey: d.data().learnedDayKey as string | undefined }) as LearnedItem),
        ]);
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [childId]);
  return items;
}

// ---------- Seasons (Ramadan, Eid) ----------

export interface HijriSettings {
  country?: string | null;
  adjust?: number;
}

export function useParentHijriSettings(): HijriSettings {
  const [s, setS] = useState<HijriSettings>({});
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, "parents", uid), (snap) => setS((snap.data()?.settings?.hijri as HijriSettings) ?? {}));
  }, []);
  return s;
}

export const SIM_SEASON_KEY = "ds_sim_season";

/** Season for a child today, from the region (time zone or parent override) and adjustments. */
export function useSeason(child: Child, dayKey: string) {
  const config = useConfig<{ defaultAdjust: number; adjustByCountry: Record<string, number> }>("hijri");
  const settings = useParentHijriSettings();
  const country = settings.country || countryForTimeZone(child.timeZone);
  const adjust = totalAdjust(config, country, settings.adjust ?? 0);
  const hijri = hijriForDayKey(dayKey, adjust);
  let season = seasonFor(hijri);
  const sim = testerToolsEnabled ? localStorage.getItem(SIM_SEASON_KEY) : null;
  if (sim) {
    const [kind, day] = sim.split(":");
    if (kind === "ramadan" || kind === "eidFitr" || kind === "eidAdha") season = { kind, day: Number(day) || 1 } as Season;
  }
  return { season, hijri, country, adjust, daysToRamadan: season.kind === "ramadan" ? 0 : daysUntilRamadan(dayKey, adjust) };
}

/**
 * "Today" moment: one featured item per day, chosen deterministically from the child's list so it is
 * stable all day. Prefers "do it together" deeds and good deeds. Content stays data-driven.
 */
export function featuredForDay(items: Activity[], dayKey: string): Activity | undefined {
  const pool = items.filter((a) => a.together || a.category === "goodDeed");
  const list = pool.length ? pool : items;
  if (list.length === 0) return undefined;
  let h = 0;
  for (const ch of dayKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
