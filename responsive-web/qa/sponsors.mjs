// Enhancement 5 acceptance: sponsor banners only in the parent area, static, labelled, click through.
// Emulator only: writes four test sponsors (live, expired, switched off, animated gif) with owner
// credentials. Needs emulators running and seeded, and `npm run dev:emu` (port 5174).
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const FS = "http://127.0.0.1:8080/v1/projects/deenstars-dev/databases/(default)/documents";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const PNG = readFileSync("public/art/star.png");

const str = (v) => ({ stringValue: v });
async function putSponsor(id, f) {
  const fields = {
    brandName: str(f.brandName), headline: str(f.headline), imageUrl: str(f.imageUrl), imageAlt: str("Test sponsor picture"),
    linkUrl: str("https://sponsor.example/offer?ref=test"), startDate: str(f.startDate), endDate: str(f.endDate),
    isActive: { booleanValue: f.isActive }, sortOrder: { integerValue: String(f.sortOrder) },
  };
  const r = await fetch(`${FS}/sponsors/${id}`, { method: "PATCH", headers: OWNER, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`sponsor write ${r.status}`);
}
await putSponsor("qa-live", { brandName: "QA Live Brand", headline: "A test offer for families", imageUrl: "/sponsors/qa-live.png", startDate: "2000-01-01", endDate: "2999-12-31", isActive: true, sortOrder: 1 });
await putSponsor("qa-expired", { brandName: "QA Expired", headline: "Old offer", imageUrl: "/sponsors/qa-expired.png", startDate: "2000-01-01", endDate: "2001-01-01", isActive: true, sortOrder: 2 });
await putSponsor("qa-off", { brandName: "QA Off", headline: "Switched off", imageUrl: "/sponsors/qa-off.png", startDate: "2000-01-01", endDate: "2999-12-31", isActive: false, sortOrder: 3 });
await putSponsor("qa-gif", { brandName: "QA Animated", headline: "Animated banner", imageUrl: "/sponsors/qa-gif.gif", startDate: "2000-01-01", endDate: "2999-12-31", isActive: true, sortOrder: 4 });
console.log("fixture: 4 test sponsors");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route("**/sponsors/*.png", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await ctx.route("https://sponsor.example/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<h1>Sponsor page</h1>" }));
  const page = await ctx.newPage();
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w}] ${m}`);
  };
  const none = async (where) => ok((await page.locator(".sponsor-banner, .sponsors").count()) === 0 && !(await page.getByText("Sponsored", { exact: true }).count()), `${where}: sponsor content on a non-parent screen`);
  const tab = (n) => page.locator("nav.tabbar button.tab", { hasText: new RegExp(`^${n}\\d*$`) }).first();
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      await page.screenshot({ path: `qa/shots/${w}-sponsors-FAIL-${name}.png`, fullPage: true });
      failures.push(`[${w}] ${name}: ${String(e.message).split("\n")[0]}`);
    }
  };

  await step("public pages", async () => {
    for (const [path, sel] of [["/", ".landing-title"], ["/duas", ".list-item"], ["/duas/before-sleeping", ".arabic-text"], ["/surahs", ".list-item"], ["/stories", ".tile"], ["/play", ".banner"], ["/printables", ".printable-card"]]) {
      await page.goto(BASE + path);
      await page.locator(sel).first().waitFor();
      await page.waitForTimeout(400);
      await none(`website ${path}`);
    }
    await page.goto(`${BASE}/bedtime`);
    await page.getByRole("heading", { name: /Bedtime/ }).waitFor();
    await none("website bedtime");
  });

  await step("child screens", async () => {
    await page.goto(`${BASE}/signin`);
    await page.fill("#email", "qa@example.test");
    await page.fill("#password", "qa-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
    if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) {
      await none("child picker");
      await page.getByText("Aya").first().click();
    }
    await page.getByText("Today's deed").waitFor();
    for (const t of ["Home", "Checklist", "Play", "Stars", "Me"]) {
      await tab(t).click();
      await page.waitForTimeout(400);
      await none(`child ${t}`);
    }
    await tab("Home").click();
    for (const name of [/Dua Corner/, /Stories/, /Short Surahs/, /Printables/]) {
      await page.getByRole("button", { name }).first().click();
      await page.waitForTimeout(400);
      await none(`child ${name}`);
      await page.getByRole("button", { name: "Back" }).first().click();
    }
    await page.getByRole("button", { name: /Bedtime/ }).first().click();
    await page.getByRole("heading", { name: /^Bedtime, / }).waitFor();
    await none("child Bedtime mode");
    await page.getByRole("button", { name: "Leave bedtime" }).click();
  });

  await step("parent area", async () => {
    await tab("Me").click();
    await page.getByText("Parent area").last().click();
    const prompt = await page.getByText(/plus/).first().innerText();
    const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
    await page.getByRole("button", { name: String(WORDS.indexOf(m[1]) + WORDS.indexOf(m[2])), exact: true }).click();
    for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByRole("heading", { name: "Overview" }).waitFor();
    const banner = page.locator(".sponsor-banner");
    await banner.first().waitFor({ timeout: 15000 });
    ok((await banner.count()) === 1, `exactly the 1 live sponsor shows (got ${await banner.count()})`);
    ok(await banner.getByText("QA Live Brand").isVisible(), "the live sponsor is the one shown");
    ok((await banner.locator(".sponsor-label").innerText()).trim().toLowerCase() === "sponsored", "banner is labelled Sponsored");
    ok((await banner.locator("video, iframe, audio, embed, object, canvas").count()) === 0, "no video, iframe or other media");
    ok((await banner.locator("img").getAttribute("src")).endsWith(".png"), "static image");
    const anim = await banner.evaluate((el) => [el, ...el.querySelectorAll("*")].some((n) => getComputedStyle(n).animationName !== "none"));
    ok(!anim, "no animation on the banner");
    ok((await banner.getAttribute("target")) === "_blank", "opens in a new tab");
    ok(/noopener/.test(await banner.getAttribute("rel")) && /sponsored/.test(await banner.getAttribute("rel")), "rel sponsored noopener");
    ok(await page.locator(".sponsor-disclosure").isVisible(), "disclosure shown with the banner");
    const [popup] = await Promise.all([ctx.waitForEvent("page"), banner.click()]);
    await popup.waitForLoadState();
    const u = new URL(popup.url());
    ok(u.hostname === "sponsor.example" && u.searchParams.get("ref") === "test" && u.searchParams.get("utm_campaign") === "qa-live", `click-through URL: ${popup.url()}`);
    ok(!/child|uid|email|aya/i.test(popup.url()), "no personal identifiers in the link");
    ok(new URL(page.url()).pathname === "/", "the app tab stays where it was");
    await popup.close();
    await page.screenshot({ path: `qa/shots/${w}-sponsors-overview.png`, fullPage: true });
    for (const t of ["Approvals", "Children", "Printables", "Settings"]) {
      await tab(t).click();
      await page.waitForTimeout(300);
      ok((await page.locator(".sponsor-banner").count()) === 0, `parent ${t}: banners only on Overview`);
    }
    await page.getByRole("button", { name: "Back to kids" }).click();
  });

  await ctx.close();
  console.log(`done ${w}px`);
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
