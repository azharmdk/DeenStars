/**
 * Day streak and badges through the real Cloud Functions path (Fix 3.2).
 * Runs against the Auth, Firestore and Functions emulators (npm run test:integration).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp as initClient, FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp as initAdmin, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { buildDevActivities, devBadgesConfig, devRewardsConfig } from "../../src/seed/devContent";
import { addDays, dayKeyFor } from "../../src/lib/time";

const PROJECT = "deenstars-dev";
if (getApps().length === 0) initAdmin({ projectId: PROJECT });
const admin = getFirestore();
const apps: FirebaseApp[] = [];
const TZ = "America/New_York";

async function newFamily(tag: string) {
  const app = initClient({ apiKey: "fake", projectId: PROJECT, appId: "1:1:web:1" }, `prog_${tag}_${Date.now()}`);
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
    nickname: "Test kid", birthYear: 2020, birthMonth: 3, avatarId: "star", ageGroup: "5", difficulty: "standard", timeZone: TZ,
  });
  return { call, childId: childId as string };
}

/** Earlier days, written straight to the ledger the way old entries look (no category field). */
async function pastGoodDeeds(childId: string, n: number) {
  const today = dayKeyFor(new Date(), TZ);
  const batch = admin.batch();
  for (let k = 1; k <= n; k++) {
    const dayKey = addDays(today, -k);
    batch.set(admin.doc(`children/${childId}/starTransactions/past_${dayKey}`), {
      amount: 2, sourceType: "activity", sourceId: "act_deed_help_parents", ruleKey: "good_deed", dayKey, createdAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

async function waitFor<T>(fn: () => Promise<T | undefined>, ms = 20000): Promise<T | undefined> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 500));
  }
  return undefined;
}
const summary = (childId: string) => admin.doc(`children/${childId}/progress/summary`).get().then((s) => s.data());
const badges = (childId: string) => admin.collection(`children/${childId}/badges`).get().then((s) => s.docs.map((d) => d.id).sort());

beforeAll(async () => {
  const batch = admin.batch();
  batch.set(admin.doc("appConfiguration/rewards"), devRewardsConfig);
  batch.set(admin.doc("appConfiguration/badges"), devBadgesConfig);
  for (const a of buildDevActivities()) batch.set(admin.doc(`activities/${a.id}`), a.data);
  await batch.commit();
});
afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)));
});

describe("day streak and badges", () => {
  it("new ledger entries carry the deed's category", async () => {
    const f = await newFamily("cat");
    await f.call("completeActivity", { childId: f.childId, activityId: "act_habit_salam", clientRequestId: "req-cat-1" });
    const txns = (await admin.collection(`children/${f.childId}/starTransactions`).get()).docs.map((d) => d.data());
    expect(txns[0].category).toBe("dailyHabit");
  }, 60_000);

  it("an approved good deed after six good-deed days gives a 7-day streak and Kindness Week", async () => {
    const f = await newFamily("kind");
    await pastGoodDeeds(f.childId, 6); // old-style entries without category: server must look it up
    const res = await f.call("completeActivity", { childId: f.childId, activityId: "act_deed_help_parents", clientRequestId: "req-kind-1" });
    expect(res.status).toBe("pending");
    const { sessionId } = await f.call("startParentSession", { pin: "2468" });
    await f.call("decideApproval", { childId: f.childId, approvalId: `act_deed_help_parents_${res.dayKey}`, decision: "approve", parentSessionId: sessionId });
    const got = await waitFor(async () => {
      const b = await badges(f.childId);
      return b.includes("kindness_week") ? b : undefined;
    });
    expect(got).toEqual(expect.arrayContaining(["kindness_week", "streak_3", "streak_7"]));
    expect(got).not.toContain("stars_50"); // 14 stars only
    expect((await summary(f.childId))?.dayStreak.current).toBe(7);
  }, 90_000);

  it("a pending (not yet approved) good deed does not count (negative)", async () => {
    const f = await newFamily("pend");
    await pastGoodDeeds(f.childId, 2);
    await f.call("completeActivity", { childId: f.childId, activityId: "act_deed_help_parents", clientRequestId: "req-pend-1" });
    // Past entries were written by the admin SDK, which also fires the trigger. Wait for it to settle.
    const s = await waitFor(async () => (await summary(f.childId))?.dayStreak);
    expect(s?.current).toBe(2); // yesterday and the day before; today is only pending
    expect(await badges(f.childId)).not.toContain("streak_3");
  }, 90_000);
});
