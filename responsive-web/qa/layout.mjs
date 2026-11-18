// Layout and walkthrough check at five widths. Needs: emulators running and seeded
// (functions/scripts/seed-emulator.mjs) and `npm run dev:emu` in responsive-web/ (port 5174).
// Run: node qa/layout.mjs   (set BASE to test another URL)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const WIDTHS = [
  [360, 740],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
];
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
mkdirSync("qa/shots", { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|favicon/.test(m.text()) && errors.push(m.text()));
  const ok = (cond, msg) => {
    checks++;
    if (!cond) failures.push(`[${w}] ${msg}`);
  };
  const shot = async (name) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `qa/shots/${w}-${name}.png`, fullPage: true });
  };
  const noOverflow = async (label) => {
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(o.sw <= o.cw + 1, `${label}: horizontal overflow (scrollWidth ${o.sw} > clientWidth ${o.cw})`);
  };
  const tab = (name) => page.locator("nav.tabbar button.tab", { hasText: new RegExp(`^${name}\\d*$`) }).first();

  try {
  await page.goto(`${BASE}/?qe=1`);
  await page.locator(".landing-title").waitFor();
  await noOverflow("welcome");
  await shot("00-welcome");
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await page.fill("#email", "qa@example.test");
  await page.fill("#password", "qa-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Who is learning today?").waitFor();
  await noOverflow("picker");
  await shot("01-picker");
  await page.getByText("Aya").first().click();
  await page.getByText("Today's deed").waitFor();
  await noOverflow("home");
  await shot("02-home");

  // Navigation mode per width
  const nav = await page.evaluate(() => {
    const t = document.querySelector("nav.tabbar");
    const r = t.getBoundingClientRect();
    const hdr = document.querySelector(".app-header");
    return { x: r.x, y: r.y, w: r.width, h: r.height, vh: window.innerHeight, headerShown: !!hdr && getComputedStyle(hdr).display !== "none" };
  });
  if (w >= 1024) {
    ok(nav.y < 100 && nav.w > 300 && nav.h < 80, `desktop: nav should be a top bar (y=${nav.y}, w=${nav.w}, h=${nav.h})`);
    ok(!nav.headerShown, "desktop: top header should be hidden");
  } else {
    ok(nav.y > nav.vh * 0.7 && nav.w >= w - 2, `mobile/tablet: nav should be a full-width bottom bar (y=${nav.y}, w=${nav.w})`);
    ok(nav.headerShown, "mobile/tablet: sticky header should show");
  }

  await tab("Checklist").click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await noOverflow("checklist");
  if (w >= 768 && w < 1024) {
    const toggle = page.locator(".filter-toggle");
    ok(await toggle.isVisible(), "tablet: filter toggle should show");
    ok(!(await page.locator(".filter-pill").first().isVisible()), "tablet: filter panel collapsed by default");
    await toggle.click();
    ok(await page.locator(".filter-pill").first().isVisible(), "tablet: filter panel opens");
  } else {
    ok(await page.locator(".filter-pill").first().isVisible(), "filter chips visible");
  }
  await shot("03-checklist");
  // Filtering still works
  const pills = page.locator(".filter-pill");
  if ((await pills.count()) > 2) {
    const before = await page.locator(".list-item").count();
    await pills.nth(1).click();
    const after = await page.locator(".list-item").count();
    ok(after > 0 && after <= before, "category filter narrows the list");
    await pills.nth(0).click();
  }

  await tab("Play").click();
  await page.getByRole("heading", { name: "Play & Learn" }).waitFor();
  await noOverflow("play");
  await shot("04-play");
  await tab("Stars").click();
  await page.getByRole("heading", { name: "My Stars", exact: true }).waitFor();
  await noOverflow("stars");
  await shot("05-stars");
  await tab("Me").click();
  await page.getByText("Appearance").waitFor();
  await noOverflow("me");
  await shot("06-me");

  // Learning screens
  await tab("Home").click();
  await page.getByRole("button", { name: /Dua Corner/ }).first().click();
  await page.getByRole("heading", { name: /Dua/ }).first().waitFor();
  await noOverflow("dua corner");
  await shot("07-dua-corner");
  await page.getByRole("button", { name: "Back" }).first().click();
  await page.getByRole("button", { name: /Stories/ }).first().click();
  await page.locator(".banner-title", { hasText: "Stories" }).waitFor();
  await noOverflow("stories");
  await shot("08-stories");
  await tab("Play").click();
  await page.getByRole("button", { name: /Kindness Quiz/ }).click();
  await page.locator(".option").first().waitFor();
  await noOverflow("quiz");
  await shot("09-quiz");
  await page.getByRole("button", { name: "Close quiz" }).click();

  // Parent area
  await tab("Me").click();
  await page.getByText("Parent area").last().click();
  const prompt = await page.getByText(/plus/).first().innerText();
  const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
  const sum = WORDS.indexOf(m[1]) + WORDS.indexOf(m[2]);
  await page.getByRole("button", { name: String(sum), exact: true }).click();
  for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  await noOverflow("parent overview");
  await shot("10-parent-overview");
  for (const name of ["Approvals", "Children", "Settings"]) {
    await tab(name).click();
    await page.waitForTimeout(250);
    await noOverflow(`parent ${name}`);
  }
  await shot("11-parent-settings");

  } catch (e) {
    await page.screenshot({ path: `qa/shots/${w}-FAIL.png`, fullPage: true });
    failures.push(`[${w}] ${String(e.message).split("\n")[0]}`);
  }
  ok(errors.length === 0, `console errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
  console.log(`done ${w}px`);
}

await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);



