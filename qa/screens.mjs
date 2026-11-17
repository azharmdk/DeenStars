// Visual QA: walks the app in emulator mode on an iPhone-sized viewport and saves screenshots.
// Needs: emulators running and seeded (functions/scripts/seed-emulator.mjs), and `npm run dev:emu` in web/.
import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const shot = async (name, full = true) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shots/${name}.png`, fullPage: full });
  console.log("shot", name);
};
const click = (text) => page.getByText(text, { exact: false }).first().click();

await page.goto(`${BASE}/?qe=1`);
await click("I already have an account");
await page.fill("#email", "qa@example.test");
await page.fill("#password", "qa-password-123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.getByText("Who is learning today?").waitFor();
await shot("01-picker", false);

await click("Aya");
await page.getByText("Today's deed").waitFor();
await shot("02-home");

await page.getByRole("button", { name: /Stories/ }).first().click();
await page.getByRole("heading", { name: "Stories" }).waitFor();
await shot("03-stories");
await click("Prophet Nuh and the Big Ship");
await shot("04-story-page1", false);
for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /Next/ }).click();
await shot("05-story-verse");
await page.getByRole("button", { name: /Read the verses/ }).click();
await shot("06-story-refs");
await page.getByRole("button", { name: "Stories" }).click();
await page.getByRole("button", { name: "Back" }).first().click();

await page.getByRole("button", { name: /Dua Corner/ }).first().click();
await shot("07-dua-corner");
await click("What to say before sleeping");
await shot("08-dua-detail");
await page.getByRole("button", { name: "Dua Corner" }).click();
await click("Asking for more knowledge");
await shot("09-dua-quran-highlight");
await page.getByRole("button", { name: "Dua Corner" }).click();
await page.getByRole("button", { name: "Back" }).first().click();

await page.getByRole("button", { name: /Short Surahs/ }).click();
await click("Surah Al-Ikhlaas");
await shot("10-surah");
await page.getByRole("button", { name: "Surahs" }).click();
await page.getByRole("button", { name: "Back" }).first().click();

await page.getByRole("button", { name: /Bedtime/ }).click();
await shot("11-bedtime-start", false);
await page.getByRole("button", { name: /Go straight to bedtime duas/ }).click();
await shot("12-bedtime-duas");
await page.getByRole("button", { name: "Leave bedtime" }).click();

// Ramadan via tester tools.
await page.evaluate(() => localStorage.setItem("ds_sim_season", "ramadan:5"));
await page.reload();
await page.getByText("Today's deed").waitFor();
await shot("13-home-ramadan", false);
await click("Ramadan Mubarak · Day 5");
await shot("14-ramadan");
await page.evaluate(() => localStorage.setItem("ds_sim_season", "eidFitr:1"));
await page.reload();
await page.getByText("Today's deed").waitFor();
await click("Eid Mubarak!");
await shot("15-eid");
await page.evaluate(() => localStorage.removeItem("ds_sim_season"));

// Friday story via tester tools.
await page.evaluate(() => localStorage.setItem("ds_sim_friday", "1"));
await page.reload();
await page.getByText("Today's deed").waitFor();
await click("Jummah Mubarak");
await shot("16-jummah-story");
await page.evaluate(() => localStorage.removeItem("ds_sim_friday"));

// Parent area: solve the gate by reading the question.
await page.reload();
await page.getByText("Today's deed").waitFor();
await page.getByRole("button", { name: "Me", exact: true }).click();
await page.getByRole("button", { name: /Parent area/ }).click();
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const q = await page.locator("p.muted strong").allInnerTexts();
const answer = words.indexOf(q[0]) + words.indexOf(q[1]);
await page.getByRole("button", { name: String(answer), exact: true }).click();
for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
await page.getByText("Weekly report").waitFor();
await shot("17-parent-overview");
await page.getByRole("button", { name: /Children/ }).last().click();
await click("Aya");
await shot("18-parent-child");
await page.getByRole("button", { name: /Certificate/ }).first().click();
await shot("19-certificate", false);
await page.getByRole("button", { name: "Close" }).click();
await page.getByRole("button", { name: /Settings/ }).last().click();
await shot("20-parent-settings");

console.log(errors.length ? `PAGE ERRORS:\n${[...new Set(errors)].join("\n")}` : "no page errors");
await browser.close();
