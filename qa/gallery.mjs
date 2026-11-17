// Screenshots the dev-only scene gallery for visual review. Needs `npm run dev` in web/ (port 5173).
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173/?gallery=scenes", { waitUntil: "networkidle" });
const figures = await page.$$("figure");
const per = 9;
for (let i = 0; i < figures.length; i += per) {
  const first = await figures[i].boundingBox();
  const last = await figures[Math.min(i + per, figures.length) - 1].boundingBox();
  await page.screenshot({
    path: `shots/gallery-${i / per + 1}.png`,
    clip: { x: 0, y: first.y - 4, width: 1200, height: last.y + last.height - first.y + 8 },
    fullPage: true,
  });
}
console.log(`figures: ${figures.length}`);
await browser.close();
