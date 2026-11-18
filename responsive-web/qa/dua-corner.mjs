// Dua Corner landing: categories, search, favourites, recently viewed, concise before-eating.
// Needs: emulators running and seeded, and `npm run dev:emu` in responsive-web/ (port 5174).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:5174";
const WIDTHS = [[360, 740], [768, 1024], [1440, 900]];
mkdirSync("qa/shots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && errors.push(m.text()));
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w}] ${m}`);
  };
  const overflow = async (label) => {
    const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(o[0] <= o[1] + 1, `${label}: horizontal overflow ${o[0]} > ${o[1]}`);
  };
  const text = () => page.locator("main").innerText();

  await page.goto(`${BASE}/duas`);
  await page.getByRole("heading", { name: "Browse by group" }).or(page.getByText("Browse by group")).first().waitFor();
  const body = await text();
  for (const label of ["Morning Duas", "Evening Duas", "Daily Life Duas", "Food & Drink Duas", "Travel Duas", "Sleep Duas"]) ok(body.includes(label), `landing shows ${label}`);
  await overflow("landing");
  await page.screenshot({ path: `qa/shots/dua-landing-${w}.png`, fullPage: true });

  // Empty category is clickable and explains itself (no dead link).
  await page.getByRole("button", { name: /Travel Duas/ }).click();
  await page.getByText("Coming soon").waitFor();
  ok(page.url().endsWith("/duas/category/travel"), "travel category has its own URL");
  await page.getByRole("button", { name: /Dua Corner/ }).first().click();

  // Food & Drink -> Before eating (concise).
  await page.getByRole("button", { name: /Food & Drink Duas/ }).click();
  await page.getByRole("button", { name: /Invocations before eating/ }).click();
  await page.getByText("In the name of Allah.").first().waitFor();
  const dua = await text();
  ok(dua.includes("In the name of Allah."), "concise translation shown");
  ok(!dua.includes("When you are about to eat"), "long narration hidden by default");
  ok(!(await page.getByText("at its beginning and its end").first().isVisible()), "forgotten version collapsed by default");
  await page.getByText("If you forget at the start").click();
  ok(await page.getByText("In the name of Allah, at its beginning and its end.").isVisible(), "forgotten version expands");
  ok((await page.locator("audio, [aria-label='Listen to the dua']").count()) === 0, "no long-narration audio next to concise text");
  await overflow("dua detail");
  await page.screenshot({ path: `qa/shots/dua-eating-${w}.png`, fullPage: true });

  // Favourite, then check landing lists it, and recents.
  await page.getByRole("button", { name: "Add to favourites" }).click();
  await page.goto(`${BASE}/duas`);
  await page.getByText("Browse by group").first().waitFor();
  await page.getByText("Recently viewed").waitFor({ timeout: 8000 }).catch(() => {});
  const again = await text();
  ok(again.includes("Recently viewed") && again.includes("Favourites"), "recently viewed and favourites appear");

  // Search.
  await page.getByLabel("Find a dua").fill("sleeping");
  await page.getByText(/Results for/).waitFor();
  ok((await text()).includes("sleeping"), "search finds a sleeping dua");
  await page.getByLabel("Find a dua").fill("zzzz");
  await page.getByText("No duas found").waitFor({ timeout: 8000 }).catch(() => {});
  ok(await page.getByText("No duas found").isVisible(), "search shows an empty message");

  ok(errors.length === 0, `no console errors: ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failures`);
for (const f of failures) console.log(" FAIL", f);
process.exit(failures.length ? 1 : 0);
