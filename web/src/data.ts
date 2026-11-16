import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Activity, Approval, Child, Completion } from "./types";
import { dayKeyFor, weekKeyFromDayKey } from "./time";

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

export function useToday(child: Child) {
  // Recompute when the tab regains focus so the day rolls over correctly.
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

export function useTodayCompletions(childId: string, dayKey: string) {
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

export function useStarRollups(childId: string, dayKey: string, weekKey: string) {
  const [stars, setStars] = useState({ total: 0, today: 0, week: 0, month: 0 });
  useEffect(() => {
    return onSnapshot(collection(db, "children", childId, "rollups"), (snap) => {
      const get = (id: string) => (snap.docs.find((d) => d.id === id)?.data()?.stars as number | undefined) ?? 0;
      setStars({
        total: get("total"),
        today: get(`d_${dayKey}`),
        week: get(`w_${weekKey}`),
        month: get(`m_${dayKey.slice(0, 7)}`),
      });
    });
  }, [childId, dayKey, weekKey]);
  return stars;
}

export function usePendingApprovals(children: Child[]) {
  const [byChild, setByChild] = useState<Record<string, Approval[]>>({});
  const ids = useMemo(() => children.map((c) => c.id).join(","), [children]);
  useEffect(() => {
    const unsubs = children.map((c) =>
      onSnapshot(
        query(collection(db, "children", c.id, "parentApprovals"), where("status", "==", "pending")),
        (snap) =>
          setByChild((prev) => ({
            ...prev,
            [c.id]: snap.docs
              .map((d) => ({ id: d.id, childId: c.id, ...(d.data() as Omit<Approval, "id" | "childId">) }))
              .sort((a, b) => b.dayKey.localeCompare(a.dayKey)),
          })),
      ),
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return byChild;
}

/** Activities a child sees today: matching age group; Jummah items only on Friday (or simulated Friday). */
export function activitiesForChild(all: Activity[], child: Child, friday: boolean): Activity[] {
  return all.filter(
    (a) => a.ageEligibility?.ageGroups?.includes(child.ageGroup) && (a.frequency !== "jummahOnly" || friday),
  );
}
