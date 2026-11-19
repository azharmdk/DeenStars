// Signed-in flows not covered by layout.mjs: tasks and approvals, story reader, Bedtime,
// learning progress, theme, tester tools (Friday, Ramadan, Eid), parent child management.
// Needs: emulators running and seeded, and `npm run dev:emu` in responsive-web/ (port 5174).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const WIDTHS = [[1440, 900], [390, 844]];
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
mkdirSync("qa/shots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w}] ${m}`);
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      await page.screenshot({ path: `qa/shots/${w}-flows-FAIL-${name}.png`, fullPage: true });
      failures.push(`[${w}] ${name}: ${String(e.message).split("\n")[0]}`);
    }
  };
  const tab = (n) => page.locator("nav.tabbar button.tab", { hasText: new RegExp(`^${n}\\d*$`) }).first();
  const visible = (loc) => loc.first().isVisible().catch(() => false);
  const parentArea = async () => {
    await tab("Me").click();
    await page.getByText("Parent area").last().click();
    const prompt = await page.getByText(/plus/).first().innerText();
    const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
    await page.getByRole("button", { name: String(WORDS.indexOf(m[1]) + WORDS.indexOf(m[2])), exact: true }).click();
    for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByRole("heading", { name: "Overview" }).waitFor();
  };

  await step("sign in", async () => {
    await page.goto(`${BASE}/signin?qe=1`);
    await page.fill("#email", "qa@example.test");
    await page.fill("#password", "qa-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
    if (await visible(page.getByText("Who is learning today?"))) await page.getByText("Aya").first().click();
    await page.getByText("Today's deed").waitFor();
  });

  // Tasks: one self-check item ("I did it") and one grown-up item ("Ask a grown-up to check").
  let askedGrownUp = false;
  await step("tasks", async () => {
    await tab("Checklist").click();
    await page.getByRole("heading", { name: "Today" }).waitFor();
    let didSelf = false;
    const n = await page.locator(".list-item").count();
    for (let i = 0; i < n && !(didSelf && askedGrownUp); i++) {
      const row = page.locator(".list-item").nth(i);
      if (await row.locator(".check-circle.done, .check-circle.pending").count()) continue;
      await row.click();
      await page.locator(".sheet").waitFor();
      const self = page.locator(".sheet").getByRole("button", { name: "I did it" });
      const grown = page.locator(".sheet").getByRole("button", { name: "Ask a grown-up to check" });
      if (!didSelf && (await visible(self))) {
        await self.click();
        await page.getByText("Well done!").waitFor();
        didSelf = true;
      } else if (!askedGrownUp && (await visible(grown))) {
        await grown.click();
        await page.getByText("A grown-up will check it soon").waitFor();
        askedGrownUp = true;
      } else {
        await page.locator(".sheet").getByRole("button", { name: "Close" }).click();
      }
      await page.locator(".sheet").waitFor({ state: "detached" });
      await page.waitForTimeout(1900); // celebration clears
    }
    ok(didSelf, "tasks: a self-check item completed with a celebration");
    ok(askedGrownUp, "tasks: a grown-up item was sent for checking");
    await tab("Stars").click();
    await page.getByRole("heading", { name: "My Stars", exact: true }).waitFor();
    const today = Number(await page.locator(".stat").first().locator("b").innerText());
    ok(today >= 1, `stars: today's stars show after completing (got ${today})`);
  });

  await step("story reader", async () => {
    await tab("Home").click();
    await page.getByRole("button", { name: /Stories/ }).first().click();
    await page.locator(".tile").first().click();
    await page.locator(".tile").first().click();
    let guard = 0;
    while ((await page.getByRole("button", { name: /Next/ }).isEnabled()) && guard++ < 12) await page.getByRole("button", { name: /Next/ }).click();
    ok(await visible(page.getByText("What we learn")), "story: last page shows the verse and lesson");
    await page.getByRole("button", { name: /Read the verses/ }).click();
    ok(await visible(page.getByText(/Sources:/)), "story: sources listed for grown-ups");
    await page.getByRole("button", { name: "Stories" }).first().click();
    await page.getByRole("button", { name: "Back" }).first().click();
  });

  await step("bedtime", async () => {
    await page.getByRole("button", { name: /Stories/ }).first().click();
    await page.getByRole("button", { name: /Bedtime Stories/ }).click();
    await page.getByRole("button", { name: /Start bedtime routine/ }).click();
    await page.getByRole("heading", { name: /^Bedtime, / }).waitFor();
    await page.getByRole("button", { name: "Go straight to bedtime duas" }).click();
    await page.locator(".night .card").first().waitFor();
    await page.getByRole("button", { name: "Goodnight" }).click();
    ok(await visible(page.getByRole("heading", { name: /^Goodnight, / })), "bedtime: reaches goodnight");
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Back" }).first().click();
    await page.getByText("Today's deed").waitFor();
  });

  await step("learning progress", async () => {
    await page.getByRole("button", { name: /Dua Corner/ }).first().click();
    await page.locator(".dua-cat").first().click();
    await page.locator(".list-item").first().click();
    await page.getByRole("group", { name: "Learning progress" }).getByRole("button", { name: "Learning" }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Learning progress"] button[aria-pressed="true"]')?.textContent === "Learning", null, { timeout: 15000 });
    ok(true, "dua: progress saved as Learning");
    await page.locator(".back-link").click();
    await page.locator(".back-link").click();
    await page.getByRole("button", { name: "Back" }).first().click();
  });

  await step("theme", async () => {
    await tab("Me").click();
    await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
    ok((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark", "theme: dark applied");
    await page.screenshot({ path: `qa/shots/${w}-flows-dark-me.png`, fullPage: true });
    await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Auto" }).click();
    ok((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === null, "theme: back to auto");
  });

  await step("jummah", async () => {
    await tab("Me").click();
    const box = page.getByLabel("Pretend today is Friday (to test Jummah)");
    if (!(await box.isChecked())) await box.check();
    await tab("Home").click();
    await page.getByText("Jummah Mubarak").first().click();
    await page.getByText("I can do it").waitFor();
    ok(await visible(page.getByText("With a grown-up")), "jummah: screen shows both sections");
    await page.getByRole("button", { name: "Back" }).first().click();
    await tab("Me").click();
    await box.uncheck();
  });

  await step("ramadan", async () => {
    await page.selectOption("#simSeason", "ramadan:5");
    await page.getByText("Today's deed").waitFor();
    await page.getByText("Ramadan Mubarak").click();
    await page.getByRole("heading", { name: "Day 5" }).waitFor();
    ok((await page.locator(".ramadan-day").count()) === 30, "ramadan: 30-day calendar");
    await page.screenshot({ path: `qa/shots/${w}-flows-ramadan.png`, fullPage: true });
    await page.getByRole("button", { name: "Back" }).first().click();
  });

  await step("eid", async () => {
    await tab("Me").click();
    await page.selectOption("#simSeason", "eidFitr:1");
    await page.getByText("Today's deed").waitFor();
    await page.getByText("Eid Mubarak!").click();
    ok(await visible(page.getByText("Eid al-Fitr")), "eid: Eid al-Fitr screen");
    await page.getByRole("button", { name: "Back" }).first().click();
    await tab("Me").click();
    await page.selectOption("#simSeason", "");
    await page.getByText("Today's deed").waitFor();
  });

  await step("approvals", async () => {
    await parentArea();
    await tab("Approvals").click();
    await page.getByRole("heading", { name: "Approvals" }).waitFor();
    const approve = page.getByRole("button", { name: "Approve", exact: true });
    if (askedGrownUp) {
      await approve.first().waitFor({ timeout: 15000 });
      const before = await approve.count();
      await approve.first().click();
      await page.waitForFunction((b) => document.querySelectorAll("button").length && [...document.querySelectorAll("button")].filter((x) => x.textContent === "Approve").length < b, before, { timeout: 15000 });
      ok(true, "approvals: approving removes the item");
    }
  });

  const nick = w === 1440 ? "Qe Wide" : "Qe Narrow";
  await step("add child", async () => {
    await tab("Children").click();
    await page.getByRole("button", { name: /Add a child/ }).click();
    await page.fill("#nick", nick);
    await page.locator(".avatar-option").nth(2).click();
    await page.locator('form button.btn-primary').click();
    await page.getByRole("heading", { name: "Children" }).waitFor();
    await page.getByText(nick).waitFor({ timeout: 15000 });
    ok(true, "children: new child added");
  });

  await step("edit child", async () => {
    await page.getByText(nick).click();
    await page.getByRole("group", { name: "Difficulty" }).getByRole("button", { name: "Gentle" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("heading", { name: "Children" }).waitFor();
    await page.getByText(`${nick}`).locator("..").getByText(/Gentle/).waitFor({ timeout: 15000 });
    ok(true, "children: difficulty saved");
  });

  await step("make-up and learning confirm", async () => {
    await page.getByText("Aya").first().click();
    await page.getByRole("button", { name: "Show yesterday's activities" }).click();
    const mark = page.getByRole("button", { name: "Mark done" });
    if (await mark.count()) {
      const before = await mark.count();
      await mark.first().click();
      await page.waitForFunction((b) => [...document.querySelectorAll("button")].filter((x) => x.textContent === "Mark done").length < b, before, { timeout: 15000 });
      ok(true, "make-up: yesterday's item marked done");
    }
    const confirm = page.getByRole("button", { name: "Knows it by heart" });
    if (await confirm.count()) {
      await confirm.first().click();
      await page.getByRole("button", { name: /Certificate/ }).first().waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: /Certificate/ }).first().click();
      ok(await visible(page.getByText(/Masha Allah/)), "learning: certificate opens");
      await page.screenshot({ path: `qa/shots/${w}-flows-certificate.png`, fullPage: true });
      const close = page.getByRole("button", { name: /Close|Done|Back/ }).first();
      await close.click();
    }
    await page.getByRole("button", { name: "Children" }).first().click();
  });

  await step("delete child", async () => {
    await page.getByRole("heading", { name: "Children" }).waitFor();
    await page.getByText(nick).click();
    const del = page.getByRole("button", { name: "Delete profile" });
    ok(await del.isDisabled(), "delete: disabled until the nickname is typed");
    await page.fill("#confirm", nick);
    await del.click();
    await page.getByRole("heading", { name: "Children" }).waitFor();
    await page.getByText(nick).waitFor({ state: "detached", timeout: 15000 });
    ok(true, "delete: child removed from the list");
  });

  await step("settings and sign out", async () => {
    await tab("Settings").click();
    ok(await visible(page.getByText("Ramadan and Eid dates")), "settings: Hijri settings card");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.locator(".landing-title").waitFor();
    ok(new URL(page.url()).pathname === "/", "sign out returns to the website home page");
  });

  ok(errors.length === 0, `console errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
  console.log(`done ${w}px`);
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
