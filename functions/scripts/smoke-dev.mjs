// Smoke test against the deployed dev project. Optionally seeds placeholder content first.
// Usage: node scripts/smoke-dev.mjs [--seed]
// Creates a throwaway account, runs the core flow, then deletes the test child and the account.
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD5GNPv1FFOWrvLE_n3GT8r31w-Bx1L13s",
  authDomain: "deenstars-dev.firebaseapp.com",
  projectId: "deenstars-dev",
  appId: "1:1029452540657:web:3ad37542bb61899e641750",
});
const auth = getAuth(app);
const fns = getFunctions(app, "us-central1");
const db = getFirestore(app);
const call = async (name, data) => (await httpsCallable(fns, name)(data)).data;

const email = `smoke-${Date.now()}@example.com`;
const cred = await createUserWithEmailAndPassword(auth, email, `Smoke-${crypto.randomUUID()}`);
console.log("test account created");
let childId;
try {
  if (process.argv.includes("--seed")) {
    console.log("seed:", await call("devSeedContent", {}));
  }
  await call("recordConsent", { version: "smoke", confirmedParent: true });
  await call("setParentPin", { pin: "4826" });
  ({ childId } = await call("createChildProfile", {
    nickname: "Smoke",
    birthYear: 2020,
    birthMonth: 1,
    avatarId: "star",
    ageGroup: "5",
    difficulty: "standard",
    timeZone: "America/New_York",
  }));
  console.log("child created");

  const self = await call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: crypto.randomUUID() });
  const again = await call("completeActivity", { childId, activityId: "act_habit_salam", clientRequestId: crypto.randomUUID() });
  console.log("self-report:", self.status, self.starsAwarded, "| repeat duplicate:", again.duplicate);

  const pending = await call("completeActivity", { childId, activityId: "act_deed_help_parents", clientRequestId: crypto.randomUUID() });
  const { sessionId } = await call("startParentSession", { pin: "4826" });
  const decided = await call("decideApproval", {
    childId,
    approvalId: `act_deed_help_parents_${pending.dayKey}`,
    decision: "approve",
    parentSessionId: sessionId,
  });
  console.log("approval:", pending.status, "->", decided.status, decided.starsAwarded);

  const jummah = await call("completeActivity", { childId, activityId: "act_jummah_ready", clientRequestId: crypto.randomUUID() });
  console.log("jummah (dev override):", jummah.status);

  const child = (await getDoc(doc(db, "children", childId))).data();
  console.log("total stars on child:", child.totals.stars);

  await call("deleteChildProfile", { childId, parentSessionId: sessionId });
  childId = undefined;
  console.log("child deleted");
} finally {
  await deleteUser(cred.user);
  console.log("test account deleted");
}
process.exit(0);
