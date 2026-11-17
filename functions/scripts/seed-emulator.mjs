// Seeds the local emulators for visual QA: content via the admin SDK, plus a test family via callables.
// Run while `firebase emulators:start --only auth,firestore,functions` is running.
import { createRequire } from "node:module";
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
const require = createRequire(import.meta.url);
const dev = require("../lib/seed/devContent.js");
const learn = require("../lib/seed/learningContent.js");

initAdmin({ projectId: "deenstars-dev" });
const db = getFirestore();
const writes = [
  ["appConfiguration/rewards", dev.devRewardsConfig],
  ["appConfiguration/hijri", dev.devHijriConfig],
  ["appConfiguration/ramadan", dev.devRamadanConfig],
  ["appConfiguration/themes", { themes: dev.devThemes, rotation: "isoWeek" }],
  ["appConfiguration/bedtime", learn.buildBedtimeConfig()],
  ...dev.buildDevActivities().map((a) => [`activities/${a.id}`, a.data]),
  ...learn.buildDuaLibrary().map((d) => [`duaLibrary/${d.id}`, d.data]),
  ...learn.buildSurahLibrary().map((s) => [`surahLibrary/${s.id}`, s.data]),
  ...learn.buildStories().map((s) => [`stories/${s.id}`, s.data]),
];
const batch = db.batch();
for (const [p, d] of writes) batch.set(db.doc(p), d);
await batch.commit();
console.log(`content: ${writes.length} docs`);

const app = initializeApp({ apiKey: "fake", projectId: "deenstars-dev", appId: "1:1:web:1" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
const fns = getFunctions(app, "us-central1");
connectFunctionsEmulator(fns, "127.0.0.1", 5001);
const call = async (n, d) => (await httpsCallable(fns, n)(d)).data;

await createUserWithEmailAndPassword(auth, "qa@example.test", "qa-password-123");
await call("recordConsent", { version: "proto-2025-1", confirmedParent: true });
await call("setParentPin", { pin: "2468" });
const little = await call("createChildProfile", { nickname: "Aya", birthYear: 2021, birthMonth: 4, avatarId: "flower", ageGroup: "5", difficulty: "standard", timeZone: "Asia/Kolkata" });
await call("createChildProfile", { nickname: "Yusuf", birthYear: 2020, birthMonth: 1, avatarId: "rocket", ageGroup: "6", difficulty: "standard", timeZone: "Asia/Kolkata" });

// Some activity so screens have data.
await call("completeActivity", { childId: little.childId, activityId: "act_habit_salam", clientRequestId: "qa-req-0001" });
await call("completeActivity", { childId: little.childId, activityId: "act_deed_set_table", clientRequestId: "qa-req-0002" });
await call("updateLearningProgress", { childId: little.childId, kind: "dua", itemId: "dua_before_sleeping", state: "practising" });
const { sessionId } = await call("startParentSession", { pin: "2468" });
await call("updateLearningProgress", { childId: little.childId, kind: "dua", itemId: "dua_leaving_restroom", state: "learned", parentSessionId: sessionId });
console.log("family ready: qa@example.test / qa-password-123, PIN 2468");
process.exit(0);
