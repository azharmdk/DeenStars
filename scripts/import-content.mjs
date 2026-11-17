// Imports religious source content by reference (never typed by hand). See docs/ISLAMIC_CONTENT_POLICY.md §11.
// - Quran: Tanzil Uthmani text, Pickthall translation (public domain), transliteration, Husary audio (AlQuran Cloud).
// - Surah learning: whole-surah recitation by al-Husayni al-Azazi with children.
// - Duas: Hisn al-Muslim (hisnmuslim.com API), Arabic, English meaning, human audio.
// Writes JSON packs to functions/src/seed/packs and audio files to web/public/audio.
// Usage: node scripts/import-content.mjs
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

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
  const editions = ["quran-uthmani", "en.pickthall", "en.transliteration", "ar.husary"].join(",");
  const data = (await json(`https://api.alquran.cloud/v1/ayah/${ref}/editions/${editions}`)).data;
  const by = Object.fromEntries(data.map((e) => [e.edition.identifier, e]));
  const u = by["quran-uthmani"];
  const out = {
    ref,
    surahNumber: u.surah.number,
    surahName: u.surah.englishName,
    surahNameArabic: u.surah.name,
    ayahNumber: u.numberInSurah,
    globalNumber: u.number,
    arabic: u.text,
    translation: by["en.pickthall"].text,
    transliteration: by["en.transliteration"].text,
    source: {
      type: "quran",
      arabicEdition: "Tanzil Project, Uthmani (quran-uthmani via api.alquran.cloud)",
      translationSource: "Marmaduke Pickthall, The Meaning of the Glorious Koran (1930), public domain",
      transliterationSource: "api.alquran.cloud en.transliteration",
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
    "- Translation: Marmaduke Pickthall, The Meaning of the Glorious Koran (1930), public domain.",
    "- Transliteration and recitation index: api.alquran.cloud. Recitation by Sheikh Mahmoud Khalil al-Husary and Sheikh al-Husayni al-Azazi with children (cdn.islamic.network).",
    "- Duas: Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani, via hisnmuslim.com.",
    "",
    `Imported: ${new Date().toISOString()}`,
  ].join("\n"),
);
console.log("done");
