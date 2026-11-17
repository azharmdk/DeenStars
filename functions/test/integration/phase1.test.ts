/**
 * Phase 1 backend behaviour against the emulators: expiry, make-up, "together" answer,
 * streak trigger and weekly report counts.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp as initClient, FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp as initAdmin, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { buildDevActivities, devRewardsConfig } from "../../src/seed/devContent";

const PROJECT = "deenstars-dev";
if (getApps().length === 0) initAdmin({ projectId: PROJECT });
const admin = getFirestore();
const apps: FirebaseApp[] = [];

async function newParent(tag: string) {
  const app = initClient({ apiKey: "fake", projectId: PROJECT, appId: "1:1:web:1" }, `p1_${tag}_${Date.now()}`);
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
    nickname: "Kid",
    birthYear: 2020,
    birthMonth: 3,
    avatarId: "star",
    ageGroup: "5",
    difficulty: "standard",
    timeZone: "America/New_York",
  });
  const { sessionId } = await call("startParentSession", { pin: "2468" });
  return { call, childId: childId as string, sessionId: sessionId as string };
}

async function waitFor<T>(fn: () => Promise<T | undefined>, ms = 20000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v !== undefined) return v;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("timed out");
}

const rid = () => `req-${Math.random().toString(36).slice(2)}-${Date.now()}`;

beforeAll(async () => {
  const batch = admin.batch();
  batch.set(admin.doc("appConfiguration/rewards"), devRewardsConfig);
  for (const a of buildDevActivities()) batch.set(admin.doc(`activities/${a.id}`), a.data);
  await batch.commit();
});

afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)));
});

describe("approval expiry", () => {
  it("stores an expiry at the end of the next local day", async () => {
    const p = await newParent("exp1");
    const res = await p.call("completeActivity", { childId: p.childId, activityId: "act_deed_help_parents", clientRequestId: rid() });
    const approval = (await admin.doc(`children/${p.childId}/parentApprovals/act_deed_help_parents_${res.dayKey}`).get()).data()!;
    const expires = (approval.expiresAt as Timestamp).toDate();
    const hoursAhead = (expires.getTime() - Date.now()) / 3_600_000;
    expect(hoursAhead).toBeGreaterThan(24);
    expect(hoursAhead).toBeLessThanOrEqual(48);
  });

  it("approving an expired item awards nothing", async () => {
    const p = await newParent("exp2");
    const res = await p.call("completeActivity", { childId: p.childId, activityId: "act_deed_toys_away", clientRequestId: rid() });
    const approvalId = `act_deed_toys_away_${res.dayKey}`;
    await admin.doc(`children/${p.childId}/parentApprovals/${approvalId}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    const out = await p.call("decideApproval", { childId: p.childId, approvalId, decision: "approve", parentSessionId: p.sessionId });
    expect(out.status).toBe("expired");
    expect((await admin.collection(`children/${p.childId}/starTransactions`).get()).size).toBe(0);
  });

  it("the expiry job clears overdue items and leaves fresh ones", async () => {
    const p = await newParent("exp3");
    const a = await p.call("completeActivity", { childId: p.childId, activityId: "act_deed_make_smile", clientRequestId: rid() });
    await p.call("completeActivity", { childId: p.childId, activityId: "act_manners_share_toys", clientRequestId: rid() });
    const oldId = `act_deed_make_smile_${a.dayKey}`;
    await admin.doc(`children/${p.childId}/parentApprovals/${oldId}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });

    const { expireDueApprovals } = await import("../../src/checklist");
    expect(await expireDueApprovals()).toBeGreaterThanOrEqual(1);

    const old = (await admin.doc(`children/${p.childId}/parentApprovals/${oldId}`).get()).data()!;
    const fresh = (await admin.doc(`children/${p.childId}/parentApprovals/act_manners_share_toys_${a.dayKey}`).get()).data()!;
    expect(old.status).toBe("expired");
    expect(fresh.status).toBe("pending");
    expect((await admin.collection(`children/${p.childId}/starTransactions`).get()).size).toBe(0);
  });
});

describe("make-up and streaks", () => {
  it("parent can mark yesterday done once, and the streak counts both days", async () => {
    const p = await newParent("makeup");
    const first = await p.call("makeUpActivity", { childId: p.childId, activityId: "act_habit_salam", parentSessionId: p.sessionId, clientRequestId: rid() });
    const again = await p.call("makeUpActivity", { childId: p.childId, activityId: "act_habit_salam", parentSessionId: p.sessionId, clientRequestId: rid() });
    expect(first.duplicate).toBe(false);
    expect(again.duplicate).toBe(true);
    const ledger = (await admin.collection(`children/${p.childId}/starTransactions`).get()).docs.map((d) => d.data());
    expect(ledger).toHaveLength(1);
    expect(ledger[0].dayKey).toBe(first.dayKey);

    await p.call("completeActivity", { childId: p.childId, activityId: "act_habit_salam", clientRequestId: rid() });
    const streak = await waitFor(async () => {
      const s = (await admin.doc(`children/${p.childId}/streaks/act_habit_salam`).get()).data();
      return s && s.current === 2 ? s : undefined;
    });
    expect(streak.current).toBe(2);
  });

  it("make-up needs a parent session", async () => {
    const p = await newParent("makeup2");
    let code = "none";
    try {
      await p.call("makeUpActivity", { childId: p.childId, activityId: "act_habit_salam", parentSessionId: "fake", clientRequestId: rid() });
    } catch (e: any) {
      code = e.code;
    }
    expect(code).toBe("functions/permission-denied");
  });
});

describe("together answer and weekly counts", () => {
  it("stores the optional together answer only after approval", async () => {
    const p = await newParent("together");
    const res = await p.call("completeActivity", { childId: p.childId, activityId: "act_deed_set_table", clientRequestId: rid() });
    const approvalId = `act_deed_set_table_${res.dayKey}`;
    let code = "none";
    try {
      await p.call("recordTogether", { childId: p.childId, approvalId, together: true, parentSessionId: p.sessionId });
    } catch (e: any) {
      code = e.code;
    }
    expect(code).toBe("functions/failed-precondition");
    await p.call("decideApproval", { childId: p.childId, approvalId, decision: "approve", parentSessionId: p.sessionId });
    await p.call("recordTogether", { childId: p.childId, approvalId, together: true, parentSessionId: p.sessionId });
    const a = (await admin.doc(`children/${p.childId}/parentApprovals/${approvalId}`).get()).data()!;
    expect(a.togetherAnswer).toBe(true);
  });

  it("rollups count items per category for the weekly report", async () => {
    const p = await newParent("counts");
    await p.call("completeActivity", { childId: p.childId, activityId: "act_manners_kind_words", clientRequestId: rid() });
    await p.call("completeActivity", { childId: p.childId, activityId: "act_manners_please_thanks", clientRequestId: rid() });
    const week = (await admin.collection(`children/${p.childId}/rollups`).get()).docs.find((d) => d.id.startsWith("w_"))!.data();
    expect(week.countByCategory.manners).toBe(2);
    expect(week.stars).toBe(6);
  });
});
