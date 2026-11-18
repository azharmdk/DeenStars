import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { CallableOptions } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

export const REGION = "us-central1";

// Dev defaults are set in functions/.env.deenstars-dev. Production must leave these on.
export const ENFORCE_APP_CHECK = process.env.ENFORCE_APPCHECK !== "false";
export const REQUIRE_EMAIL_VERIFIED = process.env.REQUIRE_EMAIL_VERIFIED !== "false";
export const DEV_SEED_ENABLED = process.env.DEV_SEED_ENABLED === "true";
// QE testing only: lets Jummah activities be completed on any day. Must be false outside dev.
export const DEV_ALLOW_JUMMAH_ANY_DAY = process.env.DEV_ALLOW_JUMMAH_ANY_DAY === "true";
// QE testing only: lets Ramadan and Eid activities be completed on any day. Must be false outside dev.
export const DEV_ALLOW_SEASONAL_ANY_DAY = process.env.DEV_ALLOW_SEASONAL_ANY_DAY === "true";

export const callableOptions: CallableOptions = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  maxInstances: 5,
  cors: true,
};

export const PARENT_SESSION_MINUTES = 5;
export const PARENT_SESSION_MAX_MINUTES = 15;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCKOUT_MINUTES = 15;
