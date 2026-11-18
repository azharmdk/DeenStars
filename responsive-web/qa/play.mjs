// Play & Learn: no age grouping, levels, Find the Mosque, Today's Islamic Challenge, archive, streak.
// Needs: emulators running and seeded, and `npm run dev:emu` in responsive-web/ (port 5174).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:5174";
const WIDTHS = [[360, 740], [768, 1024], [1440, 900]];
mkdirSync("qa/shots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

const dayKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  const main = () => page.locator("main").innerText();

  // Seed a 3-day on-time run ending yesterday, so the streak chip is shown (guest id is "guest").
  await ctx.addInitScript((days) => {
    if (!localStorage.getItem("ds_play_v1_guest")) {
      localStorage.setItem("ds_play_v1_guest", JSON.stringify({ v: 1, completions: {}, mosqueFinished: -1, daily: Object.fromEntries(days.map((d) => [d, "onTime"])) }));
    }
  }, [dayKey(-1), dayKey(-2), dayKey(-3)]);

  await page.goto(`${BASE}/play`);
  await page.getByText("Today's Islamic Challenge").first().waitFor();
  let body = await main();
  ok(!body.includes("Showing for age"), "no age picker on Play & Learn");
  ok(body.includes("Level 1") && body.includes("more games to Level 2"), "player level shown");
  ok(body.includes("3 days in a row"), "active streak shown");
  ok(body.includes("Find the Mosque") && body.includes("Kindness Quiz") && body.includes("Picture Matching"), "three playable games listed");
  for (const t of ["Good Deeds Collector", "Journey to the Masjid", "Ramadan Lantern Quest", "Kindness Adventure"]) ok(body.includes(t), `coming soon: ${t}`);
  ok(!/broken|lost|missed/i.test(body), "no failure wording");
  await overflow("play menu");
  await page.screenshot({ path: `qa/shots/play-menu-${w}.png`, fullPage: true });

  // Archive: 7 earlier days, each playable.
  await page.getByText("Earlier challenges").click();
  ok((await page.locator(".challenge-archive li").count()) === 7, "archive lists 7 earlier challenges");

  // Locked levels are disabled.
  const picker = page.getByRole("group", { name: "Find the Mosque level" });
  ok(await picker.getByRole("button", { name: /Level 2/ }).isDisabled(), "Level 2 locked at the start");
  ok(await picker.getByRole("button", { name: /Expert/ }).isDisabled(), "Expert locked at the start");

  // Play Find the Mosque level 1: one wrong tap then the masjid, each round.
  await page.getByRole("button", { name: /Find the Mosque/ }).first().click();
  await page.getByRole("heading", { name: "Find the Mosque" }).waitFor();
  ok((await page.locator(".mosque-spot").count()) === 3, "level 1 shows 3 pictures");
  for (let r = 0; r < 3; r++) {
    const wrong = page.locator(".mosque-spot:not(.faded):not(:disabled)").filter({ hasNot: page.locator("img[src$='mosque.png']") }).first();
    await wrong.click();
    ok((await main()).includes("Not this one. Try another!"), `round ${r + 1}: gentle message after a wrong tap`);
    await page.getByRole("button", { name: "Masjid" }).click();
    await page.getByText("You found it! Well done.").waitFor();
    await page.getByRole("button", { name: r < 2 ? "Next" : "Finish" }).click();
  }
  await page.getByText("Level 1 complete").waitFor();
  ok((await main()).includes("New level unlocked: Level 2"), "finishing level 1 unlocks level 2");
  await overflow("mosque result");
  await page.screenshot({ path: `qa/shots/play-mosque-done-${w}.png`, fullPage: true });

  // Level 2: after two wrong taps the masjid glows, and nothing is punished.
  await page.getByRole("button", { name: "Try Level 2" }).click();
  ok((await page.locator(".mosque-spot").count()) === 4, "level 2 shows 4 pictures");
  for (let k = 0; k < 2; k++) await page.locator(".mosque-spot:not(.faded):not(:disabled)").filter({ hasNot: page.locator("img[src$='mosque.png']") }).first().click();
  ok((await page.locator(".mosque-spot.hint").count()) === 1, "hint glow after two wrong taps");
  ok((await main()).includes("Look for the glow"), "friendly hint text");
  await overflow("mosque round");
  await page.screenshot({ path: `qa/shots/play-mosque-hint-${w}.png`, fullPage: true });
  await page.getByRole("button", { name: "Back" }).first().click();

  // Back on the menu: level 2 open, player level progress moved, progress persists after reload.
  await page.getByText("Today's Islamic Challenge").first().waitFor();
  ok(!(await page.getByRole("group", { name: "Find the Mosque level" }).getByRole("button", { name: /Level 2/ }).isDisabled()), "Level 2 open after finishing level 1");
  await page.reload();
  await page.getByText("Today's Islamic Challenge").first().waitFor();
  ok(!(await page.getByRole("group", { name: "Find the Mosque level" }).getByRole("button", { name: /Level 2/ }).isDisabled()), "progress survives a reload");
  ok((await main()).includes("more games to Level 2") && (await main()).includes("2 more games"), "player level counts the finished game");

  // Today's challenge opens whichever game is featured.
  const featured = await page.locator(".banner", { hasText: "Today's Islamic Challenge" }).locator(".banner-title").innerText();
  await page.locator(".banner", { hasText: "Today's Islamic Challenge" }).click();
  await page.getByRole("heading", { name: new RegExp(featured.replace("Find the Mosque", "Find the Mosque")) }).or(page.getByText(/Question 1 of/)).first().waitFor();
  ok(true, `daily challenge opened: ${featured}`);

  ok(errors.length === 0, `no console errors: ${errors.join(" | ")}`);
  await ctx.close();
}

// Finishing today's challenge marks it done and starts a streak. The clock is fixed to a day when
// the featured game is Find the Mosque (rotation: days since 2024-01-01, modulo 3, 0 = mosque).
{
  let day = new Date(2026, 2, 2, 12, 0, 0);
  while (Math.floor((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - Date.UTC(2024, 0, 1)) / 86400000) % 3 !== 0) day = new Date(day.getTime() + 86400000);
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(day);
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[daily] ${m}`);
  };
  await page.goto(`${BASE}/play`);
  const card = page.locator(".banner", { hasText: "Today's Islamic Challenge" });
  await card.waitFor();
  ok((await card.innerText()).includes("Find the Mosque"), "featured game is Find the Mosque on the chosen day");
  ok(!(await card.innerText()).includes("in a row"), "no streak shown before any challenge is done");
  await card.click();
  for (let r = 0; r < 3; r++) {
    await page.getByRole("button", { name: "Masjid" }).click();
    await page.getByRole("button", { name: r < 2 ? "Next" : "Finish" }).click();
  }
  await page.getByText("Level 1 complete").waitFor();
  await page.getByRole("button", { name: "Back to Play & Learn" }).click();
  await card.waitFor();
  const text = await card.innerText();
  ok(text.includes("Done today"), "challenge shows done today");
  ok(text.includes("1 day in a row"), "streak starts at 1 day");
  ok(!/broken|lost|missed/i.test(await page.locator("main").innerText()), "no failure wording after finishing");
  await ctx.close();
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failures`);
for (const f of failures) console.log(" FAIL", f);
process.exit(failures.length ? 1 : 0);
