import { describe, expect, it } from "vitest";
import { DUA_BROWSE } from "../src/content";
import { pushRecent, RECENT_MAX, toggleId } from "../src/duaPrefs";
import duas from "../../functions/src/seed/packs/duas.json";
import overrides from "../../functions/src/seed/packs/dua-overrides.json";

describe("dua preferences", () => {
  it("toggles a favourite on and off", () => {
    const on = toggleId([], "dua_a");
    expect(on).toEqual(["dua_a"]);
    expect(toggleId(on, "dua_a")).toEqual([]);
  });
  it("puts the newest recent first and drops duplicates", () => {
    expect(pushRecent(["b", "a"], "a")).toEqual(["a", "b"]);
  });
  it("keeps at most RECENT_MAX recents", () => {
    let ids: string[] = [];
    for (let i = 0; i < RECENT_MAX + 4; i++) ids = pushRecent(ids, `d${i}`);
    expect(ids).toHaveLength(RECENT_MAX);
    expect(ids[0]).toBe(`d${RECENT_MAX + 3}`);
  });
});

describe("dua categories", () => {
  it("places every library dua in exactly one landing category (no unreachable duas)", () => {
    for (const d of duas) {
      const hits = DUA_BROWSE.filter((c) => c.from.includes(d.category));
      expect(hits, d.duaId).toHaveLength(1);
    }
  });
  it("has the six requested groups with unique ids", () => {
    const ids = DUA_BROWSE.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["morning", "evening", "daily-life", "food-drink", "travel", "sleep"]) expect(ids).toContain(id);
  });
});

describe("before eating, concise version", () => {
  const o = (overrides as Record<string, { concise: { arabic: string; translation: string }; ifForgotten: { arabic: string; translation: string } }>).dua_before_eating;
  it("targets a dua that exists", () => expect(duas.some((d) => d.duaId === "dua_before_eating")).toBe(true));
  it("shows the short text and keeps the forgotten version separate", () => {
    expect(o.concise.translation).toBe("In the name of Allah.");
    expect(o.ifForgotten.translation).toBe("In the name of Allah, at its beginning and its end.");
    expect(o.concise.arabic).not.toBe(o.ifForgotten.arabic);
  });
});
