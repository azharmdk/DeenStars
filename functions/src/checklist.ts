import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { DocumentData, FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { callableOptions, db, DEV_ALLOW_JUMMAH_ANY_DAY, DEV_ALLOW_SEASONAL_ANY_DAY, REGION } from "./lib/env";
import { hijriForDayKey, seasonFor, totalAdjust } from "./lib/hijri";
import { hijriSettingsForChild } from "./learning";
import { ChildDoc, loadOwnedChild, parseInput, requireAuth, requireParentSession } from "./lib/guards";
import { applyStarAward, loadRewardsConfig, RewardRule } from "./lib/rewards";
import { recomputeStreak } from "./lib/streaks";
import { addDays, approvalExpiresAt, dayKeyFor, isFridayDayKey } from "./lib/time";

const id = z.string().min(1).max(100);
const sessionId = z.string().min(1).max(64);

/** Shared checks: activity is approved content, fits the child's age, and is available that day. */
async function loadEligibleActivity(child: ChildDoc, activityId: string, dayKey: string) {
  const snap = await db.doc(`activities/${activityId}`).get();
  const activity = snap.data();
  if (!snap.exists || !activity || activity.status !== "approved") {
    throw new HttpsError("not-found", "Activity not found.");
  }
  const ageGroups: string[] = activity.ageEligibility?.ageGroups ?? [];
  if (!ageGroups.includes(child.ageGroup)) {
    throw new HttpsError("failed-precondition", "This activity is not for this age group.");
  }
  if (activity.frequency === "jummahOnly" && !isFridayDayKey(dayKey) && !DEV_ALLOW_JUMMAH_ANY_DAY) {
    throw new HttpsError("failed-precondition", "This activity is available on Fridays.");
  }
  if ((activity.frequency === "ramadanOnly" || activity.frequency === "eidOnly") && !DEV_ALLOW_SEASONAL_ANY_DAY) {
    const { country, parentAdjust, config } = await hijriSettingsForChild(child.ownerUid, child.timeZone);
    const season = seasonFor(hijriForDayKey(dayKey, totalAdjust(config, country, parentAdjust)));
    const ok = activity.frequency === "ramadanOnly" ? season.kind === "ramadan" : season.kind === "eidFitr" || season.kind === "eidAdha";
    if (!ok) throw new HttpsError("failed-precondition", "This activity is for a special time of year.");
  }
  const rewards = await loadRewardsConfig();
  const ruleKey: string = activity.starRuleKey;
  const rule: RewardRule | undefined = rewards.rules[ruleKey];
  if (!rule) {
    throw new HttpsError("failed-precondition", "Reward rule not found.");
  }
  return { activity, ruleKey, rule, configVersion: rewards.configVersion };
}

function isExpired(approval: DocumentData, timeZone: string, now = Date.now()): boolean {
  const expiresAt = approval.expiresAt
    ? (approval.expiresAt as Timestamp).toMillis()
    : approvalExpiresAt(approval.dayKey, timeZone).getTime(); // approvals created before expiry existed
  return expiresAt <= now;
}

/**
 * Child marks an activity complete.
 * - verification "self": stars are awarded in the same transaction.
 * - verification "parent": a pending approval is created. Stars come only after approval.
 * Idempotent: one completion per child, activity and day (deterministic document id).
 */
export const completeActivity = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ childId: id, activityId: id, clientRequestId: z.string().min(8).max(100) }).strict(),
    request.data,
  );
  const child = await loadOwnedChild(uid, input.childId);
  const dayKey = dayKeyFor(new Date(), child.timeZone);
  const { activity, ruleKey, rule, configVersion } = await loadEligibleActivity(child, input.activityId, dayKey);

  const childRef = db.doc(`children/${input.childId}`);
  const docId = `${input.activityId}_${dayKey}`;
  const completionRef = childRef.collection("checklistCompletions").doc(docId);
  const approvalRef = childRef.collection("parentApprovals").doc(docId);
  const selfVerified = activity.verification === "self";

  return db.runTransaction(async (tx) => {
    const existing = (await tx.get(completionRef)).data();
    if (existing && existing.status !== "declined") {
      return {
        status: existing.status as string,
        starsAwarded: (existing.starsAwarded as number | undefined) ?? 0,
        duplicate: true,
        dayKey,
      };
    }

    const base = {
      activityId: input.activityId,
      activityTitleSnapshot: activity.title,
      dayKey,
      verification: activity.verification,
      clientRequestId: input.clientRequestId,
      requestedAt: FieldValue.serverTimestamp(),
    };

    if (selfVerified) {
      const txnId = `${ruleKey}_${input.activityId}_${dayKey}`;
      applyStarAward(tx, childRef, {
        txnId,
        amount: rule.stars,
        sourceType: "activity",
        sourceId: input.activityId,
        ruleKey,
        category: activity.category,
        dayKey,
        configVersion,
        leaderboardEligible: true,
      });
      tx.set(completionRef, {
        ...base,
        status: "done",
        resolvedAt: FieldValue.serverTimestamp(),
        starTxnId: txnId,
        starsAwarded: rule.stars,
      });
      return { status: "done", starsAwarded: rule.stars, duplicate: false, dayKey };
    }

    tx.set(completionRef, { ...base, status: "pending", starsAwarded: 0 });
    tx.set(approvalRef, {
      activityId: input.activityId,
      activityTitleSnapshot: activity.title,
      category: activity.category,
      dayKey,
      status: "pending",
      // Snapshot so the reward cannot change between request and approval.
      stars: rule.stars,
      ruleKey,
      configVersion,
      requestedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(approvalExpiresAt(dayKey, child.timeZone)),
    });
    return { status: "pending", starsAwarded: 0, duplicate: false, dayKey };
  });
});

/**
 * Parent approves or declines a pending activity. Needs a valid parent-mode session.
 * Stars are awarded only on approval, once, in the same transaction. Expired items award nothing.
 */
export const decideApproval = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({ childId: id, approvalId: id, decision: z.enum(["approve", "decline"]), parentSessionId: sessionId })
      .strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  const child = await loadOwnedChild(uid, input.childId);

  const childRef = db.doc(`children/${input.childId}`);
  const approvalRef = childRef.collection("parentApprovals").doc(input.approvalId);
  const completionRef = childRef.collection("checklistCompletions").doc(input.approvalId);

  return db.runTransaction(async (tx) => {
    const approval = (await tx.get(approvalRef)).data();
    if (!approval) {
      throw new HttpsError("not-found", "Approval not found.");
    }
    if (approval.status !== "pending") {
      // Already decided (double tap, second device). Return the stored outcome.
      return { status: approval.status as string, duplicate: true };
    }
    if (isExpired(approval, child.timeZone)) {
      tx.update(approvalRef, { status: "expired", decidedAt: FieldValue.serverTimestamp() });
      tx.update(completionRef, { status: "expired", resolvedAt: FieldValue.serverTimestamp() });
      return { status: "expired", duplicate: false };
    }

    if (input.decision === "decline") {
      tx.update(approvalRef, { status: "declined", decidedAt: FieldValue.serverTimestamp() });
      tx.update(completionRef, { status: "declined", resolvedAt: FieldValue.serverTimestamp() });
      return { status: "declined", duplicate: false };
    }

    const txnId = `${approval.ruleKey}_${approval.activityId}_${approval.dayKey}`;
    applyStarAward(tx, childRef, {
      txnId,
      amount: approval.stars,
      sourceType: "activity",
      sourceId: approval.activityId,
      ruleKey: approval.ruleKey,
      category: approval.category,
      dayKey: approval.dayKey,
      configVersion: approval.configVersion,
      leaderboardEligible: true,
    });
    tx.update(approvalRef, { status: "approved", decidedAt: FieldValue.serverTimestamp(), starTxnId: txnId });
    tx.update(completionRef, {
      status: "done",
      resolvedAt: FieldValue.serverTimestamp(),
      starTxnId: txnId,
      starsAwarded: approval.stars,
    });
    return { status: "approved", duplicate: false, starsAwarded: approval.stars as number };
  });
});

/**
 * Parent marks one of yesterday's activities as done ("make-up"). Only yesterday, only with a
 * parent session. Awards the stars for yesterday's day once. Keeps a streak going.
 */
export const makeUpActivity = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ childId: id, activityId: id, parentSessionId: sessionId, clientRequestId: z.string().min(8).max(100) }).strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  const child = await loadOwnedChild(uid, input.childId);
  const yesterday = addDays(dayKeyFor(new Date(), child.timeZone), -1);
  const { activity, ruleKey, rule, configVersion } = await loadEligibleActivity(child, input.activityId, yesterday);

  const childRef = db.doc(`children/${input.childId}`);
  const docId = `${input.activityId}_${yesterday}`;
  const completionRef = childRef.collection("checklistCompletions").doc(docId);
  const approvalRef = childRef.collection("parentApprovals").doc(docId);

  return db.runTransaction(async (tx) => {
    const existing = (await tx.get(completionRef)).data();
    const approval = (await tx.get(approvalRef)).data();
    if (existing?.status === "done") {
      return { status: "done", duplicate: true, starsAwarded: (existing.starsAwarded as number) ?? 0, dayKey: yesterday };
    }
    const stars = (approval?.status === "pending" ? approval.stars : rule.stars) as number;
    const usedRule = (approval?.status === "pending" ? approval.ruleKey : ruleKey) as string;
    const txnId = `${usedRule}_${input.activityId}_${yesterday}`;
    applyStarAward(tx, childRef, {
      txnId,
      amount: stars,
      sourceType: "activity",
      sourceId: input.activityId,
      ruleKey: usedRule,
      category: activity.category,
      dayKey: yesterday,
      configVersion: (approval?.configVersion as number | undefined) ?? configVersion,
      leaderboardEligible: true,
    });
    tx.set(completionRef, {
      activityId: input.activityId,
      activityTitleSnapshot: activity.title,
      dayKey: yesterday,
      verification: activity.verification,
      clientRequestId: input.clientRequestId,
      requestedAt: existing?.requestedAt ?? FieldValue.serverTimestamp(),
      status: "done",
      madeUpByParent: true,
      resolvedAt: FieldValue.serverTimestamp(),
      starTxnId: txnId,
      starsAwarded: stars,
    });
    if (approval) {
      tx.update(approvalRef, { status: "approved", decidedAt: FieldValue.serverTimestamp(), starTxnId: txnId, madeUp: true });
    }
    return { status: "done", duplicate: false, starsAwarded: stars, dayKey: yesterday };
  });
});

/** Optional "Did you do this together?" answer after an approval. Never required. */
export const recordTogether = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ childId: id, approvalId: id, together: z.boolean(), parentSessionId: sessionId }).strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  await loadOwnedChild(uid, input.childId);
  const ref = db.doc(`children/${input.childId}/parentApprovals/${input.approvalId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.status !== "approved") {
    throw new HttpsError("failed-precondition", "Nothing to record.");
  }
  await ref.update({ togetherAnswer: input.together, togetherAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/** Streaks are recomputed whenever a completion changes (done, approved, made up, declined). */
export const onCompletionWritten = onDocumentWritten(
  { document: "children/{childId}/checklistCompletions/{completionId}", region: REGION, maxInstances: 5 },
  async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    const activityId = (after?.activityId ?? before?.activityId) as string | undefined;
    if (!activityId || after?.status === before?.status) return;
    await recomputeStreak(event.params.childId, activityId);
  },
);

/** Core of the expiry job, exported for tests. Marks overdue pending approvals as expired. */
export async function expireDueApprovals(now = new Date()): Promise<number> {
  const due = await db
    .collectionGroup("parentApprovals")
    .where("status", "==", "pending")
    .where("expiresAt", "<=", Timestamp.fromDate(now))
    .limit(400)
    .get();
  if (due.empty) return 0;
  const batch = db.batch();
  for (const doc of due.docs) {
    batch.update(doc.ref, { status: "expired", decidedAt: FieldValue.serverTimestamp() });
    const completionRef = doc.ref.parent.parent!.collection("checklistCompletions").doc(doc.id);
    batch.set(completionRef, { status: "expired", resolvedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  return due.size;
}

export const expireApprovals = onSchedule({ schedule: "every 60 minutes", region: REGION, maxInstances: 1 }, async () => {
  await expireDueApprovals();
});
