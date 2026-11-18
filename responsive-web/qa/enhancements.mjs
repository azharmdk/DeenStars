// Acceptance for shareable URLs, printables, the install prompt and game levels (Enhancements 4, 6a,
// technical notes). Needs emulators running and seeded, `npm run dev:emu` (port 5174), and for the
// "new game unlocked" check, the 7-day streak fixture from qa/fix3.mjs (run that first).
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5174";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

let runNo = 0;
async function run(w, h, fn, opts = {}) {
  const name = `run${++runNo}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w}] ${m}`);
  };
  try {
    await fn(page, ok, ctx);
  } catch (e) {
    await page.screenshot({ path: `qa/shots/${w}-enh-FAIL-${name}.png`, fullPage: true });
    const call = String(e.message).split("\n").find((l) => /waiting for/.test(l)) ?? "";
    failures.push(`[${w}] ${name}: ${String(e.message).split("\n")[0]} ${call.trim()}`);
  }
  ok(errors.length === 0, `page errors: ${errors.slice(0, 2).join(" | ")}`);
  await ctx.close();
}

/** Solves Picture Matching: first look at every card (two at a time), then match the pairs. */
async function solveMatching(page) {
  const cards = page.locator(".memory-card");
  const n = await cards.count();
  const labels = [];
  for (let i = 0; i < n; i += 2) {
    await cards.nth(i).click();
    labels[i] = await cards.nth(i).getAttribute("aria-label");
    await cards.nth(i + 1).click();
    labels[i + 1] = await cards.nth(i + 1).getAttribute("aria-label");
    await page.waitForTimeout(1000); // cards turn back after 900 ms (or stay matched)
  }
  const byLabel = {};
  labels.forEach((l, i) => (byLabel[l] ??= []).push(i));
  for (const [x, y] of Object.values(byLabel)) {
    if (await cards.nth(x).evaluate((e) => e.classList.contains("matched"))) continue;
    await cards.nth(x).click();
    await cards.nth(y).click();
    await page.waitForTimeout(500);
  }
  await page.getByText("You matched them all!").waitFor({ timeout: 10000 });
}
async function playQuiz(page) {
  for (;;) {
    await page.locator(".option").first().click();
    const next = page.getByRole("button", { name: /Next question|Finish/ });
    const label = await next.innerText();
    await next.click();
    if (/Finish/.test(label)) break;
  }
}

for (const [w, h] of [[390, 844], [1440, 900]]) {
  // ---------- shareable URLs ----------
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/duas/before-sleeping`);
    await page.locator(".arabic-text").first().waitFor();
    ok(await page.getByRole("heading", { name: "What to say before sleeping" }).isVisible(), "/duas/before-sleeping opens that dua directly");
    await page.getByRole("button", { name: "Dua Corner" }).click();
    await page.waitForURL(/\/duas$/);
    await page.locator(".list-item", { hasText: "when you wake up" }).first().click();
    await page.waitForURL(/\/duas\/waking-up$/);
    ok(true, "opening a dua changes the URL");
    await page.goBack();
    await page.waitForURL(/\/duas$/);
    ok(await page.locator(".list-item").first().isVisible(), "browser back returns to the dua list");
    await page.goto(`${BASE}/surahs/al-ikhlaas`);
    await page.getByRole("heading", { name: "Surah Al-Ikhlaas" }).waitFor();
    ok(true, "/surahs/al-ikhlaas opens that surah");
    await page.goto(`${BASE}/surahs/no-such-surah`);
    await page.locator(".list-item").first().waitFor();
    ok(true, "unknown surah link falls back to the list");
    await page.goto(`${BASE}/printables/ramadan-countdown`);
    await page.getByRole("heading", { name: "Ramadan countdown calendar" }).waitFor();
    ok(true, "/printables/ramadan-countdown opens that printable");
  });

  // ---------- printables ----------
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/printables`);
    await page.locator(".printable-card").first().waitFor();
    ok((await page.locator(".printable-card").count()) === 4, "4 free printables listed");
    ok(!(await page.getByText("99 Names").count()), "99 Names placeholder is not listed");
    ok(!(await page.locator("#email").count()), "no sign-in wall");
    const links = await page.locator("a[href$='.pdf']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    ok(links.length === 8, `colour and black-and-white for each (got ${links.length})`);
    for (const href of links) {
      const r = await page.request.get(BASE + href);
      const type = r.headers()["content-type"] ?? "";
      const head = (await r.body()).subarray(0, 5).toString("latin1");
      ok(r.status() === 200 && /pdf/.test(type) && head === "%PDF-", `${href}: ${r.status()} ${type}`);
    }
    ok((await page.getByText(/\bprice\b|checkout|buy now/i).count()) === 0, "no payment step");
    await page.screenshot({ path: `qa/shots/${w}-enh-printables.png`, fullPage: true });
  });

  // ---------- install prompt ----------
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/`);
    await page.locator(".landing-title").waitFor();
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt");
      e.prompt = async () => { window.__installPrompted = true; };
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });
    const prompt = page.locator(".install-prompt");
    await prompt.waitFor();
    await prompt.getByRole("button", { name: "Install" }).click();
    ok(await page.evaluate(() => window.__installPrompted === true), "Install opens the browser's install dialog");
    ok((await prompt.count()) === 0, "prompt goes away after installing");
    await page.goto(`${BASE}/duas`);
    await page.locator(".list-item").first().waitFor();
    ok((await page.locator(".install-prompt").count()) === 0, "no install prompt on children's pages");
  });
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/`);
    await page.locator(".install-prompt").waitFor();
    ok(/Add to Home Screen/.test(await page.locator(".install-prompt").innerText()), "iPhone Safari: Share then Add to Home Screen");
    await page.getByRole("button", { name: "Not now" }).click();
    await page.reload();
    await page.locator(".landing-title").waitFor();
    ok((await page.locator(".install-prompt").count()) === 0, "dismissed prompt stays hidden");
  }, { userAgent: IOS, isMobile: w < 768, hasTouch: w < 768 });
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/`);
    await page.locator(".install-prompt").waitFor();
    ok(/open this page in your browser/i.test(await page.locator(".install-prompt").innerText()), "Instagram in-app browser: suggests opening in the browser");
  }, { userAgent: INSTAGRAM });

  // ---------- game levels (guest) ----------
  await run(w, h, async (page, ok) => {
    await page.goto(`${BASE}/play`);
    await page.getByRole("button", { name: /Kindness Quiz/ }).waitFor();
    const quizLevels = page.getByRole("group", { name: "Quiz level" });
    ok(await quizLevels.getByRole("button", { name: /Standard/ }).isDisabled(), "Standard locked before Gentle is finished");
    await page.getByRole("button", { name: /Kindness Quiz/ }).click();
    await page.locator(".option").first().waitFor();
    ok((await page.locator(".dots span").count()) === 4 && (await page.locator(".option").count()) === 2, "Gentle: 4 questions, 2 choices");
    await playQuiz(page);
    ok(await page.getByText("Gentle level").isVisible(), "result shows the level");
    ok(await page.getByText("New level unlocked: Standard!").isVisible(), "finishing unlocks Standard");
    await page.getByRole("button", { name: "Try Standard" }).click();
    await page.locator(".option").first().waitFor();
    ok((await page.locator(".dots span").count()) === 6 && (await page.locator(".option").count()) === 3, "Standard: 6 questions, 3 choices");
    await playQuiz(page);
    await page.getByRole("button", { name: "Try Challenge" }).click();
    await page.locator(".option").first().waitFor();
    ok((await page.locator(".dots span").count()) === 8 && (await page.locator(".option").count()) === 4, "Challenge: 8 questions, 4 choices");
    await page.getByRole("button", { name: "Close quiz" }).click();

    const matchLevels = page.getByRole("group", { name: "Matching level" });
    ok(await matchLevels.getByRole("button", { name: /Level 2/ }).isDisabled(), "matching Level 2 locked at first");
    ok(await matchLevels.getByRole("button", { name: /Super Matching/ }).isDisabled(), "Super Matching locked without a streak");
    await page.getByRole("button", { name: /Picture Matching/ }).click();
    ok((await page.locator(".memory-card").count()) === 8, "Level 1: 4 pairs");
    await solveMatching(page);
    ok(/Time \d+:\d\d · Best \d+:\d\d/.test(await page.locator(".match-time").innerText()), "time and best time shown");
    const best = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ds_match_best_guest_1")).length);
    ok(best === 1, "best time kept on this device only");
    await page.getByRole("button", { name: "Back" }).first().click();
    await matchLevels.getByRole("button", { name: /Level 2/ }).click();
    await page.getByRole("button", { name: /Picture Matching/ }).click();
    ok((await page.locator(".memory-card").count()) === 12, "Level 2: 6 pairs");
    await page.screenshot({ path: `qa/shots/${w}-enh-matching-l2.png` });
  });
}

// ---------- signed in: shared link while signed in, child printables, streak unlock ----------
await run(1440, 900, async (page, ok) => {
  await page.goto(`${BASE}/signin`);
  await page.fill("#email", "qa@example.test");
  await page.fill("#password", "qa-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
  await page.goto(`${BASE}/stories`);
  await page.locator(".tile").first().waitFor();
  ok(await page.getByRole("link", { name: "Open the app" }).first().isVisible(), "signed-in parent on a shared link sees the page, with Open the app");
  await page.getByRole("link", { name: "Open the app" }).first().click();
  await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
  if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) await page.getByText("Aya").first().click();
  await page.getByText("Today's deed").waitFor();
  await page.getByRole("button", { name: /Printables/ }).first().click();
  await page.locator(".printable-card").first().waitFor();
  ok((await page.locator(".printable-card").count()) === 4, "child Home lists the printables");
  ok((await page.locator("a[href$='.pdf'], a[download]").count()) === 0, "child view has no download links");
  await page.getByRole("button", { name: "Back" }).first().click();
  await page.locator("nav.tabbar button.tab", { hasText: /^Play$/ }).click();
  await page.getByText("New game unlocked: Super Matching!").waitFor({ timeout: 15000 });
  ok(true, "7-day streak shows the New game unlocked moment");
  await page.waitForTimeout(2000);
  const sm = page.getByRole("group", { name: "Matching level" }).getByRole("button", { name: /Super Matching/ });
  ok(await sm.isEnabled(), "Super Matching unlocked by the streak");
  await sm.click();
  await page.getByRole("button", { name: /Picture Matching/ }).click();
  ok((await page.locator(".memory-card").count()) === 16, "Super Matching: 8 pairs");
  await page.screenshot({ path: "qa/shots/1440-enh-super-matching.png" });
  await page.getByRole("button", { name: "Back" }).first().click();
  // Parent area printables tab has downloads.
  await page.locator("nav.tabbar button.tab", { hasText: /^Me$/ }).click();
  await page.getByText("Parent area").last().click();
  const prompt = await page.getByText(/plus/).first().innerText();
  const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
  await page.getByRole("button", { name: String(WORDS.indexOf(m[1]) + WORDS.indexOf(m[2])), exact: true }).click();
  for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  await page.locator("nav.tabbar button.tab", { hasText: /^Printables$/ }).click();
  ok((await page.locator("a[href$='.pdf']").count()) === 8, "parent area Printables tab has the downloads");
});

await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
