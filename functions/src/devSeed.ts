import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callableOptions, db, DEV_SEED_ENABLED } from "./lib/env";
import { buildDevActivities, devHijriConfig, devRamadanConfig, devRewardsConfig, devThemes } from "./seed/devContent";
import { buildBedtimeConfig, buildDuaLibrary, buildStories, buildSurahLibrary } from "./seed/learningContent";

/**
 * DEV ONLY. Loads sample activities and the imported learning content into the dev project.
 * Disabled unless DEV_SEED_ENABLED=true. Turn it on, seed once, then turn it off and redeploy.
 * It writes the same fixed documents each time, so repeat calls are harmless.
 * The admin portal and review workflow replace this before staging.
 */
export const devSeedContent = onCall({ ...callableOptions, enforceAppCheck: false, memory: "512MiB" }, async (request) => {
  if (!DEV_SEED_ENABLED) {
    throw new HttpsError("not-found", "Not available.");
  }
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in.");
  }

  const writes: [string, object][] = [
    ["appConfiguration/rewards", devRewardsConfig],
    ["appConfiguration/hijri", devHijriConfig],
    ["appConfiguration/ramadan", devRamadanConfig],
    ["appConfiguration/themes", { themes: devThemes, rotation: "isoWeek" }],
    ["appConfiguration/bedtime", buildBedtimeConfig()],
  ];
  for (const a of buildDevActivities()) writes.push([`activities/${a.id}`, a.data]);
  for (const d of buildDuaLibrary()) writes.push([`duaLibrary/${d.id}`, d.data]);
  for (const s of buildSurahLibrary()) writes.push([`surahLibrary/${s.id}`, s.data]);
  for (const s of buildStories()) writes.push([`stories/${s.id}`, s.data]);

  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [path, data] of writes.slice(i, i + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
  return { documents: writes.length, rewardsConfigVersion: devRewardsConfig.configVersion };
});
