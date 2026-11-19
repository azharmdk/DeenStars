import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STORY_CATEGORIES, storiesIn, storyCategoriesOf } from "../src/content";
import stories from "../../functions/src/seed/packs/stories.json";
import categories from "../../functions/src/seed/packs/story-categories.json";

const src = (p: string) => readFileSync(p, "utf8");
const MAP = categories as unknown as Record<string, string[]>;

describe("story groups", () => {
  it("has the six requested groups, in order", () => {
    expect(STORY_CATEGORIES.map((c) => c.label)).toEqual(["Prophets", "Good Character", "Islamic Values", "Bedtime Stories", "Ramadan", "Hajj & Umrah"]);
  });
  it("ids are unique", () => {
    const ids = STORY_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("a story with no categories counts as Prophets (older data keeps working)", () => {
    expect(storyCategoriesOf({})).toEqual(["prophets"]);
    expect(storyCategoriesOf({ categories: [] })).toEqual(["prophets"]);
  });
  it("lists a story in each of its groups and in no other", () => {
    const items = [{ id: "a", categories: ["prophets", "bedtime"] }, { id: "b", categories: ["prophets"] }, { id: "c" }];
    expect(storiesIn(items, "prophets").map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(storiesIn(items, "bedtime").map((s) => s.id)).toEqual(["a"]);
    expect(storiesIn(items, "ramadan")).toEqual([]);
  });
});

describe("seed story categories", () => {
  const valid = new Set(STORY_CATEGORIES.map((c) => c.id));
  it("every story has a category entry and only known group ids", () => {
    for (const s of stories) {
      const cats = MAP[s.storyId];
      expect(cats, s.storyId).toBeTruthy();
      for (const c of cats) expect(valid.has(c), `${s.storyId}: ${c}`).toBe(true);
      expect(new Set(cats).size).toBe(cats.length);
    }
  });
  it("has no entry for a story that does not exist (negative)", () => {
    const real = new Set(stories.map((s) => s.storyId));
    for (const id of Object.keys(MAP).filter((k) => !k.startsWith("_"))) expect(real.has(id), id).toBe(true);
  });
  it("Bedtime Stories is its own selection, not a copy of every story", () => {
    const withCats = stories.map((s) => ({ id: s.storyId, categories: MAP[s.storyId] }));
    const bed = storiesIn(withCats, "bedtime");
    expect(bed.length).toBeGreaterThan(0);
    expect(bed.length).toBeLessThan(withCats.length);
  });
});

describe("navigation has no separate Bedtime", () => {
  it("site links and the home tiles no longer point to /bedtime", () => {
    const landing = src("src/screens/Landing.tsx");
    expect(landing).not.toMatch(/to: "\/bedtime"/);
  });
  it("/bedtime is no longer a page and old links redirect to Bedtime Stories", () => {
    const app = src("src/App.tsx");
    expect(app).not.toMatch(/CONTENT_SECTIONS = \[[^\]]*"bedtime"/);
    expect(app).toContain('navigate("/stories/category/bedtime", { replace: true })');
  });
  it("the signed-in app has no Bedtime banner or button", () => {
    const child = src("src/screens/ChildApp.tsx");
    expect(child).not.toMatch(/title="Bedtime"/);
    expect(child).not.toMatch(/onBedtime/);
  });
});

describe("stories are not split by age", () => {
  it("the website stories page has no age picker", () => {
    const guest = src("src/screens/GuestLearn.tsx");
    expect(guest).not.toMatch(/AgeBar|guest-age|ds_guest_age/);
  });
  it("the story list and bedtime pick do not filter on ageBand", () => {
    const learn = src("src/screens/Learn.tsx");
    expect(learn).not.toMatch(/ageBandFor|AGE_BAND_LABEL|s\.ageBand/);
  });
  it("shows the friendly note", () => {
    expect(src("src/screens/Learn.tsx")).toContain("If you are younger, ask your mother or father to help you read.");
  });
});
