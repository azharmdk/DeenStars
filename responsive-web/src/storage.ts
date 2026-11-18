/**
 * Safe wrapper around localStorage. In some in-app browsers (and private modes) storage throws or is
 * cleared between visits. This falls back to memory for the current visit and never throws.
 */
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = "__ds_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      const s = ls();
      if (s) return s.getItem(key);
    } catch {
      /* fall through to memory */
    }
    return memory.has(key) ? (memory.get(key) as string) : null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    try {
      ls()?.setItem(key, value);
    } catch {
      /* memory copy is enough */
    }
  },
  removeItem(key: string): void {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/** Test helper: clears the in-memory copy. */
export function _resetMemoryForTests(): void {
  memory.clear();
}