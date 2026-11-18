// Acceptance checks for Fix 3: star history, day streak and badges, chart labels, save feedback,
// desktop layout. Emulator only: it writes six past days of fake ledger entries for the test child
// "Aya" (owner credentials, emulator REST API), then a real approval today goes through Cloud Functions.
// Needs: emulators running and freshly seeded, and `npm run dev:emu` in responsive-web/ (port 5174).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const FS = "http://127.0.0.1:8080/v1/projects/deenstars-dev/databases/(default)/documents";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
mkdirSync("qa/shots", { recursive: true });

// ---------- emulator fixture ----------
async function findChild(nickname) {
  const res = await fetch(`${FS}:runQuery`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "children" }], where: { fieldFilter: { field: { fieldPath: "nickname" }, op: "EQUAL", value: { stringValue: nickname } } } } }),
  });
  const rows = (await res.json()).filter((r) => r.document);
  const d = rows[0].document;
  return { id: d.name.split("/").pop(), timeZone: d.fields.timeZone.stringValue };
}
const dayIn = (tz, offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
async function addLedger(childId, dayKey) {
  const id = `fixture_good_deed_${dayKey}`;
  const fields = {
    amount: { integerValue: "2" }, sourceType: { stringValue: "activity" }, sourceId: { stringValue: "act_deed_help_parents" },
    ruleKey: { stringValue: "good_deed" }, category: { stringValue: "goodDeed" }, dayKey: { stringValue: dayKey },
    createdAt: { timestampValue: new Date(`${dayKey}T12:00:00Z`).toISOString() },
  };
  const r = await fetch(`${FS}/children/${childId}/starTransactions?documentId=${id}`, { method: "POST", headers: OWNER, body: JSON.stringify({ fields }) });
  if (!r.ok && r.status !== 409) throw new Error(`fixture write failed ${r.status}`);
}
async function getDoc(path) {
  const r = await fetch(`${FS}/${path}`, { headers: OWNER });
  return r.ok ? r.json() : null;
}

const aya = await findChild("Aya");
for (let k = 1; k <= 6; k++) await addLedger(aya.id, dayIn(aya.timeZone, -k));
console.log("fixture: 6 past good-deed days for Aya");

// ---------- browser ----------
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
let checks = 0;
const ok = (w, c, m) => {
  checks++;
  if (!c) failures.push(`[${w}] ${m}`);
};

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let decideCalls = 0;
  page.on("request", (r) => r.url().includes("/decideApproval") && decideCalls++);
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      await page.screenshot({ path: `qa/shots/${w}-fix3-FAIL-${name}.png`, fullPage: true });
      failures.push(`[${w}] ${name}: ${String(e.message).split("\n")[0]}`);
    }
  };
  const tab = (n) => page.locator("nav.tabbar button.tab", { hasText: new RegExp(`^${n}\\d*$`) }).first();
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
    await page.goto(`${BASE}/signin`);
    await page.fill("#email", "qa@example.test");
    await page.fill("#password", "qa-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText(/Who is learning today\?|Today's deed/).first().waitFor();
    if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) await page.getByText("Aya").first().click();
    await page.getByText("Today's deed").waitFor();
  });

  if (w === 1440) {
    // Ask a grown-up to check "Help Mommy or Daddy", then approve it (double tap) in the parent area.
    await step("request good deed", async () => {
      await tab("Checklist").click();
      await page.locator(".list-item", { hasText: "Help Mommy or Daddy" }).click();
      const ask = page.locator(".sheet").getByRole("button", { name: "Ask a grown-up to check" });
      await ask.click();
      ok(w, (await page.locator(".sheet .busy").count()) > 0 || (await ask.isDisabled().catch(() => true)), "task sheet: spinner or disabled while saving");
      await page.getByText("A grown-up will check it soon").waitFor();
      await page.waitForTimeout(2000);
    });

    await step("approve with spinner and double tap", async () => {
      await parentArea();
      await tab("Approvals").click();
      const card = page.locator(".card", { hasText: "Help Mommy or Daddy" });
      const approve = card.getByRole("button", { name: "Approve", exact: true });
      await approve.waitFor({ timeout: 15000 });
      // Simulate the ~5 second save seen on the live site, so the in-progress state can be checked.
      await page.route("**/decideApproval", async (route) => {
        await new Promise((r) => setTimeout(r, 2500));
        await route.continue();
      });
      await approve.click();
      await card.locator(".busy").waitFor({ timeout: 2000 });
      ok(w, (await card.locator(".busy").innerText()).includes("Approving"), "approve: shows Approving with a spinner");
      ok(w, await card.getByRole("button", { name: "Not yet" }).isDisabled(), "approve: other buttons disabled while saving");
      await card.locator("button.btn-primary").click({ force: true, timeout: 1000 }).catch(() => undefined); // second tap while saving
      await card.waitFor({ state: "detached", timeout: 20000 });
      ok(w, decideCalls === 1, `approve: one request for a double tap (got ${decideCalls})`);
    });

    await step("server streak and badges", async () => {
      let summary = null;
      for (let i = 0; i < 30 && !summary?.fields?.dayStreak; i++) {
        await page.waitForTimeout(1000);
        summary = await getDoc(`children/${aya.id}/progress/summary`);
      }
      const current = Number(summary?.fields?.dayStreak?.mapValue?.fields?.current?.integerValue ?? 0);
      ok(w, current === 7, `server day streak is 7 (got ${current})`);
      for (const id of ["streak_3", "streak_7", "kindness_week"]) ok(w, !!(await getDoc(`children/${aya.id}/badges/${id}`)), `server awarded badge ${id}`);
      ok(w, !(await getDoc(`children/${aya.id}/badges/stars_100`)), "server did not award stars_100 early");
    });

    await step("parent report", async () => {
      await tab("Overview").click();
      const report = page.locator(".card", { hasText: "Aya" }).filter({ has: page.locator(".chart") }).first();
      await report.getByText("7-day streak").waitFor({ timeout: 15000 });
      ok(w, await report.getByText("Kindness Week").waitFor({ timeout: 10000 }).then(() => true, () => false), "parent report shows the Kindness Week badge");
      ok(w, await report.getByText("Activities done each day (last 7 days)").isVisible(), "chart is labelled as activities");
      ok(w, (await report.locator(".bar-value").count()) === 7, "each bar shows its number");
      ok(w, await report.getByText(/stars? this week/).first().isVisible(), "star figure is labelled as stars");
      await report.getByRole("button", { name: "What earned each star" }).click();
      const row = report.locator(".star-history .list-item", { hasText: "Help Mommy or Daddy" }).first();
      await row.waitFor();
      ok(w, /approved today/.test(await row.innerText()), `history row says approved today: "${(await row.innerText()).replace(/\n/g, " ")}"`);
      await page.screenshot({ path: `qa/shots/${w}-fix3-parent-report.png`, fullPage: true });
      await page.getByRole("button", { name: "Back to kids" }).click();
    });
  }

  await step("stars page", async () => {
    if (await page.getByText("Who is learning today?").isVisible().catch(() => false)) await page.getByText("Aya").first().click();
    await tab("Stars").click();
    await page.getByRole("heading", { name: "My Stars", exact: true }).waitFor();
    await page.getByText("7-day streak").waitFor({ timeout: 15000 });
    const badges = page.locator(".badge-grid [role=listitem]");
    ok(w, (await badges.count()) === 6, `six badges from config (got ${await badges.count()})`);
    ok(w, /Earned/.test(await badges.filter({ hasText: "Kindness Week" }).innerText()), "Kindness Week earned on the Stars page");
    ok(w, (await page.getByText("Sample milestones").count()) === 0, "hard-coded sample milestones removed");
    const hist = page.locator(".star-history .list-item");
    ok(w, (await hist.count()) >= 7, `star history lists entries (got ${await hist.count()})`);
    ok(w, /\+\d+/.test(await hist.first().innerText()), "history shows the stars earned");
    const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(w, o[0] <= o[1] + 1, `stars page: no horizontal overflow ${o[0]} > ${o[1]}`);
    await page.screenshot({ path: `qa/shots/${w}-fix3-stars.png`, fullPage: true });
  });

  await step("matching size", async () => {
    await tab("Play").click();
    await page.getByRole("button", { name: /Picture Matching/ }).click();
    const card = page.locator(".memory-card").first();
    await card.waitFor();
    const box = await card.boundingBox();
    const last = await page.locator(".memory-card").last().boundingBox();
    ok(w, box.height <= 160, `matching card height ${Math.round(box.height)}px (<=160)`);
    ok(w, last.y + last.height <= h, `all matching cards fit above the fold (bottom ${Math.round(last.y + last.height)} of ${h})`);
    await page.screenshot({ path: `qa/shots/${w}-fix3-matching.png` });
  });

  await step("story caption", async () => {
    await tab("Home").click();
    await page.getByRole("button", { name: /Stories/ }).first().click();
    await page.locator(".tile").first().click();
    const panel = await page.locator(".story-panel").boundingBox();
    const cap = await page.locator(".caption").boundingBox();
    ok(w, cap.y >= panel.y + panel.height - 1, `story caption starts below the picture (caption ${Math.round(cap.y)}, picture bottom ${Math.round(panel.y + panel.height)})`);
    await page.screenshot({ path: `qa/shots/${w}-fix3-story.png` });
  });

  ok(w, errors.length === 0, `page errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
  console.log(`done ${w}px`);
}
await browser.close();
console.log(`${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("FAIL", f);
process.exit(failures.length ? 1 : 0);
