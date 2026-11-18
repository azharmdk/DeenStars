// Acceptance checks for Fix 1 (quiz scoring) and Fix 2 (content accuracy).
// Needs: emulators running and seeded, and `npm run dev:emu` in responsive-web/ (port 5174).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const WIDTHS = [[390, 844], [1440, 900]];
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const CORRECT = ["Help pick them up", "Thank you!", "Put them away", "Share and play together"];
const ARCHAIC = /\b(lo!|saith|begetteth|besought|thou|thee|thy|thine|hath|doth|ye|ere|verily)\b/i;
const BANNER = "Test build · sample content, not yet reviewed";
mkdirSync("qa/shots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w}] ${m}`);
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      await page.screenshot({ path: `qa/shots/${w}-fixes-FAIL-${name}.png`, fullPage: true });
      failures.push(`[${w}] ${name}: ${String(e.message).split("\n")[0]}`);
    }
  };
  const bannerShown = async (where) => ok(await page.getByText(BANNER).first().isVisible(), `${where}: sample-content banner missing`);
  const noArchaic = async (where) => {
    const text = await page.locator("body").innerText();
    const m = text.match(ARCHAIC);
    ok(!m, `${where}: archaic word "${m?.[0]}" on the page`);
  };
  /** True when nothing is drawn on top of the element (no toast or overlay covering it). */
  const uncovered = (loc) =>
    loc.evaluate((el) => {
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      // Points on the centre line, inset by half the height so rounded (pill) ends are not tested.
      const y = r.top + r.height / 2;
      const inset = Math.min(r.height / 2, r.width / 2);
      const pts = [[r.left + r.width / 2, y], [r.left + inset, y], [r.right - inset, y]];
      return pts.every(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return !!hit && (hit === el || el.contains(hit));
      });
    });

  // ---------------- Fix 1: quiz scoring ----------------
  await step("quiz 3 of 4", async () => {
    await page.goto(`${BASE}/play`);
    await page.locator(".guest-age button", { hasText: "5" }).click();
    await page.getByRole("button", { name: /Kindness Quiz/ }).click();
    for (let q = 0; q < 4; q++) {
      await page.locator(".option").first().waitFor();
      const options = page.locator(".option");
      const n = await options.count();
      let pick = -1;
      for (let k = 0; k < n; k++) {
        const text = (await options.nth(k).innerText()).replace(/^[A-D]\s*/, "").trim();
        const isRight = CORRECT.includes(text);
        if (q === 1 ? !isRight : isRight) { pick = k; break; } // question 2 answered wrongly on purpose
      }
      await options.nth(pick).click();
      await page.getByRole("button", { name: q < 3 ? "Next question" : "Finish" }).click();
    }
    const heading = page.getByRole("heading", { level: 1 });
    await heading.waitFor();
    ok((await heading.innerText()).trim() === "You got 3 out of 4 right!", `quiz: heading was "${await heading.innerText()}"`);
    ok(await page.getByText("You learned 3 new things!").isVisible(), "quiz: learned line counts correct answers only");
    ok(!(await page.getByText("You learned 4 new things!").count()), "quiz: no longer reports attempts");
    ok((await page.locator(".celebrate").count()) === 0, "quiz: no overlay toast on the result screen");
    ok(await uncovered(heading), "quiz: heading is not covered");
    for (const name of ["Play again", "Back to Play & Learn"]) ok(await uncovered(page.getByRole("button", { name })), `quiz: "${name}" button is not covered`);
    await page.screenshot({ path: `qa/shots/${w}-fixes-quiz-result.png`, fullPage: true });
    // A full-marks run reports 4.
    await page.getByRole("button", { name: "Play again" }).click();
    for (let q = 0; q < 4; q++) {
      const options = page.locator(".option");
      await options.first().waitFor();
      for (let k = 0; k < (await options.count()); k++) {
        if (CORRECT.includes((await options.nth(k).innerText()).replace(/^[A-D]\s*/, "").trim())) { await options.nth(k).click(); break; }
      }
      await page.getByRole("button", { name: q < 3 ? "Next question" : "Finish" }).click();
    }
    ok((await page.getByRole("heading", { level: 1 }).innerText()).trim() === "You got 4 out of 4 right!", "quiz: full marks shows 4 out of 4");
  });

  await step("matching", async () => {
    await page.goto(`${BASE}/play`);
    await page.getByRole("button", { name: /Picture Matching/ }).click();
    await page.locator(".memory-card").first().waitFor();
    ok((await page.locator(".celebrate").count()) === 0, "matching: no overlay");
  });

  // ---------------- Fix 2: stories ----------------
  await step("story page counts", async () => {
    await page.goto(`${BASE}/stories`);
    await page.locator(".tile").first().waitFor();
    for (const [title, pages] of [["Yunus", 7], ["Nuh", 6]]) {
      const card = page.locator(".tile", { hasText: title });
      ok((await card.innerText()).includes(`${pages} pages`), `${title} card shows ${pages} pages (got "${(await card.innerText()).replace(/\n/g, " ")}")`);
      await card.click();
      await page.getByText(new RegExp(`^1 / ${pages}$`)).waitFor();
      ok(true, `${title} reader has ${pages} pages`);
      await page.goto(`${BASE}/stories`);
      await page.locator(".tile").first().waitFor();
    }
    await bannerShown("stories");
  });

  await step("yunus verse", async () => {
    await page.locator(".tile", { hasText: "Yunus" }).click();
    for (let k = 0; k < 6; k++) await page.getByRole("button", { name: /Next/ }).click();
    await page.getByText("What we learn").waitFor();
    const t = await page.locator(".transliteration").first().innerText();
    ok(!/fanaanna/.test(t) && (t.match(/lan naqdira/g) || []).length === 1, `21:87 transliteration is clean: "${t}"`);
    ok(await page.getByText("Translation: Talal Itani, ClearQuran.com").isVisible(), "story verse credits Talal Itani");
    await noArchaic("yunus verse page");
    await page.getByRole("button", { name: /Read the verses/ }).click();
    const refs = await page.locator(".band-pill").allInnerTexts();
    const keys = refs.map((r) => r.match(/(\d+:\d+)$/)?.[1]).filter(Boolean);
    const sorted = [...keys].sort((a, b) => { const [x, y] = a.split(":").map(Number); const [p, q] = b.split(":").map(Number); return x - p || y - q; });
    ok(JSON.stringify(keys) === JSON.stringify(sorted), `yunus verses in Quran order: ${keys.join(", ")}`);
    await noArchaic("yunus verse panel");
    await page.screenshot({ path: `qa/shots/${w}-fixes-yunus-verse.png`, fullPage: true });
  });

  await step("nuh verse order", async () => {
    await page.goto(`${BASE}/stories`);
    await page.locator(".tile", { hasText: "Nuh" }).click();
    await page.getByRole("button", { name: /Read the verses/ }).click();
    const keys = (await page.locator(".band-pill").allInnerTexts()).map((r) => r.match(/(\d+:\d+)$/)?.[1]).filter(Boolean);
    const sorted = [...keys].sort((a, b) => { const [x, y] = a.split(":").map(Number); const [p, q] = b.split(":").map(Number); return x - p || y - q; });
    ok(keys.length > 2 && JSON.stringify(keys) === JSON.stringify(sorted), `nuh verses in Quran order: ${keys.join(", ")}`);
  });

  // ---------------- Fix 2: duas ----------------
  await step("dua transliterations", async () => {
    await page.goto(`${BASE}/duas`);
    await page.locator(".list-item").first().waitFor();
    const n = await page.locator(".list-item").count();
    let withTranslit = 0;
    for (let k = 0; k < n; k++) {
      await page.locator(".list-item").nth(k).click();
      await page.locator(".arabic-text").first().waitFor();
      if (await page.locator(".transliteration").first().isVisible().catch(() => false)) withTranslit++;
      await noArchaic(`dua ${k + 1}`);
      await bannerShown(`dua ${k + 1}`);
      if (k === 0) await page.screenshot({ path: `qa/shots/${w}-fixes-dua-sleep.png`, fullPage: true });
      await page.getByRole("button", { name: "Dua Corner" }).click();
      await page.locator(".list-item").first().waitFor();
    }
    ok(withTranslit === n, `every dua shows a transliteration (${withTranslit} of ${n})`);
    await page.getByText("What to say before sleeping").first().click();
    ok(await page.getByText("Bismikal-lahumma amootu wa-ahya.").isVisible(), "sleeping dua transliteration from Hisn al-Muslim");
  });

  // ---------------- Fix 2: surahs ----------------
  await step("surah bismillah and translation", async () => {
    await page.goto(`${BASE}/surahs`);
    await page.locator(".list-item").first().waitFor();
    await page.locator(".list-item", { hasText: "Ikhlaas" }).click();
    await page.locator(".bismillah").waitFor();
    ok(await page.locator(".bismillah").getByText("In the name of Allah, the Gracious, the Merciful.").isVisible(), "Bismillah on its own line with its translation");
    const ayah1 = await page.locator(".list .list-item").first().locator(".arabic-text").innerText();
    ok(!ayah1.startsWith("بِسْمِ"), "ayah 1 no longer starts with the Bismillah");
    ok(await page.getByText("Say, “He is Allah, the One.").isVisible(), "Itani translation of 112:1");
    ok(await page.getByText(/Translation: Talal Itani, ClearQuran\.com/).isVisible(), "surah credits Talal Itani");
    await noArchaic("Al-Ikhlas");
    await bannerShown("Al-Ikhlas");
    await page.screenshot({ path: `qa/shots/${w}-fixes-ikhlas.png`, fullPage: true });
    await page.getByRole("button", { name: "Surahs" }).click();
    await page.locator(".list-item", { hasText: "Faatiha" }).click();
    await page.locator(".arabic-text").first().waitFor();
    ok((await page.locator(".bismillah").count()) === 0, "Al-Fatiha keeps the Bismillah as ayah 1 (no separate line)");
    await noArchaic("Al-Fatiha");
  });

  // ---------------- Fix 2.6: approvals sentence (signed in, at one width) ----------------
  if (w === 1440) {
    await step("approvals wording", async () => {
      await page.goto(`${BASE}/signin`);
      await page.fill("#email", "qa@example.test");
      await page.fill("#password", "qa-password-123");
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
      if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) await page.getByText("Aya").first().click();
      await page.getByText("Today's deed").waitFor();
      // Create one pending item so the sentence shows.
      await page.locator("nav.tabbar button.tab", { hasText: /^Checklist$/ }).click();
      const rows = page.locator(".list-item");
      for (let k = 0; k < (await rows.count()); k++) {
        await rows.nth(k).click();
        const ask = page.locator(".sheet").getByRole("button", { name: "Ask a grown-up to check" });
        if (await ask.isVisible().catch(() => false)) { await ask.click(); break; }
        await page.locator(".sheet").getByRole("button", { name: "Close" }).click();
      }
      await page.waitForTimeout(2000);
      await page.locator("nav.tabbar button.tab", { hasText: /^Me$/ }).click();
      await page.getByText("Parent area").last().click();
      const prompt = await page.getByText(/plus/).first().innerText();
      const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
      await page.getByRole("button", { name: String(WORDS.indexOf(m[1]) + WORDS.indexOf(m[2])), exact: true }).click();
      for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
      await page.getByRole("heading", { name: "Overview" }).waitFor();
      await page.locator("nav.tabbar button.tab", { hasText: /^Approvals\d*$/ }).click();
      await page.getByText("Each item stays here until the end of the day after it was asked for.").waitFor({ timeout: 15000 });
      ok((await page.getByText("Items you don't get to stay here").count()) === 0, "old garbled sentence is gone");
      await page.locator("nav.tabbar button.tab", { hasText: /^Settings$/ }).click();
      ok(await page.getByRole("link", { name: "ClearQuran.com" }).isVisible(), "parent Settings links the translation credit");
    });
  }

  ok(errors.length === 0, `page errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
  console.log(`done ${w}px`);
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
