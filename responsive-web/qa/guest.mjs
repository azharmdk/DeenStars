// Website guest mode: every learning page works without an account, with real URLs.
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
  const shot = (n) => page.screenshot({ path: `qa/shots/${w}-guest-${n}.png`, fullPage: true });
  const noPartners = async (label) => ok((await page.locator('[class*="partner"]').count()) === 0, `${label}: partner content on a kids page`);
  // Go to a site section the way a visitor would: header link on desktop, menu on smaller screens.
  const go = async (label) => {
    if (w >= 1024) await page.locator("nav.site-links a", { hasText: label }).click();
    else {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator("#site-menu a", { hasText: label }).click();
    }
  };
  try {
    await page.goto(`${BASE}/`);
    await page.locator(".landing-title").waitFor();
    ok(!(await page.locator("#email").count()), "landing: no forced sign-in form");
    await overflow("landing");
    await shot("00-landing");

    // Duas
    await go("Dua Corner");
    await page.waitForURL(/\/duas$/);
    await page.locator(".dua-cat").first().waitFor();
    ok((await page.locator(".dua-cat").count()) >= 6, "duas: groups load for guests");
    await noPartners("duas");
    await overflow("duas");
    await shot("01-duas");
    await page.getByRole("button", { name: /Sleep Duas/ }).click();
    await page.locator(".list-item").first().waitFor();
    ok((await page.locator(".list-item").count()) >= 1, "duas: sleep group lists duas");
    await page.locator(".list-item").first().click();
    await page.locator(".arabic-text").first().waitFor();
    ok((await page.getByText("How am I doing?").count()) === 0, "dua detail: no progress controls for guests");
    ok(await page.getByText("Sourced text, pending scholar review").first().isVisible(), "dua detail: review banner kept");
    await overflow("dua detail");

    // Surahs
    await go("Surahs");
    await page.waitForURL(/\/surahs$/);
    await page.locator(".list-item").first().waitFor();
    await page.locator(".list-item").first().click();
    await page.locator(".arabic-text").first().waitFor();
    ok((await page.getByText("How am I doing?").count()) === 0, "surah detail: no progress controls");
    await overflow("surah detail");
    await shot("02-surah");

    // Stories: groups, deep link, browser back
    await go("Stories");
    await page.waitForURL(/\/stories$/);
    await page.locator(".dua-cat").first().waitFor();
    ok((await page.locator(".guest-age").count()) === 0, "stories: no age bar");
    ok((await page.locator(".dua-cat").count()) === 6, "stories: six groups");
    await overflow("stories");
    await shot("03-stories");
    await page.getByRole("button", { name: /Prophets/ }).click();
    await page.waitForURL(/\/stories\/category\/prophets$/);
    await page.locator(".tile").first().waitFor();
    await page.locator(".tile").first().click();
    await page.waitForURL(/\/stories\/story_.+/);
    const storyUrl = page.url();
    await page.getByRole("button", { name: /Next/ }).click();
    ok(await page.getByText(/2 \/ \d+/).isVisible(), "story reader: next page works");
    await page.goBack();
    await page.waitForURL(/\/stories\/category\/prophets$/);
    ok(await page.locator(".tile").first().isVisible(), "browser back returns to the story group");
    await page.goto(storyUrl);
    await page.getByRole("button", { name: /Next/ }).waitFor();
    ok(true, "story deep link loads directly");
    await noPartners("story");    // Play
    await go("Play & Learn");
    await page.waitForURL(/\/play$/);
    await page.getByRole("button", { name: /^Quiz Kindness Quiz/ }).click();
    await page.locator(".option").first().waitFor();
    ok((await page.locator(".option").count()) === 2, "quiz: guests start at Gentle (2 choices)");
    await page.locator(".option").first().click();
    await overflow("quiz");
    await page.getByRole("button", { name: "Close quiz" }).click();
    await page.getByRole("button", { name: /^Game Picture Matching/ }).click();
    await page.locator(".memory-card").first().waitFor();
    ok((await page.locator(".memory-card").count()) === 8, "matching: level 1 shows 4 pairs");
    await noPartners("play");

    // Bedtime Stories and the routine
    await page.goto(`${BASE}/stories/category/bedtime`);
    await page.getByRole("button", { name: /Start bedtime routine/ }).click();
    await page.getByRole("heading", { name: "Bedtime, little one" }).waitFor();
    await page.getByRole("button", { name: "Go straight to bedtime duas" }).click();
    await page.getByRole("heading", { name: "Bedtime duas" }).waitFor();
    ok(await page.locator(".night .card").first().waitFor({ timeout: 15000 }).then(() => true, () => false), "bedtime: duas load for guests");
    await overflow("bedtime");
    await page.getByRole("button", { name: "Leave bedtime" }).click();
    await page.waitForURL(/\/stories\/category\/bedtime$/);    // Sign-in still works from the website
    if (w === 1440) {
      await page.getByRole("link", { name: "Sign in" }).first().click();
      await page.waitForURL(/\/signin$/);
      await page.fill("#email", "qa@example.test");
      await page.fill("#password", "qa-password-123");
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
      ok(new URL(page.url()).pathname === "/", "after sign-in the URL returns to /");
    }
    ok(errors.length === 0, `console errors: ${errors.slice(0, 3).join(" | ")}`);
  } catch (e) {
    await page.screenshot({ path: `qa/shots/${w}-guest-FAIL.png`, fullPage: true });
    failures.push(`[${w}] ${String(e.message).split("\n")[0]}`);
  }
  await ctx.close();
  console.log(`done ${w}px`);
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
