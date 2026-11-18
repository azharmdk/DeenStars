import { DocumentReference, FieldValue, Transaction } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./env";
import { monthKeyFromDayKey, weekKeyFromDayKey } from "./time";

export interface RewardRule {
  stars: number;
  perSourcePerDay?: number;
  dailyCap?: number;
}

export interface RewardsConfig {
  configVersion: number;
  rules: Record<string, RewardRule>;
}

/** Star values come from appConfiguration/rewards. They are never hardcoded in code or the app. */
export async function loadRewardsConfig(): Promise<RewardsConfig> {
  const snap = await db.doc("appConfiguration/rewards").get();
  const data = snap.data();
  if (!snap.exists || !data || typeof data.configVersion !== "number" || typeof data.rules !== "object") {
    throw new HttpsError("failed-precondition", "Rewards configuration is not available.");
  }
  return data as RewardsConfig;
}

export interface StarAward {
  txnId: string; // deterministic idempotency key
  amount: number;
  sourceType: string;
  sourceId: string;
  ruleKey: string;
  category?: string;
  dayKey: string;
  configVersion: number;
  leaderboardEligible: boolean;
}

/**
 * Appends one ledger entry and updates rollups. Must run inside a transaction.
 * tx.create fails if the deterministic id already exists, which is the last guard against double awards.
 * Amounts are always positive. Stars are never deducted.
 */
export function applyStarAward(tx: Transaction, childRef: DocumentReference, award: StarAward): void {
  if (!Number.isInteger(award.amount) || award.amount <= 0) {
    throw new HttpsError("internal", "Invalid star amount.");
  }
  const weekKey = weekKeyFromDayKey(award.dayKey);
  const monthKey = monthKeyFromDayKey(award.dayKey);

  tx.create(childRef.collection("starTransactions").doc(award.txnId), {
    amount: award.amount,
    sourceType: award.sourceType,
    sourceId: award.sourceId,
    // Category of the deed, for category badges such as Kindness Week (Fix 3.2).
    category: award.category ?? null,
    ruleKey: award.ruleKey,
    dayKey: award.dayKey,
    weekKey,
    monthKey,
    configVersion: award.configVersion,
    leaderboardEligible: award.leaderboardEligible,
    createdAt: FieldValue.serverTimestamp(),
  });

  const inc = FieldValue.increment(award.amount);
  const one = FieldValue.increment(1);
  // byCategory holds star sums, countByCategory holds how many items were done (for the weekly report).
  const byCategory = award.category
    ? { byCategory: { [award.category]: inc }, countByCategory: { [award.category]: one } }
    : {};
  for (const key of ["total", `d_${award.dayKey}`, `w_${weekKey}`, `m_${monthKey}`]) {
    tx.set(
      childRef.collection("rollups").doc(key),
      { stars: inc, count: one, ...byCategory, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  tx.update(childRef, { "totals.stars": inc, updatedAt: FieldValue.serverTimestamp() });
}
