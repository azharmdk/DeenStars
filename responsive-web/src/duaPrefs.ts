import { useCallback, useState } from "react";
import { safeStorage } from "./storage";

/**
 * Favourite and recently viewed duas. Stored on this device only (no server write, no account,
 * no child data). Ids are dua ids such as "dua_before_sleeping".
 */
const FAV_KEY = "ds_dua_fav";
const RECENT_KEY = "ds_dua_recent";
export const RECENT_MAX = 6;

function read(key: string): string[] {
  try {
    const v = JSON.parse(safeStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function write(key: string, ids: string[]) {
  safeStorage.setItem(key, JSON.stringify(ids));
}

/** Pure helpers, easy to test. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
}
export function pushRecent(ids: string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, max);
}

export function useDuaPrefs() {
  const [favorites, setFavorites] = useState<string[]>(() => read(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY));
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((cur) => {
      const next = toggleId(cur, id);
      write(FAV_KEY, next);
      return next;
    });
  }, []);
  const markViewed = useCallback((id: string) => {
    setRecent((cur) => {
      if (cur[0] === id) return cur;
      const next = pushRecent(cur, id);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);
  return { favorites, recent, toggleFavorite, markViewed };
}
