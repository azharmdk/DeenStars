/**
 * Phase 2 and 3 backend behaviour against the emulators: learning progress and stars,
 * parent-only confirmation, seasonal activity gating with the dev override, parent settings.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp as initClient, FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp as initAdmin, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildDevActivities, devRewardsConfig } from "../../src/seed/devContent";
import { buildDuaLibrary, buildStories, buildSurahLibrary } from "../../src/seed/learningContent";

const PROJECT = "deenstars-dev";
if (getApps().length === 0) initAdmin({ projectId: PROJECT });
const admin = getFirestore();
const apps: FirebaseApp[] = [];
const rid = () => `req-${Math.random().toString(36).slice(2)}-${Date.now()}`;

async function newParent(tag: string) {
  const app = initClient({ apiKey: "fake", projectId: PROJECT, appId: "1:1:web:1" }, `p23_${tag}_${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await createUserWithEmailAndPassword(auth, `${tag}_${Date.now()}@example.test`, "test-password-123");
  const fns = getFunctions(app, "us-central1");
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  const call = async (name: string, data: unknown) => (await httpsCallable(fns, name)(data)).data as any;
  await call("recordConsent", { version: "proto-1", confirmedParent: true });
  await call("setParentPin", { pin: "2468" });
  const { childId } = await call("createChildProfile", {
    nickname: "Kid", birthYear: 2020, birthMonth: 3, avatarId: "star", ageGroup: "5", difficulty: "standard", timeZone: "Asia/Kolkata",
  });
  const { sessionId } = await call("startParentSession", { pin: "2468" });
  return { call, childId: childId as string, sessionId: sessionId as string };
}

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
    return "none";
  } catch (e: any) {
    return String(e.code);
  }
}

beforeAll(async () => {
  const batch = admin.batch();
  batch.set(admin.doc("appConfiguration/rewards"), devRewardsConfig);
  for (const a of buildDevActivities()) batch.set(admin.doc(`activities/${a.id}`), a.data);
  for (const d of buildDuaLibrary()) batch.set(admin.doc(`duaLibrary/${d.id}`), d.data);
  for (const s of buildSurahLibrary()) batch.set(admin.doc(`surahLibrary/${s.id}`), s.data);
  await batch.commit();
});

afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)));
});

describe("content packs", () => {
  it("every story scene cites verses that were imported, and no story is approved yet", () => {
    for (const s of buildStories()) {
      expect(s.data.reviewStatus).toBe("pendingReview");
      for (const sc of s.data.scenes) for (const r of sc.refs) expect(s.data.refVerses[r]?.arabic).toBeTruthy();
      expect(s.data.verse.arabic).toBeTruthy();
    }
  });

  it("every dua has Arabic, a meaning, a source and audio", () => {
    for (const d of buildDuaLibrary()) {
      expect(d.data.arabic.length).toBeGreaterThan(3);
      expect(d.data.translation.length).toBeGreaterThan(3);
      expect(d.data.source).toBeTruthy();
      expect(d.data.audio?.path).toMatch(/^\/audio\//);
    }
  });
});

describe("learning progress", () => {
  it("child can mark learning; only a grown-up can confirm learned; stars once", async () => {
    const p = await newParent("learn");
    await p.call("updateLearningProgress", { childId: p.childId, kind: "dua", itemId: "dua_before_sleeping", state: "learning" });
    expect(await codeOf(p.call("updateLearningProgress", { childId: p.childId, kind: "dua", itemId: "dua_before_sleeping", state: "learned" }))).toBe(
      "functions/permission-denied",
    );
    const first = await p.call("updateLearningProgress", { childId: p.childId, kind: "dua", itemId: "dua_before_sleeping", state: "learned", parentSessionId: p.sessionId });
    const again = await p.call("updateLearningProgress", { childId: p.childId, kind: "dua", itemId: "dua_before_sleeping", state: "learned", parentSessionId: p.sessionId });
    expect(first.starsAwarded).toBe(5);
    expect(again.starsAwarded).toBe(0);
    const ledger = await admin.collection(`children/${p.childId}/starTransactions`).get();
    expect(ledger.size).toBe(1);
    const child = (await admin.doc(`children/${p.childId}`).get()).data()!;
    expect(child.totals.duasLearned).toBe(1);
  });

  it("a child cannot undo a confirmed item", async () => {
    const p = await newParent("undo");
    await p.call("updateLearningProgress", { childId: p.childId, kind: "surah", itemId: "surah_112", state: "learned", parentSessionId: p.sessionId });
    const res = await p.call("updateLearningProgress", { childId: p.childId, kind: "surah", itemId: "surah_112", state: "learning" });
    expect(res.state).toBe("learned");
  });

  it("rejects unknown items", async () => {
    const p = await newParent("unknown");
    expect(await codeOf(p.call("updateLearningProgress", { childId: p.childId, kind: "dua", itemId: "dua_made_up", state: "learning" }))).toBe("functions/not-found");
  });
});

describe("seasonal activities and settings", () => {
  it("Ramadan activities can be completed in dev (override on)", async () => {
    const p = await newParent("ramadan");
    const res = await p.call("completeActivity", { childId: p.childId, activityId: "act_ramadan_join_iftar", clientRequestId: rid() });
    expect(res.status).toBe("done");
  });

  it("parent settings need a session and accept only valid values", async () => {
    const p = await newParent("settings");
    expect(await codeOf(p.call("updateParentSettings", { parentSessionId: "fake", hijriAdjust: 1 }))).toBe("functions/permission-denied");
    expect(await codeOf(p.call("updateParentSettings", { parentSessionId: p.sessionId, hijriAdjust: 3 }))).toBe("functions/invalid-argument");
    await p.call("updateParentSettings", { parentSessionId: p.sessionId, hijriCountry: "IN", hijriAdjust: -1 });
  });
});
