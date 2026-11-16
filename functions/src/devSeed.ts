import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callableOptions, db, DEV_ADMIN_UIDS, DEV_SEED_ENABLED } from "./lib/env";
import { buildDevActivities, devRewardsConfig } from "./seed/devContent";

/**
 * DEV ONLY. Loads placeholder content into the dev project.
 * Disabled unless DEV_SEED_ENABLED=true, and only for uids in DEV_ADMIN_UIDS.
 * Remove before staging. The admin portal and review workflow replace it.
 */
export const devSeedContent = onCall({ ...callableOptions, enforceAppCheck: false }, async (request) => {
  if (!DEV_SEED_ENABLED) {
    throw new HttpsError("not-found", "Not available.");
  }
  const uid = request.auth?.uid;
  if (!uid || !DEV_ADMIN_UIDS.includes(uid)) {
    throw new HttpsError("permission-denied", "Not allowed.");
  }

  const batch = db.batch();
  batch.set(db.doc("appConfiguration/rewards"), devRewardsConfig);
  const activities = buildDevActivities();
  for (const a of activities) {
    batch.set(db.doc(`activities/${a.id}`), a.data);
  }
  await batch.commit();
  return { activities: activities.length, rewardsConfigVersion: devRewardsConfig.configVersion };
});
