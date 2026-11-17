import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { callableOptions, db } from "./lib/env";
import { loadOwnedChild, parseInput, requireAuth, requireParentSession } from "./lib/guards";
import { applyStarAward, loadRewardsConfig } from "./lib/rewards";
import { countryForTimeZone } from "./lib/hijri";
import { dayKeyFor } from "./lib/time";

/**
 * Dua and Surah learning progress (docs/FIREBASE_SCHEMA.md §2.11).
 * - The child may move between notStarted, learning and practising.
 * - "learned" means a grown-up confirmed it: needs a parent session, awards stars once ever.
 */
export const updateLearningProgress = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({
        childId: z.string().min(1).max(64),
        kind: z.enum(["dua", "surah"]),
        itemId: z.string().min(1).max(64),
        state: z.enum(["notStarted", "learning", "practising", "learned"]),
        parentSessionId: z.string().min(1).max(64).optional(),
      })
      .strict(),
    request.data,
  );
  if (input.state === "learned") {
    if (!input.parentSessionId) throw new HttpsError("permission-denied", "A grown-up needs to confirm this.");
    await requireParentSession(uid, input.parentSessionId);
  }
  const child = await loadOwnedChild(uid, input.childId);

  const library = input.kind === "dua" ? "duaLibrary" : "surahLibrary";
  const item = await db.doc(`${library}/${input.itemId}`).get();
  if (!item.exists) throw new HttpsError("not-found", "Not found.");

  const childRef = db.doc(`children/${input.childId}`);
  const progressRef = childRef.collection(input.kind === "dua" ? "duaProgress" : "surahProgress").doc(input.itemId);
  const ruleKey = input.kind === "dua" ? "dua_learning" : "surah_learning";
  const rewards = input.state === "learned" ? await loadRewardsConfig() : null;
  const dayKey = dayKeyFor(new Date(), child.timeZone);

  return db.runTransaction(async (tx) => {
    const current = (await tx.get(progressRef)).data();
    const wasLearned = current?.state === "learned" || !!current?.learnedAt;
    if (current?.state === "learned" && input.state !== "learned" && !input.parentSessionId) {
      // A child cannot undo a grown-up's confirmation.
      return { state: "learned", starsAwarded: 0 };
    }
    let starsAwarded = 0;
    const update: Record<string, unknown> = {
      itemId: input.itemId,
      kind: input.kind,
      state: input.state,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.state === "practising") update.practiceCount = FieldValue.increment(1);
    if (input.state === "learned" && !wasLearned) {
      update.learnedAt = FieldValue.serverTimestamp();
      update.learnedDayKey = dayKey;
      const rule = rewards!.rules[ruleKey];
      if (rule) {
        applyStarAward(tx, childRef, {
          txnId: `${ruleKey}_${input.itemId}`, // once ever per item
          amount: rule.stars,
          sourceType: input.kind,
          sourceId: input.itemId,
          ruleKey,
          category: input.kind === "dua" ? "dua" : "quran",
          dayKey,
          configVersion: rewards!.configVersion,
          leaderboardEligible: true,
        });
        starsAwarded = rule.stars;
      }
      if (input.kind === "dua") tx.update(childRef, { "totals.duasLearned": FieldValue.increment(1) });
    }
    tx.set(progressRef, update, { merge: true });
    return { state: input.state, starsAwarded };
  });
});

/** Parent settings that the client may change. Region and Hijri adjustment for Ramadan and Eid dates. */
export const updateParentSettings = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z
      .object({
        parentSessionId: z.string().min(1).max(64),
        hijriCountry: z.union([z.string().regex(/^[A-Z]{2}$/), z.literal("auto")]).optional(),
        hijriAdjust: z.number().int().min(-1).max(1).optional(),
      })
      .strict(),
    request.data,
  );
  await requireParentSession(uid, input.parentSessionId);
  const update: Record<string, unknown> = {};
  if (input.hijriCountry !== undefined) update["settings.hijri.country"] = input.hijriCountry === "auto" ? null : input.hijriCountry;
  if (input.hijriAdjust !== undefined) update["settings.hijri.adjust"] = input.hijriAdjust;
  if (Object.keys(update).length) await db.doc(`parents/${uid}`).update(update);
  return { ok: true };
});

/** Region used for a child's Hijri dates: parent override, else derived from the child's time zone. */
export async function hijriSettingsForChild(ownerUid: string, timeZone: string) {
  const [parentSnap, configSnap] = await Promise.all([db.doc(`parents/${ownerUid}`).get(), db.doc("appConfiguration/hijri").get()]);
  const settings = parentSnap.data()?.settings?.hijri ?? {};
  const country = (settings.country as string | null) || countryForTimeZone(timeZone);
  return { country, parentAdjust: (settings.adjust as number | undefined) ?? 0, config: configSnap.data() as never };
}
