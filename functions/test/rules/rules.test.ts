import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "deenstars-rules-test",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "children/childA"), { ownerUid: "parentA", nickname: "A" });
    await setDoc(doc(db, "children/childA/starTransactions/t1"), { amount: 2 });
    await setDoc(doc(db, "children/childA/parentApprovals/p1"), { status: "pending" });
    await setDoc(doc(db, "parents/parentA"), { pin: { hash: "x", salt: "y" }, consent: { version: "1" } });
    await setDoc(doc(db, "parents/parentA/parentSessions/s1"), { expiresAt: 1 });
    await setDoc(doc(db, "parents/parentA/notifications/n1"), { title: "t", readAt: null });
    await setDoc(doc(db, "activities/a1"), { status: "approved" });
    await setDoc(doc(db, "appConfiguration/rewards"), { configVersion: 1 });
    await setDoc(doc(db, "appConfiguration/bedtime"), { duaIds: [] });
    await setDoc(doc(db, "appConfiguration/hijri"), { defaultAdjust: 0 });
    await setDoc(doc(db, "duaLibrary/d1"), { title: "t" });
    await setDoc(doc(db, "surahLibrary/s1"), { title: "t" });
    await setDoc(doc(db, "stories/st1"), { title: "t" });
    await setDoc(doc(db, "quizzes/q1"), { title: "t" });
    await setDoc(doc(db, "contentDrafts/d1"), { status: "draft" });
    await setDoc(doc(db, "auditLog/e1"), { action: "x" });
  });
});

describe("children data", () => {
  it("owner can read child and subcollections", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertSucceeds(getDoc(doc(db, "children/childA")));
    await assertSucceeds(getDoc(doc(db, "children/childA/starTransactions/t1")));
    await assertSucceeds(getDoc(doc(db, "children/childA/parentApprovals/p1")));
  });

  it("another parent cannot read the child or its data", async () => {
    const db = env.authenticatedContext("parentB").firestore();
    await assertFails(getDoc(doc(db, "children/childA")));
    await assertFails(getDoc(doc(db, "children/childA/starTransactions/t1")));
  });

  it("signed-out users cannot read", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "children/childA")));
  });

  it("owner can read the day streak and badges but never write them (Fix 3.2)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "children/childA/progress/summary"), { dayStreak: { current: 3 } });
      await setDoc(doc(ctx.firestore(), "children/childA/badges/streak_3"), { badgeId: "streak_3" });
    });
    const db = env.authenticatedContext("parentA").firestore();
    await assertSucceeds(getDoc(doc(db, "children/childA/progress/summary")));
    await assertSucceeds(getDoc(doc(db, "children/childA/badges/streak_3")));
    await assertFails(setDoc(doc(db, "children/childA/progress/summary"), { dayStreak: { current: 99 } }));
    await assertFails(setDoc(doc(db, "children/childA/badges/kindness_week"), { badgeId: "kindness_week" }));
    await assertFails(deleteDoc(doc(db, "children/childA/badges/streak_3")));
    const other = env.authenticatedContext("parentB").firestore();
    await assertFails(getDoc(doc(other, "children/childA/badges/streak_3")));
  });

  it("owner cannot write stars, approvals or the child doc", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertFails(setDoc(doc(db, "children/childA/starTransactions/t2"), { amount: 999 }));
    await assertFails(updateDoc(doc(db, "children/childA/parentApprovals/p1"), { status: "approved" }));
    await assertFails(updateDoc(doc(db, "children/childA"), { "totals.stars": 9999 }));
    await assertFails(setDoc(doc(db, "children/childB"), { ownerUid: "parentA" }));
    await assertFails(deleteDoc(doc(db, "children/childA")));
  });
});

describe("parent data", () => {
  it("parent can read own doc but not write the PIN or consent", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertSucceeds(getDoc(doc(db, "parents/parentA")));
    await assertFails(updateDoc(doc(db, "parents/parentA"), { "pin.hash": "evil" }));
    await assertFails(setDoc(doc(db, "parents/parentA"), { consent: { version: "fake" } }));
  });

  it("another parent cannot read it", async () => {
    const db = env.authenticatedContext("parentB").firestore();
    await assertFails(getDoc(doc(db, "parents/parentA")));
  });

  it("parent sessions are not readable or writable", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertFails(getDoc(doc(db, "parents/parentA/parentSessions/s1")));
    await assertFails(setDoc(doc(db, "parents/parentA/parentSessions/s2"), { expiresAt: 9e12 }));
  });

  it("notifications: only readAt may change", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertSucceeds(updateDoc(doc(db, "parents/parentA/notifications/n1"), { readAt: 5 }));
    await assertFails(updateDoc(doc(db, "parents/parentA/notifications/n1"), { title: "changed" }));
  });
});

describe("content and admin collections", () => {
  it("signed-in users read published content, never write it", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertSucceeds(getDoc(doc(db, "activities/a1")));
    await assertSucceeds(getDoc(doc(db, "appConfiguration/rewards")));
    await assertFails(setDoc(doc(db, "activities/a2"), { status: "approved" }));
    await assertFails(updateDoc(doc(db, "appConfiguration/rewards"), { configVersion: 2 }));
  });

  it("signed-out users cannot read activities, quizzes or other config", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "activities/a1")));
    await assertFails(getDoc(doc(db, "quizzes/q1")));
    await assertFails(getDoc(doc(db, "appConfiguration/rewards")));
    await assertFails(getDoc(doc(db, "appConfiguration/hijri")));
  });

  it("signed-out users (website guests) can read the learning library and bedtime config", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "duaLibrary/d1")));
    await assertSucceeds(getDoc(doc(db, "surahLibrary/s1")));
    await assertSucceeds(getDoc(doc(db, "stories/st1")));
    await assertSucceeds(getDoc(doc(db, "appConfiguration/bedtime")));
  });

  it("nobody can write the learning library, signed in or not", async () => {
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext("parentA").firestore()]) {
      await assertFails(setDoc(doc(db, "duaLibrary/d2"), { title: "x" }));
      await assertFails(updateDoc(doc(db, "surahLibrary/s1"), { title: "x" }));
      await assertFails(deleteDoc(doc(db, "stories/st1")));
      await assertFails(setDoc(doc(db, "appConfiguration/bedtime"), { duaIds: ["x"] }));
    }
  });

  it("sponsors: signed-in parents read, guests cannot, nobody writes (Enhancement 5)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sponsors/acme"), { brandName: "Acme" });
    });
    await assertSucceeds(getDoc(doc(env.authenticatedContext("parentA").firestore(), "sponsors/acme")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "sponsors/acme")));
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext("parentA").firestore()]) {
      await assertFails(setDoc(doc(db, "sponsors/evil"), { brandName: "Evil", linkUrl: "https://evil.example" }));
      await assertFails(updateDoc(doc(db, "sponsors/acme"), { linkUrl: "https://evil.example" }));
      await assertFails(deleteDoc(doc(db, "sponsors/acme")));
    }
  });

  it("signed-out users still cannot read children or parents", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "children/childA")));
    await assertFails(getDoc(doc(db, "children/childA/parentApprovals/p1")));
    await assertFails(getDoc(doc(db, "parents/parentA")));
  });

  it("drafts, audit log and unknown collections are denied", async () => {
    const db = env.authenticatedContext("parentA").firestore();
    await assertFails(getDoc(doc(db, "contentDrafts/d1")));
    await assertFails(getDoc(doc(db, "auditLog/e1")));
    await assertFails(setDoc(doc(db, "somethingElse/x"), { a: 1 }));
  });
});
