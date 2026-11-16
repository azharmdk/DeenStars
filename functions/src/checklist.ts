import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { callableOptions, db, DEV_ALLOW_JUMMAH_ANY_DAY } from "./lib/env";
import { loadOwnedChild, parseInput, requireAuth, requireParentSession } from "./lib/guards";
import { applyStarAward, loadRewardsConfig } from "./lib/rewards";
import { dayKeyFor, isFridayDayKey } from "./lib/time";

const id = z.string().min(1).max(100);

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

  const activitySnap = await db.doc(`activities/${input.activityId}`).get();
  const activity = activitySnap.data();
  // Only approved, published activities for the child's age group can be completed.
  if (!activitySnap.exists || !activity || activity.status !== "approved") {
    throw new HttpsError("not-found", "Activity not found.");
  }
  const ageGroups: string[] = activity.ageEligibility?.ageGroups ?? [];
  if (!ageGroups.includes(child.ageGroup)) {
    throw new HttpsError("failed-precondition", "This activity is not for this age group.");
  }

  const now = new Date();
  const dayKey = dayKeyFor(now, child.timeZone);
  if (activity.frequency === "jummahOnly" && !isFridayDayKey(dayKey) && !DEV_ALLOW_JUMMAH_ANY_DAY) {
    throw new HttpsError("failed-precondition", "This activity is available on Fridays.");
  }

  const rewards = await loadRewardsConfig();
  const ruleKey: string = activity.starRuleKey;
  const rule = rewards.rules[ruleKey];
  if (!rule) {
    throw new HttpsError("failed-precondition", "Reward rule not found.");
  }

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
        configVersion: rewards.configVersion,
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
      dayKey,
      status: "pending",
      // Snapshot so the reward cannot change between request and approval.
      stars: rule.stars,
      ruleKey,
      category: activity.category,
      configVersion: rewards.configVersion,
      requestedAt: FieldValue.serverTimestamp(),
    });
    return { status: "pending", starsAwarded: 0, duplicate: false, dayKey };
  });
});

/**
 * Parent approves or declines a pending activity. Needs a valid parent-mode session.
 * Stars are awarded only on approval, once, in the same transaction.
 */
export const decideApproval = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({
        childId: id,
        approvalId: id,
        decision: z.enum(["approve", "decline"]),
        parentSessionId: z.string().min(1).max(64),
      })
      .strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  await loadOwnedChild(uid, input.childId);

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
    tx.update(approvalRef, {
      status: "approved",
      decidedAt: FieldValue.serverTimestamp(),
      starTxnId: txnId,
    });
    tx.update(completionRef, {
      status: "done",
      resolvedAt: FieldValue.serverTimestamp(),
      starTxnId: txnId,
      starsAwarded: approval.stars,
    });
    return { status: "approved", duplicate: false, starsAwarded: approval.stars as number };
  });
});
