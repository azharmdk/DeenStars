// Imports religious source content by reference (never typed by hand). See docs/ISLAMIC_CONTENT_POLICY.md §11.
// - Quran: Tanzil Uthmani text, transliteration and Husary audio (AlQuran Cloud).
// - Translation: Talal Itani, ClearQuran Allah Edition (CC BY-ND 4.0, commercial use allowed, wording unchanged,
//   credit "Translation by Talal Itani, ClearQuran.com"). Read from the plain-text file published at clearquran.com/download.
// - Surah learning: whole-surah recitation by al-Husayni al-Azazi with children.
// - Duas: Hisn al-Muslim (hisnmuslim.com API), Arabic, transliteration, English meaning, human audio.
// Writes JSON packs to functions/src/seed/packs and audio files to web/public/audio.
// Usage: node scripts/import-content.mjs
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { inflateRawSync } from "node:zlib";

const PACKS = "functions/src/seed/packs";
const AUDIO = "web/public/audio";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await sleep(800 * (attempt + 1));
  }
  throw new Error(`fetch failed: ${url}`);
}

async function download(url, path) {
  if (existsSync(path)) return path;
  mkdirSync(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
      return path;
    }
    await sleep(800 * (attempt + 1));
  }
  throw new Error(`download failed: ${url}`);
}

const webPath = (p) => p.replace(/^web\/public/, "");

// ---------- Translation: ClearQuran (Talal Itani), Allah Edition ----------
const ITANI_ZIP = "https://d.clearquran.com/text/clearquran-txt-allah-edition.zip";
const ITANI_FILE = "clearquran-allah-edition.txt";
const ITANI_SOURCE = "Talal Itani, ClearQuran.com (Allah Edition), CC BY-ND 4.0";

/** Minimal ZIP reader: returns one stored or deflated file from an archive buffer. */
function unzipFile(buf, name) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("zip: end record not found");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (entry.split("/").pop() === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`zip: ${name} not found`);
}

async function loadItani() {
  const res = await fetch(ITANI_ZIP);
  if (!res.ok) throw new Error(`fetch failed: ${ITANI_ZIP}`);
  const text = unzipFile(Buffer.from(await res.arrayBuffer()), ITANI_FILE).toString("utf8").replace(/^\uFEFF/, "");
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (m) map.set(`${m[1]}:${m[2]}`, m[3].trim());
  }
  if (map.size !== 6236) throw new Error(`ClearQuran: expected 6236 verses, got ${map.size}`);
  return map;
}
const ITANI = await loadItani();

// Transliteration exceptions. api.alquran.cloud en.transliteration repeats a phrase in 21:87
// ("...fazaanna al lan naqdira alaihi fanaanna al lan naqdira alaihi..."), which is not in the Arabic.
// For listed verses the transliteration is taken word by word from Quran.com instead (aligned to the Arabic words).
const TRANSLIT_FROM_QURAN_COM = new Set(["21:87"]);
async function quranComTransliteration(ref) {
  const data = await json(`https://api.quran.com/api/v4/verses/by_key/${ref}?words=true&word_fields=transliteration`);
  const words = data.verse.words.filter((w) => w.char_type_name === "word").map((w) => w.transliteration?.text).filter(Boolean);
  if (words.length === 0) throw new Error(`no Quran.com transliteration for ${ref}`);
  return words.join(" ");
}

// ---------- Quran ----------
const SURAHS = [1, 103, 108, 112, 113, 114];
const EXTRA_AYAHS = [
  // Bedtime: Ayat al-Kursi
  "2:255",
  // Rabbana and family duas from the Quran
  "2:201", "7:23", "14:41", "17:24", "20:114",
  // Story verses to listen to
  "11:41", "27:19", "21:87", "28:13", "2:127",
];
// Story scene references (stored for the "Read the verses" panel).
const STORY_REFS = {
  nuh: ["71:1", "11:37", "11:40", "11:42", "11:44"],
  sulaiman: ["27:16", "27:17", "27:18", "27:19"],
  yunus: ["37:139", "37:140", "37:142", "21:87", "37:145", "37:146", "37:147", "37:148"],
  musa: ["28:7", "20:39", "28:8", "28:9", "28:11", "28:12", "28:13"],
  ibrahim: ["14:37", "2:125", "2:127", "2:128"],
  adam: ["2:30", "2:31", "2:34", "2:35", "2:36", "2:37", "7:23"],
};

async function ayah(ref, withAudio) {
  const editions = ["quran-uthmani", "en.transliteration", "ar.husary"].join(",");
  const data = (await json(`https://api.alquran.cloud/v1/ayah/${ref}/editions/${editions}`)).data;
  const by = Object.fromEntries(data.map((e) => [e.edition.identifier, e]));
  const u = by["quran-uthmani"];
  const translation = ITANI.get(ref);
  if (!translation) throw new Error(`ClearQuran has no verse ${ref}`);
  const fromQuranCom = TRANSLIT_FROM_QURAN_COM.has(ref);
  const transliteration = fromQuranCom ? await quranComTransliteration(ref) : by["en.transliteration"].text;
  const out = {
    ref,
    surahNumber: u.surah.number,
    surahName: u.surah.englishName,
    surahNameArabic: u.surah.name,
    ayahNumber: u.numberInSurah,
    globalNumber: u.number,
    // Strip a stray byte-order mark that the source puts in front of 1:1. The words are unchanged.
    arabic: u.text.replace(/^\uFEFF/, ""),
    translation,
    transliteration,
    source: {
      type: "quran",
      arabicEdition: "Tanzil Project, Uthmani (quran-uthmani via api.alquran.cloud)",
      translationSource: ITANI_SOURCE,
      transliterationSource: fromQuranCom ? "Quran.com word-by-word transliteration (api.quran.com)" : "api.alquran.cloud en.transliteration",
    },
  };
  if (withAudio) {
    const path = `${AUDIO}/quran/husary/${u.number}.mp3`;
    await download(by["ar.husary"].audio, path);
    out.audio = { path: webPath(path), reciter: "Sheikh Mahmoud Khalil al-Husary (Murattal)", origin: by["ar.husary"].audio };
  }
  return out;
}

const quran = {};
for (const s of SURAHS) {
  const meta = (await json(`https://api.alquran.cloud/v1/surah/${s}`)).data;
  for (let a = 1; a <= meta.numberOfAyahs; a++) {
    const ref = `${s}:${a}`;
    quran[ref] = await ayah(ref, true);
  }
}
for (const ref of EXTRA_AYAHS) quran[ref] = await ayah(ref, true);
for (const refs of Object.values(STORY_REFS)) {
  for (const ref of refs) if (!quran[ref]) quran[ref] = await ayah(ref, false);
}
console.log(`quran: ${Object.keys(quran).length} ayahs`);

const surahs = [];
for (const s of SURAHS) {
  const meta = (await json(`https://api.alquran.cloud/v1/surah/${s}/ar.alhusaynialazazichildren`)).data;
  const fullUrl = meta.audio ?? meta.ayahs?.[0]?.audio;
  let children = null;
  if (fullUrl) {
    const path = `${AUDIO}/quran/azazi-children/${s}.mp3`;
    await download(fullUrl, path);
    children = { path: webPath(path), reciter: "Sheikh al-Husayni al-Azazi with children", origin: fullUrl };
  }
  surahs.push({
    surahId: `surah_${s}`,
    surahNumber: s,
    nameArabic: meta.name,
    nameTransliterated: meta.englishName,
    meaning: meta.englishNameTranslation,
    ayahRefs: Array.from({ length: meta.numberOfAyahs }, (_, i) => `${s}:${i + 1}`),
    childrenRecitation: children,
  });
}
console.log(`surahs: ${surahs.length}`);

// ---------- Hisn al-Muslim ----------
const index = (await json("https://www.hisnmuslim.com/api/en/husn_en.json")).English;
const findChapter = (re) => {
  const c = index.find((x) => re.test(x.TITLE));
  if (!c) throw new Error(`chapter not found: ${re}`);
  return c;
};

// Category, chapter title pattern, which item in the chapter (index), and when to recite.
const HISN = [
  { id: "dua_before_sleeping", category: "sleep", chapter: /before sleeping/i, pickId: 105, when: "When you lie down to sleep" },
  { id: "dua_waking_up", category: "wake", chapter: /wake up/i, pickIndex: 0, when: "When you wake up" },
  { id: "dua_before_eating", category: "eating", chapter: /before eating/i, pickIndex: 0, when: "Before you start eating" },
  { id: "dua_after_eating", category: "eating", chapter: /after (having )?eat/i, pickIndex: 0, when: "When you finish eating" },
  { id: "dua_entering_restroom", category: "bathroom", chapter: /entering the restroom/i, pickIndex: 0, when: "Before you go into the bathroom" },
  { id: "dua_leaving_restroom", category: "bathroom", chapter: /leaving the restroom/i, pickIndex: 0, when: "When you come out of the bathroom" },
  { id: "dua_leaving_home", category: "home", chapter: /leaving the home/i, pickIndex: 0, when: "When you go out of the house" },
  { id: "dua_entering_home", category: "home", chapter: /entering the home/i, pickIndex: 0, when: "When you come home" },
  { id: "dua_getting_dressed", category: "home", chapter: /getting dressed/i, pickIndex: 0, when: "When you put on your clothes" },
];

const duas = [];
for (const d of HISN) {
  const chapter = findChapter(d.chapter);
  const en = await json(`https://www.hisnmuslim.com/api/en/${chapter.ID}.json`);
  const items = Object.values(en)[0];
  const item = d.pickId ? items.find((x) => x.ID === d.pickId) : items[d.pickIndex];
  if (!item) throw new Error(`item not found for ${d.id}`);
  const path = `${AUDIO}/duas/hisn-${item.ID}.mp3`;
  await download(item.AUDIO, path);
  duas.push({
    duaId: d.id,
    category: d.category,
    title: chapter.TITLE.replace(/^\w/, (c) => c.toUpperCase()),
    arabic: item.ARABIC_TEXT.trim(),
    translation: item.TRANSLATED_TEXT.trim(),
    // Romanised text from the same Hisn al-Muslim item (LANGUAGE_ARABIC_TRANSLATED_TEXT). Empty for some items.
    transliteration: item.LANGUAGE_ARABIC_TRANSLATED_TEXT?.trim() || null,
    whenToRecite: d.when,
    repeat: item.REPEAT ?? 1,
    audio: { path: webPath(path), reciter: "Hisn al-Muslim audio (hisnmuslim.com)", origin: item.AUDIO },
    source: {
      type: "hisn",
      work: "Hisn al-Muslim (Fortress of the Muslim), Sa'id ibn Ali ibn Wahf al-Qahtani",
      chapterId: chapter.ID,
      chapterTitle: chapter.TITLE,
      itemId: item.ID,
      hadithReference: null,
      hadithReferenceStatus: "to be added by reviewer from Sunnah.com",
      transliterationSource: "hisnmuslim.com (Hisn al-Muslim English edition)",
    },
  });
}

const QURAN_DUAS = [
  { id: "dua_rabbana_atina", ref: "2:201", title: "Our Lord, give us good", when: "Any time, especially after Salah" },
  { id: "dua_adam_forgiveness", ref: "7:23", title: "Asking Allah to forgive us", when: "When we have made a mistake" },
  { id: "dua_for_parents_forgive", ref: "14:41", title: "For me and my parents", when: "Any time, for our family" },
  { id: "dua_mercy_for_parents", ref: "17:24", title: "Mercy for my parents", when: "Any time, for Mommy and Daddy" },
  { id: "dua_more_knowledge", ref: "20:114", title: "Asking for more knowledge", when: "Before learning or school" },
];
for (const q of QURAN_DUAS) {
  const a = quran[q.ref];
  duas.push({
    duaId: q.id,
    category: "rabbana",
    title: q.title,
    arabic: a.arabic,
    translation: a.translation,
    transliteration: a.transliteration,
    whenToRecite: q.when,
    repeat: 1,
    audio: a.audio,
    source: { ...a.source, surahName: a.surahName, surahNumber: a.surahNumber, ayahStart: a.ayahNumber, ayahEnd: a.ayahNumber },
  });
}
console.log(`duas: ${duas.length}`);

mkdirSync(PACKS, { recursive: true });
writeFileSync(`${PACKS}/quran.json`, JSON.stringify(quran, null, 1));
writeFileSync(`${PACKS}/surahs.json`, JSON.stringify(surahs, null, 1));
writeFileSync(`${PACKS}/duas.json`, JSON.stringify(duas, null, 1));
writeFileSync(
  `${PACKS}/ATTRIBUTION.md`,
  [
    "# Source attribution for imported content",
    "",
    "- Quran text: Tanzil Quran Text, Copyright (C) 2007-2021 Tanzil Project, License: Creative Commons Attribution 3.0. https://tanzil.net. Verbatim, not changed.",
    "- Quran translation: Translation by Talal Itani, ClearQuran.com (Allah Edition). CC BY-ND 4.0 with the author's added permission for commercial use, reformatting and quoting selected verses. Wording unchanged. https://clearquran.com/download/",
    "- Transliteration exception: 21:87 from Quran.com word-by-word transliteration (api.quran.com), because the alquran.cloud text repeats a phrase.",
    "- Transliteration and recitation index: api.alquran.cloud. Recitation by Sheikh Mahmoud Khalil al-Husary and Sheikh al-Husayni al-Azazi with children (cdn.islamic.network).",
    "- Duas: Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani, via hisnmuslim.com (Arabic, transliteration, English meaning, audio).",
    "",
    `Imported: ${new Date().toISOString()}`,
  ].join("\n"),
);
console.log("done");
