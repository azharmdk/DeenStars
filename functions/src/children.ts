import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { callableOptions, db } from "./lib/env";
import { loadOwnedChild, parseInput, requireAuth, requireParentSession } from "./lib/guards";
import { isValidTimeZone } from "./lib/time";

const ageGroup = z.enum(["3-4", "5", "6"]);
const difficulty = z.enum(["gentle", "standard", "challenge"]);
const nickname = z.string().trim().min(1).max(20);
const avatarId = z.string().regex(/^[a-z0-9_-]{1,40}$/);

export const createChildProfile = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({
        nickname,
        birthYear: z.number().int().min(2010).max(new Date().getUTCFullYear()),
        birthMonth: z.number().int().min(1).max(12),
        avatarId,
        ageGroup,
        difficulty,
        timeZone: z.string().min(1).max(64),
      })
      .strict(),
    request.data,
  );
  if (!isValidTimeZone(input.timeZone)) {
    throw new HttpsError("invalid-argument", "Invalid request.");
  }

  const parentRef = db.doc(`parents/${uid}`);
  const parent = (await parentRef.get()).data();
  if (!parent?.consent?.version) {
    throw new HttpsError("failed-precondition", "Please complete the privacy consent first.");
  }
  if (!parent.pin?.hash) {
    throw new HttpsError("failed-precondition", "Please set a parent PIN first.");
  }

  const childRef = db.collection("children").doc();
  await db.runTransaction(async (tx) => {
    tx.create(childRef, {
      ownerUid: uid,
      guardianUids: [uid],
      nickname: input.nickname,
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      avatarId: input.avatarId,
      ageGroup: input.ageGroup,
      difficulty: input.difficulty,
      timeZone: input.timeZone,
      leaderboard: { optIn: false },
      customChecklist: { hiddenActivityIds: [], parentActivityIds: [] },
      totals: { stars: 0, milestones: 0, duasLearned: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(parentRef, { childCount: FieldValue.increment(1) });
  });
  return { childId: childRef.id };
});

export const updateChildProfile = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({
        childId: z.string().min(1).max(64),
        parentSessionId: z.string().min(1).max(64),
        nickname: nickname.optional(),
        avatarId: avatarId.optional(),
        ageGroup: ageGroup.optional(),
        difficulty: difficulty.optional(),
        timeZone: z.string().min(1).max(64).optional(),
      })
      .strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  await loadOwnedChild(uid, input.childId);
  if (input.timeZone && !isValidTimeZone(input.timeZone)) {
    throw new HttpsError("invalid-argument", "Invalid request.");
  }

  const { childId, parentSessionId: _s, ...changes } = input;
  const update = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  await db.doc(`children/${childId}`).update({ ...update, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const deleteChildProfile = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ childId: z.string().min(1).max(64), parentSessionId: z.string().min(1).max(64) }).strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  await loadOwnedChild(uid, input.childId);

  const childRef = db.doc(`children/${input.childId}`);
  // Recursive delete removes all subcollections (ledger, completions, approvals, progress).
  await db.recursiveDelete(childRef);
  await db.doc(`parents/${uid}`).update({ childCount: FieldValue.increment(-1) });
  return { ok: true };
});
