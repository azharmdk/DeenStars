/**
 * Runs against the Auth, Firestore and Functions emulators (npm run test:integration).
 * Covers the reward-integrity cases in docs/TESTING.md section 3.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp as initClient, FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable, Functions } from "firebase/functions";
import { initializeApp as initAdmin, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildDevActivities, devRewardsConfig } from "../../src/seed/devContent";

const PROJECT = "deenstars-dev";
if (getApps().length === 0) initAdmin({ projectId: PROJECT });
const admin = getFirestore();

interface Parent {
  app: FirebaseApp;
  fns: Functions;
  call: <T = any>(name: string, data: unknown) => Promise<T>;
}

async function newParent(tag: string): Promise<Parent> {
  const app = initClient({ apiKey: "fake", projectId: PROJECT, appId: "1:1:web:1" }, `p_${tag}_${Date.now()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await createUserWithEmailAndPassword(auth, `${tag}_${Date.now()}@example.test`, "test-password-123");
  const fns = getFunctions(app, "us-central1");
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  const call = async (name: string, data: unknown) => (await httpsCallable(fns, name)(data)).data as any;
  return { app, fns, call };
}

async function setupParentWithChild(p: Parent, ageGroup = "5") {
  await p.call("recordConsent", { version: "proto-1", confirmedParent: true });
  await p.call("setParentPin", { pin: "2468" });
  const { childId } = await p.call<{ childId: string }>("createChildProfile", {
    nickname: "Test kid",
    birthYear: 2020,
    birthMonth: 3,
    avatarId: "star",
    ageGroup,
    difficulty: "standard",
    timeZone: "America/New_York",
  });
  return childId;
}

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "none";
  } catch (e: any) {
    return String(e.code);
  }
}

const parents: Parent[] = [];

beforeAll(async () => {
  const batch = admin.batch();
  batch.set(admin.doc("appConfiguration/rewards"), devRewardsConfig);
  for (const a of buildDevActivities()) batch.set(admin.doc(`activities/${a.id}`), a.data);
  await batch.commit();
});

afterAll(async () => {
  await Promise.all(parents.map((p) => deleteApp(p.app)));
});

async function ledger(childId: string) {
  return (await admin.collection(`children/${childId}/starTransactions`).get()).docs.map((d) => d.data());
}

describe("self-reported activity", () => {
  it("awards configured stars once, even with 20 parallel requests", async () => {
    const p = await newParent("self");
    parents.push(p);
    const childId = await setupParentWithChild(p);

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        p.call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: `req-${i}-xxxx` }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.filter((r) => r.value.duplicate === false).length).toBe(1);

    const txns = await ledger(childId);
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(devRewardsConfig.rules.habit_simple.stars);
    const child = (await admin.doc(`children/${childId}`).get()).data()!;
    expect(child.totals.stars).toBe(2);
    const total = (await admin.doc(`children/${childId}/rollups/total`).get()).data()!;
    expect(total.stars).toBe(2);
  });

  it("rejects unknown fields such as a client-supplied star amount", async () => {
    const p = await newParent("tamper");
    parents.push(p);
    const childId = await setupParentWithChild(p);
    const code = await errorCode(
      p.call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: "req-tamper", stars: 999 }),
    );
    expect(code).toBe("functions/invalid-argument");
    expect(await ledger(childId)).toHaveLength(0);
  });

  it("rejects activities outside the child's age group", async () => {
    const p = await newParent("age");
    parents.push(p);
    const childId = await setupParentWithChild(p, "3-4");
    const code = await errorCode(
      p.call("completeActivity", { childId, activityId: "act_quran_practise", clientRequestId: "req-age-1" }),
    );
    expect(code).toBe("functions/failed-precondition");
  });
});

describe("parent-approved activity", () => {
  it("creates a pending approval with no stars, then awards once on approval", async () => {
    const p = await newParent("approve");
    parents.push(p);
    const childId = await setupParentWithChild(p);

    const res = await p.call("completeActivity", {
      childId,
      activityId: "act_deed_help_parents",
      clientRequestId: "req-help-1",
    });
    expect(res.status).toBe("pending");
    expect(await ledger(childId)).toHaveLength(0);

    const approvalId = `act_deed_help_parents_${res.dayKey}`;

    // Without a valid parent session the approval is refused.
    const noSession = await errorCode(
      p.call("decideApproval", { childId, approvalId, decision: "approve", parentSessionId: "made-up" }),
    );
    expect(noSession).toBe("functions/permission-denied");

    const { sessionId } = await p.call("startParentSession", { pin: "2468" });
    const decisions = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        p.call("decideApproval", { childId, approvalId, decision: "approve", parentSessionId: sessionId }),
      ),
    );
    const fulfilled = decisions.filter((d) => d.status === "fulfilled") as PromiseFulfilledResult<any>[];
    expect(fulfilled.filter((d) => d.value.duplicate === false).length).toBe(1);

    const txns = await ledger(childId);
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(devRewardsConfig.rules.good_deed.stars);
  });

  it("decline gives no stars and lets the child try again", async () => {
    const p = await newParent("decline");
    parents.push(p);
    const childId = await setupParentWithChild(p);
    const { sessionId } = await p.call("startParentSession", { pin: "2468" });

    const first = await p.call("completeActivity", { childId, activityId: "act_deed_toys_away", clientRequestId: "req-toys-1" });
    const approvalId = `act_deed_toys_away_${first.dayKey}`;
    const declined = await p.call("decideApproval", { childId, approvalId, decision: "decline", parentSessionId: sessionId });
    expect(declined.status).toBe("declined");
    expect(await ledger(childId)).toHaveLength(0);

    const again = await p.call("completeActivity", { childId, activityId: "act_deed_toys_away", clientRequestId: "req-toys-2" });
    expect(again.status).toBe("pending");
  });
});

describe("ownership and PIN", () => {
  it("a parent cannot complete or delete another parent's child", async () => {
    const owner = await newParent("owner");
    const other = await newParent("other");
    parents.push(owner, other);
    const childId = await setupParentWithChild(owner);
    await other.call("recordConsent", { version: "proto-1", confirmedParent: true });
    await other.call("setParentPin", { pin: "1357" });
    const { sessionId } = await other.call("startParentSession", { pin: "1357" });

    expect(
      await errorCode(other.call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: "req-x-123" })),
    ).toBe("functions/not-found");
    expect(await errorCode(other.call("deleteChildProfile", { childId, parentSessionId: sessionId }))).toBe(
      "functions/not-found",
    );
  });

  it("locks the PIN after 5 wrong attempts", async () => {
    const p = await newParent("lock");
    parents.push(p);
    await setupParentWithChild(p);
    for (let i = 0; i < 5; i++) {
      expect(await errorCode(p.call("startParentSession", { pin: "0000" }))).toBe("functions/permission-denied");
    }
    // Even the right PIN is refused during lockout.
    expect(await errorCode(p.call("startParentSession", { pin: "2468" }))).toBe("functions/resource-exhausted");
  });

  it("child creation requires consent and a PIN", async () => {
    const p = await newParent("noconsent");
    parents.push(p);
    const code = await errorCode(
      p.call("createChildProfile", {
        nickname: "X",
        birthYear: 2020,
        birthMonth: 1,
        avatarId: "star",
        ageGroup: "5",
        difficulty: "standard",
        timeZone: "UTC",
      }),
    );
    expect(code).toBe("functions/failed-precondition");
  });

  it("deleting a child removes all its data", async () => {
    const p = await newParent("delete");
    parents.push(p);
    const childId = await setupParentWithChild(p);
    await p.call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: "req-del-1" });
    await p.call("completeActivity", { childId, activityId: "act_deed_help_parents", clientRequestId: "req-del-2" });
    const { sessionId } = await p.call("startParentSession", { pin: "2468" });
    await p.call("deleteChildProfile", { childId, parentSessionId: sessionId });

    expect((await admin.doc(`children/${childId}`).get()).exists).toBe(false);
    for (const sub of ["starTransactions", "rollups", "checklistCompletions", "parentApprovals"]) {
      expect((await admin.collection(`children/${childId}/${sub}`).get()).size).toBe(0);
    }
  });
});
