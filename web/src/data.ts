import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Activity, Approval, Category, Child, Completion, Streak } from "./types";
import { dayKeyFor, daysOfWeek, weekKeyFromDayKey } from "./time";

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

/** Activities a child sees today: matching age group; Jummah items only on Friday (or simulated Friday). */
export function activitiesForChild(all: Activity[], child: Child, friday: boolean): Activity[] {
  return all.filter(
    (a) => a.ageEligibility?.ageGroups?.includes(child.ageGroup) && (a.frequency !== "jummahOnly" || friday),
  );
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
