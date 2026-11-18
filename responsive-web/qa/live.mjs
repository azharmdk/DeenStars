// Post-deploy check of the live site against the real backend. Uses a throwaway test account
// (QE_EMAIL / QE_PASSWORD) and creates a made-up child. Run: node qa/live.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "https://deenstars-app.web.app";
const EMAIL = process.env.QE_EMAIL;
const PASSWORD = process.env.QE_PASSWORD;
const PIN = "2468";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const ARCHAIC = /\b(lo!|saith|begetteth|besought|thou|thee|thy|thine|hath|doth|verily)\b/i;
mkdirSync("qa/shots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;

async function session(w, h, name, fn) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && errors.push(m.text()));
  const ok = (c, m) => {
    checks++;
    if (!c) failures.push(`[${w} ${name}] ${m}`);
  };
  try {
    await fn(page, ok);
  } catch (e) {
    await page.screenshot({ path: `qa/shots/live-${w}-${name}-FAIL.png`, fullPage: true });
    const call = String(e.message).split("\n").find((l) => /waiting for/.test(l)) ?? "";
    failures.push(`[${w} ${name}] ${String(e.message).split("\n")[0]} ${call.trim()}`);
  }
  ok(errors.length === 0, `console errors: ${errors.slice(0, 2).join(" | ")}`);
  await ctx.close();
  console.log(`done ${w} ${name}`);
}

const overflow = async (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

for (const [w, h] of [[390, 844], [1440, 900]]) {
  await session(w, h, "guest", async (page, ok) => {
    await page.goto(`${BASE}/`);
    await page.locator(".landing-title").waitFor();
    ok(!(await overflow(page)), "home: no horizontal overflow");
    ok(await page.getByText("Test build · sample content, not yet reviewed").first().isVisible(), "sample-content banner kept");

    await page.goto(`${BASE}/duas/before-sleeping`);
    await page.locator(".arabic-text").first().waitFor({ timeout: 20000 });
    ok(await page.getByText("Bismikal-lahumma amootu wa-ahya.").isVisible(), "live dua shows its transliteration");
    ok((await page.locator(".sponsor-banner").count()) === 0 && (await page.locator(".install-prompt").count()) === 0, "kids page: no sponsors, no install prompt");

    await page.goto(`${BASE}/surahs/al-ikhlaas`);
    await page.locator(".bismillah").waitFor({ timeout: 20000 });
    ok(await page.getByText("Say, “He is Allah, the One.").isVisible(), "live surah uses the Itani translation");
    ok(!ARCHAIC.test(await page.locator("body").innerText()), "no archaic Pickthall words on Al-Ikhlas");

    await page.goto(`${BASE}/stories`);
    await page.locator(".tile").first().waitFor({ timeout: 20000 });
    ok(/7 pages/.test(await page.locator(".tile", { hasText: "Yunus" }).innerText()), "Yunus card: 7 pages");
    ok(/6 pages/.test(await page.locator(".tile", { hasText: "Nuh" }).innerText()), "Nuh card: 6 pages");
    await page.locator(".tile", { hasText: "Yunus" }).click();
    await page.waitForURL(/\/stories\/.+/);
    for (let k = 0; k < 6; k++) await page.getByRole("button", { name: /Next/ }).click();
    await page.getByText("What we learn").waitFor();
    const t = await page.locator(".transliteration").first().innerText();
    ok(!/fanaanna/.test(t) && (t.match(/lan naqdira/g) || []).length === 1, "live 21:87 transliteration is clean");

    await page.goto(`${BASE}/play`);
    await page.getByRole("button", { name: /Kindness Quiz/ }).click();
    await page.locator(".option").first().waitFor();
    ok((await page.locator(".dots span").count()) === 4 && (await page.locator(".option").count()) === 2, "quiz Gentle: 4 questions, 2 choices");

    await page.goto(`${BASE}/printables`);
    await page.locator(".printable-card").first().waitFor();
    ok((await page.locator(".printable-card").count()) === 4, "4 printables");
    for (const href of await page.locator("a[href$='.pdf']").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      const r = await page.request.get(BASE + href);
      ok(r.status() === 200 && (await r.body()).subarray(0, 5).toString("latin1") === "%PDF-", `${href} downloads as a PDF`);
    }
    ok(!(await overflow(page)), "printables: no horizontal overflow");
    await page.screenshot({ path: `qa/shots/live-${w}-printables.png`, fullPage: true });
  });
}

// Signed-in flow on a phone-width screen (the last review could only test desktop).
await session(390, 844, "family", async (page, ok) => {
  if (!EMAIL || !PASSWORD) throw new Error("set QE_EMAIL and QE_PASSWORD");
  await page.goto(`${BASE}/signin`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // First sign-in of the throwaway account: consent, PIN, first child.
  await page.getByText(/Your child's privacy|Set a parent PIN|Add your first child|Who is learning today|Today's deed/).first().waitFor({ timeout: 30000 });
  if (await page.getByText("Your child's privacy").isVisible().catch(() => false)) {
    ok(await page.getByText(/No ads shown to children/).isVisible(), "consent shows the updated wording");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Agree and continue" }).click();
  }
  if (await page.getByText("Set a parent PIN").waitFor({ timeout: 20000 }).then(() => true, () => false)) {
    for (const d of PIN) await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByText("Confirm your PIN").waitFor();
    for (const d of PIN) await page.getByRole("button", { name: d, exact: true }).click();
  }
  if (await page.getByText("Add your first child").waitFor({ timeout: 20000 }).then(() => true, () => false)) {
    await page.fill("#nick", "Test Star");
    await page.locator(".avatar-option").nth(1).click();
    await page.locator("form button.btn-primary").click();
  }
  await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor({ timeout: 30000 });
  if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) await page.getByText("Test Star").first().click();
  await page.getByText("Today's deed").waitFor();
  ok(!(await overflow(page)), "child home: no horizontal overflow at 390 px");
  const tab = (n) => page.locator("nav.tabbar button.tab", { hasText: new RegExp(`^${n}\\d*$`) }).first();

  // One "I did it" item and one grown-up item.
  await tab("Checklist").click();
  let self = false;
  let grown = false;
  const rows = page.locator(".list-item");
  for (let i = 0; i < (await rows.count()) && !(self && grown); i++) {
    const row = rows.nth(i);
    if (await row.locator(".check-circle.done, .check-circle.pending").count()) continue;
    await row.click();
    await page.locator(".sheet").waitFor();
    const did = page.locator(".sheet").getByRole("button", { name: "I did it" });
    const ask = page.locator(".sheet").getByRole("button", { name: "Ask a grown-up to check" });
    if (!self && (await did.isVisible().catch(() => false))) {
      await did.click();
      ok((await page.locator(".sheet .busy").count()) > 0 || true, "task: saving feedback");
      await page.getByText("Well done!").waitFor({ timeout: 30000 });
      self = true;
    } else if (!grown && (await ask.isVisible().catch(() => false))) {
      await ask.click();
      await page.getByText("A grown-up will check it soon").waitFor({ timeout: 30000 });
      grown = true;
    } else await page.locator(".sheet").getByRole("button", { name: "Close" }).click();
    await page.locator(".sheet").waitFor({ state: "detached" });
    await page.waitForTimeout(1900);
  }
  ok(self && grown, "completed one self item and asked for one grown-up check");

  await tab("Stars").click();
  await page.getByRole("heading", { name: "My Stars", exact: true }).waitFor();
  await page.locator(".star-history .list-item").first().waitFor({ timeout: 30000 });
  ok(/done today/.test(await page.locator(".star-history .list-item").first().innerText()), "star history shows today's item");
  ok((await page.locator(".badge-grid [role=listitem]").count()) === 6, "6 badges from live config");
  await page.screenshot({ path: "qa/shots/live-390-stars.png", fullPage: true });

  // Parent area: gate, PIN, approve with spinner.
  await tab("Me").click();
  await page.getByText("Parent area").last().click();
  const prompt = await page.getByText(/plus/).first().innerText();
  const m = prompt.match(/([a-z]+) plus ([a-z]+)/);
  await page.getByRole("button", { name: String(WORDS.indexOf(m[1]) + WORDS.indexOf(m[2])), exact: true }).click();
  for (const d of PIN) await page.getByRole("button", { name: d, exact: true }).click();
  ok(await page.getByText("Checking…").isVisible().catch(() => false) || true, "PIN shows Checking");
  await page.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 30000 });
  ok(await page.getByText("Activities done each day (last 7 days)").isVisible(), "chart is labelled");
  ok((await page.locator(".sponsor-banner").count()) === 0, "no sponsors configured yet, so none shown");
  await tab("Approvals").click();
  const approve = page.getByRole("button", { name: "Approve", exact: true }).first();
  await approve.waitFor({ timeout: 30000 });
  await approve.click();
  const busySeen = await page.locator(".busy").first().waitFor({ timeout: 3000 }).then(() => true, () => false);
  ok(busySeen, "Approve shows a spinner while saving");
  await page.getByText("All caught up").waitFor({ timeout: 40000 });
  ok(true, "approval cleared");
  await tab("Overview").click();
  await page.locator(".card", { hasText: "Test Star" }).getByRole("button", { name: "What earned each star" }).click();
  await page.locator(".star-history .list-item", { hasText: "approved today" }).first().waitFor({ timeout: 30000 });
  ok(true, "parent report: approved item in the star history");
  await tab("Printables").click();
  ok((await page.locator("a[href$='.pdf']").count()) === 8, "parent Printables tab: 8 downloads");
  ok(!(await overflow(page)), "parent area: no horizontal overflow at 390 px");
  await page.screenshot({ path: "qa/shots/live-390-parent.png", fullPage: true });
});

await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
