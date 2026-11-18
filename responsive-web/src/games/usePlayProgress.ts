import { useCallback, useState } from "react";
import { safeStorage } from "../storage";
import type { Child } from "../types";
import type { GameId } from "./catalog";
import { emptyProgress, parseProgress, PlayProgress, withCompletion } from "./progress";

/** Play progress for one child, kept on this device only (never sent to a server). */
const key = (c: Child) => `ds_play_v1_${c.id}`;

export function usePlayProgress(child: Child) {
  const [progress, setProgress] = useState<PlayProgress>(() => parseProgress(safeStorage.getItem(key(child))));
  const record = useCallback(
    (game: GameId, opts: { mosqueLevel?: number; dailyDay?: string; today?: string } = {}) => {
      setProgress((cur) => {
        const next = withCompletion(cur ?? emptyProgress(), game, opts);
        safeStorage.setItem(key(child), JSON.stringify(next));
        return next;
      });
    },
    [child],
  );
  return { progress, record };
}
