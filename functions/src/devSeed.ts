import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callableOptions, db, DEV_SEED_ENABLED } from "./lib/env";
import { buildDevActivities, devRewardsConfig } from "./seed/devContent";

/**
 * DEV ONLY. Loads the fixed placeholder content into the dev project.
 * Disabled unless DEV_SEED_ENABLED=true. Turn it on, seed once, then turn it off and redeploy.
 * It only writes the same fixed placeholder documents, so repeat calls are harmless.
 * The admin portal and review workflow replace this before staging.
 */
export const devSeedContent = onCall({ ...callableOptions, enforceAppCheck: false }, async (request) => {
  if (!DEV_SEED_ENABLED) {
    throw new HttpsError("not-found", "Not available.");
  }
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in.");
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
