/**
 * Downloads the open-source illustration set into public/art (self-hosted, no runtime network host).
 * Source: Microsoft Fluent Emoji, 3D style, MIT licence. https://github.com/microsoft/fluentui-emoji
 * Only objects, nature and animals are used. No people (docs/ISLAMIC_CONTENT_POLICY.md, no-depiction rule).
 *
 * Usage: node scripts/fetch-art.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "art");

// key -> [folder name, file name]
const ART = {
  star: ["Star", "star_3d.png"],
  "glowing-star": ["Glowing star", "glowing_star_3d.png"],
  moon: ["Crescent moon", "crescent_moon_3d.png"],
  night: ["Night with stars", "night_with_stars_3d.png"],
  mosque: ["Mosque", "mosque_3d.png"],
  book: ["Open book", "open_book_3d.png"],
  books: ["Books", "books_3d.png"],
  puzzle: ["Puzzle piece", "puzzle_piece_3d.png"],
  trophy: ["Trophy", "trophy_3d.png"],
  medal: ["Sports medal", "sports_medal_3d.png"],
  sparkles: ["Sparkles", "sparkles_3d.png"],
  seedling: ["Seedling", "seedling_3d.png"],
  heart: ["Red heart", "red_heart_3d.png"],
  "sparkling-heart": ["Sparkling heart", "sparkling_heart_3d.png"],
  sun: ["Sun", "sun_3d.png"],
  sunrise: ["Sunrise", "sunrise_3d.png"],
  bed: ["Bed", "bed_3d.png"],
  gift: ["Wrapped gift", "wrapped_gift_3d.png"],
  party: ["Party popper", "party_popper_3d.png"],
  teddy: ["Teddy bear", "teddy_bear_3d.png"],
  camel: ["Camel", "camel_3d.png"],
  palm: ["Palm tree", "palm_tree_3d.png"],
  rainbow: ["Rainbow", "rainbow_3d.png"],
  rocket: ["Rocket", "rocket_3d.png"],
  question: ["Red question mark", "red_question_mark_3d.png"],
  cards: ["Flower playing cards", "flower_playing_cards_3d.png"],
  plate: ["Fork and knife with plate", "fork_and_knife_with_plate_3d.png"],
  house: ["House with garden", "house_with_garden_3d.png"],
  soap: ["Soap", "soap_3d.png"],
  droplet: ["Droplet", "droplet_3d.png"],
  calendar: ["Spiral calendar", "spiral_calendar_3d.png"],
  check: ["Check mark button", "check_mark_button_3d.png"],
  lock: ["Locked", "locked_3d.png"],
  shield: ["Shield", "shield_3d.png"],
  clipboard: ["Clipboard", "clipboard_3d.png"],
  wastebasket: ["Wastebasket", "wastebasket_3d.png"],
  eyes: ["See-no-evil monkey", "see-no-evil_monkey_3d.png"],
  cat: ["Cat face", "cat_face_3d.png"],
  bird: ["Bird", "bird_3d.png"],
  fish: ["Tropical fish", "tropical_fish_3d.png"],
  flower: ["Blossom", "blossom_3d.png"],
  clover: ["Four leaf clover", "four_leaf_clover_3d.png"],
  dove: ["Dove", "dove_3d.png"],
  hourglass: ["Hourglass not done", "hourglass_not_done_3d.png"],
  smile: ["Smiling face with smiling eyes", "smiling_face_with_smiling_eyes_3d.png"],
  door: ["Door", "door_3d.png"],
  bulb: ["Light bulb", "light_bulb_3d.png"],
  "palms-up": ["Palms up together", "Default/3D/palms_up_together_3d_default.png"],
};

await mkdir(OUT, { recursive: true });
let failed = 0;
for (const [key, [folder, file]] of Object.entries(ART)) {
  const path = file.includes("/") ? `${folder}/${file}` : `${folder}/3D/${file}`;
  const url = `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${key}: ${res.status} ${url}`);
    failed++;
    continue;
  }
  await writeFile(join(OUT, `${key}.png`), Buffer.from(await res.arrayBuffer()));
  console.log(`ok   ${key}`);
}
console.log(failed ? `${failed} failed` : "all downloaded");
process.exit(failed ? 1 : 0);
