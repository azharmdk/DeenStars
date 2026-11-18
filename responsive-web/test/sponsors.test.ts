import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLive, selectBanners, Sponsor, sponsorLink, validateSponsor } from "../src/sponsors/rules";

const base: Sponsor = {
  id: "acme-june", brandName: "Acme", headline: "Hello families", imageUrl: "/sponsors/acme-june.webp", imageAlt: "Acme logo",
  linkUrl: "https://acme.example/deal?ref=ds", startDate: "2025-06-01", endDate: "2025-06-30", isActive: true, sortOrder: 1,
};
const s = (o: Partial<Sponsor> = {}): Sponsor => ({ ...base, ...o });
const cfg = { enabled: true, disclosure: "Sponsored banners are paid placements.", maxBanners: 2 };
const june = new Date("2025-06-15T12:00:00Z");

describe("sponsor validation", () => {
  it("accepts a good record", () => expect(validateSponsor(base)).toEqual([]));
  it("allows static png, jpg and webp only (no video, gif or svg)", () => {
    for (const ok of ["/sponsors/a.png", "/sponsors/a.jpg", "/sponsors/a.jpeg", "/sponsors/a.webp"]) expect(validateSponsor(s({ imageUrl: ok }))).toEqual([]);
    for (const bad of ["/sponsors/a.gif", "/sponsors/a.mp4", "/sponsors/a.webm", "/sponsors/a.svg", "/sponsors/a.apng"]) expect(validateSponsor(s({ imageUrl: bad })).join()).toMatch(/imageUrl/);
  });
  it("rejects third-party image hosts and path tricks", () => {
    for (const bad of ["https://cdn.ads.example/a.png", "//cdn.example/a.png", "/sponsors/../x.png", "/art/a.png"]) expect(validateSponsor(s({ imageUrl: bad })).join()).toMatch(/imageUrl/);
  });
  it("rejects non-https links", () => {
    expect(validateSponsor(s({ linkUrl: "http://acme.example" })).join()).toMatch(/https/);
    expect(validateSponsor(s({ linkUrl: "javascript:alert(1)" })).join()).toMatch(/linkUrl/);
  });
  it("requires alt text, dates and the active flag", () => {
    expect(validateSponsor(s({ imageAlt: "" })).join()).toMatch(/imageAlt/);
    expect(validateSponsor(s({ endDate: "2025-05-01" })).join()).toMatch(/endDate/);
    expect(validateSponsor({ ...base, isActive: undefined as never }).join()).toMatch(/isActive/);
  });
});

describe("which banners show", () => {
  it("live inside the date window only (inclusive, UTC)", () => {
    expect(isLive(base, new Date("2025-06-01T00:00:00Z"))).toBe(true);
    expect(isLive(base, new Date("2025-06-30T23:59:59Z"))).toBe(true);
    expect(isLive(base, new Date("2025-07-01T00:00:00Z"))).toBe(false);
  });
  it("switched-off, invalid or disabled config shows nothing", () => {
    expect(selectBanners(cfg, [s({ isActive: false })], june)).toEqual([]);
    expect(selectBanners(cfg, [s({ imageUrl: "/sponsors/x.mp4" })], june)).toEqual([]);
    expect(selectBanners({ ...cfg, enabled: false }, [base], june)).toEqual([]);
    expect(selectBanners(null, [base], june)).toEqual([]);
  });
  it("sorted and capped at maxBanners", () => {
    const list = [s({ id: "c", sortOrder: 3 }), s({ id: "a", sortOrder: 1 }), s({ id: "b", sortOrder: 2 })];
    expect(selectBanners(cfg, list, june).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("preview ignores dates and the switch but still rejects invalid records", () => {
    expect(selectBanners({ ...cfg, enabled: false }, [s({ isActive: false, endDate: "2025-06-02" })], june, true)).toHaveLength(1);
    expect(selectBanners(cfg, [s({ imageUrl: "/sponsors/x.gif" })], june, true)).toEqual([]);
  });
});

describe("links", () => {
  it("adds campaign tags only, keeps existing parameters", () => {
    const u = new URL(sponsorLink(base.linkUrl, base.id));
    expect(u.searchParams.get("ref")).toBe("ds");
    expect(u.searchParams.get("utm_campaign")).toBe("acme-june");
    expect([...u.searchParams.keys()].sort()).toEqual(["ref", "utm_campaign", "utm_medium", "utm_source"]);
  });
});

// ---------- build-time guards ----------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk("src").filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => f.replace(/\\/g, "/"));
const src = (f: string) => readFileSync(f, "utf8");
const importsSponsors = (f: string) => /from\s+["'][^"']*\bsponsors\//.test(src(f));

describe("sponsor banners stay in the parent area", () => {
  it("only the parent area imports the sponsor module", () => {
    expect(files.filter((f) => !f.startsWith("src/sponsors/")).filter(importsSponsors)).toEqual(["src/screens/ParentApp.tsx"]);
  });
  it("no child screen, Bedtime, learning or public website page imports it", () => {
    for (const f of ["ChildApp", "Learn", "Play", "Seasonal", "GuestLearn", "Landing", "Onboarding", "ParentLearning"]) expect(importsSponsors(`src/screens/${f}.tsx`), f).toBe(false);
    for (const f of files.filter((x) => x.startsWith("src/components/"))) expect(importsSponsors(f), f).toBe(false);
  });
  it("no ad-network or tracking code anywhere in the app", () => {
    const banned = /googlesyndication|doubleclick|adsbygoogle|googletagmanager|gtag\(|fbq\(|connect\.facebook\.net|analytics\.js|getAnalytics|amazon-adsystem|taboola|outbrain/i;
    for (const f of files) expect(src(f), f).not.toMatch(banned);
    expect(readFileSync("index.html", "utf8")).not.toMatch(banned);
    expect(JSON.stringify(JSON.parse(readFileSync("package.json", "utf8")).dependencies)).not.toMatch(/analytics|adsense|admob|pixel/i);
  });
  it("banner markup has no video, iframe, autoplay or animation", () => {
    const b = src("src/sponsors/SponsorBanners.tsx");
    expect(b).not.toMatch(/<video|<iframe|autoPlay|<audio|window\.open|setInterval/);
    const css = src("src/styles.css");
    const sponsorCss = css.slice(css.indexOf("/* Sponsor banners"));
    expect(sponsorCss).not.toMatch(/animation|@keyframes/);
  });
});
