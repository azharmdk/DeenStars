// Builds the free printable PDFs (Enhancement 4) into public/printables/.
// Edge renders each sheet from HTML, so Arabic is shaped correctly with the bundled Amiri Quran font.
// Religious text and deed names come from the imported data packs; nothing is typed here.
// Usage (needs Microsoft Edge, and `npm run build` in ../functions for the deed list):
//   node scripts/make-printables.mjs
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanHisnDisplay, cleanMeaning, cleanTransliteration } from "../src/content.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/printables");
mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
// Fonts and pictures are embedded as data URLs: a page set with setContent cannot read local files.
const dataUrl = (p, type) => `data:${type};base64,${readFileSync(resolve(root, p)).toString("base64")}`;
const file = (p) => dataUrl(p, p.endsWith(".woff2") ? "font/woff2" : "image/png");

// ---------- data from the imported packs ----------
const duas = JSON.parse(readFileSync(resolve(root, "../functions/src/seed/packs/duas.json"), "utf8"));
const sleep = duas.find((d) => d.duaId === "dua_before_sleeping");
if (!sleep?.arabic || !sleep.transliteration) throw new Error("dua_before_sleeping missing from duas.json");
const { buildDevActivities } = require(resolve(root, "../functions/lib/seed/devContent.js"));
const deeds = buildDevActivities()
  .filter((a) => a.data.category === "goodDeed" && !a.data.themeId && a.data.frequency === "daily")
  .map((a) => a.data.title.en.replace(/\s*\(sample\)\s*$/i, ""));
if (deeds.length < 3) throw new Error("not enough good deeds in devContent");

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- shared page frame ----------
const css = (bw) => `
@font-face { font-family: "Jakarta"; src: url("${file("node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2")}") format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Amiri Quran"; src: url("${file("node_modules/@fontsource/amiri-quran/files/amiri-quran-arabic-400-normal.woff2")}") format("woff2"); }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "Jakarta", Arial, sans-serif; color: #14231f; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { display: flex; flex-direction: column; gap: 6mm; height: 100%; padding: 2mm; }
header { display: flex; align-items: center; gap: 5mm; }
header img { width: 22mm; height: 22mm; ${bw ? "filter: grayscale(1) contrast(1.2); opacity: .85;" : ""} }
h1 { margin: 0; font-size: 26pt; font-weight: 800; letter-spacing: -0.02em; color: ${bw ? "#000" : "#0b7a5c"}; }
.sub { margin: 1mm 0 0; font-size: 12pt; color: ${bw ? "#222" : "#445a52"}; }
.name { margin-left: auto; font-size: 12pt; border-bottom: 0.4mm solid #000; min-width: 55mm; padding-bottom: 1mm; color: #444; }
table { width: 100%; border-collapse: separate; border-spacing: 1.6mm; table-layout: fixed; }
th { font-size: 12pt; font-weight: 800; color: ${bw ? "#000" : "#075e46"}; }
td.label { height: 22mm; font-size: 13pt; font-weight: 700; text-align: left; padding: 0 2mm; border-radius: 3mm; background: ${bw ? "#fff" : "#dcf3ea"}; border: ${bw ? "0.4mm solid #000" : "none"}; }
td.box { height: 22mm; border: 0.5mm solid ${bw ? "#000" : "#0b7a5c"}; border-radius: 3mm; text-align: center; vertical-align: middle; font-size: 18pt; color: ${bw ? "#999" : "#e0a100"}; }
.card { border: 0.5mm solid ${bw ? "#000" : "#c9e2d3"}; border-radius: 4mm; padding: 5mm 6mm; background: ${bw ? "#fff" : "#f4fbf7"}; }
.arabic { font-family: "Amiri Quran", serif; font-size: 26pt; line-height: 2; text-align: center; direction: rtl; margin: 0; }
.translit { font-style: italic; text-align: center; font-size: 12pt; margin: 1mm 0; color: ${bw ? "#111" : "#445a52"}; }
.meaning { text-align: center; font-size: 13pt; margin: 1mm 0 0; }
footer { margin-top: auto; font-size: 8pt; color: #555; display: flex; justify-content: space-between; gap: 6mm; border-top: 0.3mm solid #999; padding-top: 2mm; }
table.tall td.box, table.tall td.label { height: 44mm; }
table.compact td.box, table.compact td.label { height: 17mm; }
.grid30 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2.4mm; flex: 1; }
.day { border: 0.5mm solid ${bw ? "#000" : "#2a3a6a"}; border-radius: 3mm; padding: 2mm; display: flex; flex-direction: column; justify-content: space-between; background: ${bw ? "#fff" : "#eef1fb"}; }
.day b { font-size: 16pt; color: ${bw ? "#000" : "#2a3a6a"}; }
.day span { font-size: 7.5pt; color: #555; border-bottom: 0.3mm dotted #777; padding-bottom: 1.5mm; }
`;
const page = ({ title, sub, art, bw, body, footerLeft }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css(bw)}</style></head><body>
<div class="sheet">
  <header><img src="${file(`public/art/${art}.png`)}" alt=""><div><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p></div><span class="name">Name:</span></header>
  ${body}
  <footer><span>${footerLeft}</span><span>DeenStars · deenstars-app.web.app · Sample content, not yet reviewed</span></footer>
</div></body></html>`;

const starRow = (label, n = 7) => `<tr><td class="label">${esc(label)}</td>${"<td class=\"box\">☆</td>".repeat(n)}</tr>`;
const dayHead = (first = "") => `<tr><th style="width:30%">${esc(first)}</th>${DAYS.map((d) => `<th>${d}</th>`).join("")}</tr>`;

// ---------- the four sheets ----------
const SHEETS = [
  {
    id: "bedtime-dua-chart",
    landscape: false,
    html: (bw) =>
      page({
        title: "My bedtime duas",
        sub: "Colour a star each night after we say them together.",
        art: "night",
        bw,
        footerLeft: `Dua: Hisn al-Muslim, item ${sleep.source.itemId} (hisnmuslim.com). Hadith reference to be added by the reviewer.`,
        body: `
  <div class="card">
    <p class="sub" style="text-align:center;margin:0 0 2mm;font-weight:700">${esc(sleep.whenToRecite)}</p>
    <p class="arabic">${esc(cleanHisnDisplay(sleep.arabic))}</p>
    <p class="translit">${esc(cleanTransliteration(sleep.transliteration))}</p>
    <p class="meaning">${esc(cleanMeaning(sleep.translation))}</p>
  </div>
  <table class="tall">${dayHead()}${starRow("Dua before sleeping")}${starRow("Al-Ikhlas, Al-Falaq, An-Nas")}${starRow("Ayat al-Kursi")}</table>`,
      }),
  },
  {
    id: "weekly-salah-tracker",
    landscape: true,
    html: (bw) =>
      page({
        title: "My salah week",
        sub: "Colour a star for each prayer you join with your family. Grown-ups decide.",
        art: "mosque",
        bw,
        footerLeft: "For learning at home with family.",
        body: `<table>${dayHead()}${PRAYERS.map((p) => starRow(p)).join("")}</table>`,
      }),
  },
  {
    id: "good-deeds-star-chart",
    landscape: true,
    html: (bw) =>
      page({
        title: "My good deeds",
        sub: "Every little step counts. Colour a star for each good deed.",
        art: "sparkling-heart",
        bw,
        footerLeft: "Deeds from the DeenStars daily checklist.",
        body: `<table class="compact">${dayHead()}${deeds.slice(0, 6).map((d) => starRow(d)).join("")}${starRow("My own good deed: ____________")}</table>`,
      }),
  },
  {
    id: "ramadan-countdown",
    landscape: false,
    html: (bw) =>
      page({
        title: "My Ramadan countdown",
        sub: "Colour a day each evening. Write or draw one good deed.",
        art: "moon",
        bw,
        footerLeft: "Start on the first day of Ramadan in your area.",
        body: `<div class="grid30">${Array.from({ length: 30 }, (_, i) => `<div class="day"><b>${i + 1}</b><span>Good deed:</span></div>`).join("")}</div>`,
      }),
  },
];

// ---------- render ----------
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext();
const tab = await ctx.newPage();
for (const s of SHEETS) {
  for (const bw of [false, true]) {
    await tab.setContent(s.html(bw), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    const path = resolve(out, `${s.id}-${bw ? "bw" : "colour"}.pdf`);
    await tab.pdf({ path, format: "A4", landscape: s.landscape, printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
    console.log(`${s.id}-${bw ? "bw" : "colour"}.pdf`, `${Math.round(statSync(path).size / 1024)} KB`);
  }
  // Preview image for the website cards (colour, page-shaped).
  const [w, h] = s.landscape ? [1123, 794] : [794, 1123];
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(s.html(false), { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.addStyleTag({ content: "body{padding:38px;background:#fff} .sheet{height:calc(100vh - 76px)}" });
  await tab.screenshot({ path: resolve(out, `${s.id}.png`), type: "png", scale: "css" });
}
await browser.close();
console.log("done");
