import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { z, ZodTypeAny } from "zod";
import { db, PARENT_SESSION_MAX_MINUTES, PARENT_SESSION_MINUTES, REQUIRE_EMAIL_VERIFIED } from "./env";

/** Authorisation checklist step 1 (docs/AUTH_SECURITY.md section 7). */
export function requireAuth(request: CallableRequest<unknown>): string {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Please sign in.");
  }
  if (REQUIRE_EMAIL_VERIFIED && auth.token.email_verified !== true && auth.token.firebase?.sign_in_provider !== "apple.com") {
    throw new HttpsError("failed-precondition", "Please verify your email first.");
  }
  return auth.uid;
}

/** Strict input validation. Unknown fields are rejected. */
export function parseInput<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpsError("invalid-argument", "Invalid request.");
  }
  return result.data;
}

export interface ChildDoc extends DocumentData {
  ownerUid: string;
  nickname: string;
  ageGroup: "3-4" | "5" | "6";
  difficulty: "gentle" | "standard" | "challenge";
  timeZone: string;
}

/** Ownership check. Returns not-found for both missing and foreign children to avoid probing. */
export async function loadOwnedChild(uid: string, childId: string): Promise<ChildDoc> {
  const snap = await db.doc(`children/${childId}`).get();
  const data = snap.data();
  if (!snap.exists || !data || data.ownerUid !== uid || data.deletion) {
    throw new HttpsError("not-found", "Child profile not found.");
  }
  return data as ChildDoc;
}

/**
 * Parent-mode session check. The session id is created by startParentSession after a PIN check.
 * Each use slides the expiry forward, up to the session maximum.
 */
export async function requireParentSession(uid: string, sessionId: string): Promise<void> {
  const ref = db.doc(`parents/${uid}/parentSessions/${sessionId}`);
  const snap = await ref.get();
  const data = snap.data();
  const now = Date.now();
  if (
    !snap.exists ||
    !data ||
    (data.expiresAt as Timestamp).toMillis() <= now ||
    (data.maxExpiresAt as Timestamp).toMillis() <= now
  ) {
    throw new HttpsError("permission-denied", "Parent session expired. Please enter your PIN.");
  }
  const maxMs = (data.maxExpiresAt as Timestamp).toMillis();
  const next = Math.min(now + PARENT_SESSION_MINUTES * 60_000, maxMs);
  await ref.update({ expiresAt: Timestamp.fromMillis(next) });
}

export const sessionMaxMs = PARENT_SESSION_MAX_MINUTES * 60_000;
