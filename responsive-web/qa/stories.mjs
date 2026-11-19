// Stories: groups instead of ages, Bedtime Stories inside Stories, old /bedtime link redirects.
// Needs: emulators running and seeded (with the new story categories), and `npm run dev:emu` (port 5174).
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
  const main = () => page.locator("main").innerText();

  // Landing: six groups, friendly note, no age wording.
  await page.goto(`${BASE}/stories`);
  await page.locator(".dua-cat").first().waitFor();
  let body = await main();
  for (const t of ["Prophets", "Good Character", "Islamic Values", "Bedtime Stories", "Ramadan", "Hajj & Umrah"]) ok(body.includes(t), `group shown: ${t}`);
  ok(body.includes("If you are younger, ask your mother or father to help you read."), "friendly note shown");
  ok(!/Little Learners|Young Explorers|Showing for age|\bage\b/i.test(body), "no age wording or age picker");
  ok((await page.locator(".guest-age").count()) === 0, "no age bar");
  await overflow("stories landing");
  await page.screenshot({ path: `qa/shots/stories-landing-${w}.png`, fullPage: true });

  // Navigation has no separate Bedtime item (menu on small screens, header on desktop).
  if (w >= 1024) ok((await page.locator("nav.site-links a", { hasText: /^Bedtime$/ }).count()) === 0, "no Bedtime link in the header");
  else {
    await page.getByRole("button", { name: "Open menu" }).click();
    ok((await page.locator("#site-menu a", { hasText: /^Bedtime$/ }).count()) === 0, "no Bedtime link in the menu");
    await page.getByRole("button", { name: "Close menu" }).click();
  }
  ok((await page.locator("footer a, main a", { hasText: /^Bedtime$/ }).count()) === 0, "no Bedtime link on the page");

  // Prophets group lists the stories.
  await page.getByRole("button", { name: /Prophets/ }).click();
  await page.waitForURL(/\/stories\/category\/prophets$/);
  await page.locator(".tile").first().waitFor();
  const prophets = await page.locator(".tile").count();
  ok(prophets >= 6, `prophets group lists the stories (${prophets})`);
  const titles = await page.locator(".tile").allInnerTexts();
  ok(new Set(titles).size === titles.length, "no duplicate stories on the page");
  await overflow("prophets group");

  // Bedtime Stories group: its own stories (not all), plus the routine button.
  await page.goto(`${BASE}/stories/category/bedtime`);
  await page.getByRole("button", { name: /Start bedtime routine/ }).waitFor();
  await page.locator(".tile").first().waitFor();
  const bed = await page.locator(".tile").count();
  ok(bed >= 1 && bed < prophets, `bedtime group has its own selection (${bed} of ${prophets})`);
  await overflow("bedtime group");
  await page.screenshot({ path: `qa/shots/stories-bedtime-${w}.png`, fullPage: true });

  // Opening a story works, and back returns to the stories page.
  await page.locator(".tile").first().click();
  await page.waitForURL(/\/stories\/story_/);
  await page.getByRole("button", { name: /Next/ }).click();
  ok(await page.getByText(/2 \/ \d+/).isVisible(), "story reader works");
  await page.goBack();
  await page.waitForURL(/\/stories\/category\/bedtime$/);

  // Routine: story or duas, then goodnight.
  await page.getByRole("button", { name: /Start bedtime routine/ }).click();
  await page.waitForURL(/\/stories\/category\/bedtime\/routine$/);
  await page.getByRole("heading", { name: /^Bedtime, / }).waitFor();
  await page.getByRole("button", { name: "Go straight to bedtime duas" }).click();
  await page.getByRole("heading", { name: "Bedtime duas" }).waitFor();
  ok(await page.locator(".night .card").first().waitFor({ timeout: 15000 }).then(() => true, () => false), "routine: duas load");
  await overflow("bedtime routine");
  await page.getByRole("button", { name: "Leave bedtime" }).click();
  await page.waitForURL(/\/stories\/category\/bedtime$/);

  // Empty groups are clickable, explain themselves and lead back.
  for (const [id, label] of [["good-character", "Good Character"], ["islamic-values", "Islamic Values"], ["ramadan", "Ramadan"], ["hajj-umrah", "Hajj & Umrah"]]) {
    await page.goto(`${BASE}/stories`);
    await page.getByRole("button", { name: new RegExp(label.replace("&", "&")) }).click();
    await page.getByText("Coming soon").waitFor();
    ok(page.url().endsWith(`/stories/category/${id}`), `${label} has its own URL`);
  }

  // Old links keep working.
  await page.goto(`${BASE}/bedtime`);
  await page.waitForURL(/\/stories\/category\/bedtime$/);
  ok(true, "/bedtime redirects to Bedtime Stories");
  ok(await page.getByRole("button", { name: /Start bedtime routine/ }).waitFor({ timeout: 8000 }).then(() => true, () => false), "redirect lands on the Bedtime Stories page");

  ok(errors.length === 0, `no console errors: ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failures`);
for (const f of failures) console.log(" FAIL", f);
process.exit(failures.length ? 1 : 0);
