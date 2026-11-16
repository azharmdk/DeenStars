import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  callableOptions,
  db,
  PIN_LOCKOUT_MINUTES,
  PIN_MAX_ATTEMPTS,
  PARENT_SESSION_MINUTES,
} from "./lib/env";
import { parseInput, requireAuth, sessionMaxMs } from "./lib/guards";
import { hashPin, PinRecord, verifyPin } from "./lib/pin";

const pinSchema = z.string().regex(/^\d{4,6}$/);

/**
 * Records privacy-notice consent. The consent method is a prototype self-declaration.
 * The verifiable parental consent method is an open legal decision (D-2).
 */
export const recordConsent = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ version: z.string().min(1).max(40), confirmedParent: z.literal(true) }).strict(),
    request.data,
  );
  const ref = db.doc(`parents/${uid}`);
  await ref.set(
    {
      email: request.auth?.token.email ?? null,
      createdAt: FieldValue.serverTimestamp(),
      consent: {
        version: input.version,
        acceptedAt: FieldValue.serverTimestamp(),
        method: "self-declaration-prototype",
      },
    },
    { merge: true },
  );
  return { ok: true };
});

export const setParentPin = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(
    z.object({ pin: pinSchema, currentPin: pinSchema.optional() }).strict(),
    request.data,
  );
  const ref = db.doc(`parents/${uid}`);
  const snap = await ref.get();
  const existing = snap.data()?.pin as (PinRecord & { lockedUntil?: Timestamp }) | undefined;

  if (existing?.hash) {
    // Changing a PIN needs the current PIN or a recent sign-in (forgot-PIN path).
    const authTime = (request.auth?.token.auth_time as number | undefined) ?? 0;
    const recentSignIn = Date.now() / 1000 - authTime < 300;
    let allowed = recentSignIn && input.currentPin === undefined;
    if (input.currentPin !== undefined) {
      allowed = await verifyPin(input.currentPin, existing);
    }
    if (!allowed) {
      throw new HttpsError("permission-denied", "Could not change PIN.");
    }
  }

  const record = await hashPin(input.pin);
  await ref.set({ pin: { ...record, attempts: 0, lockedUntil: null } }, { merge: true });
  return { ok: true };
});

/** Verifies the PIN on the server and opens a short parent-mode session. */
export const startParentSession = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const input = parseInput(z.object({ pin: pinSchema }).strict(), request.data);
  const ref = db.doc(`parents/${uid}`);
  const snap = await ref.get();
  const pin = snap.data()?.pin as
    | (PinRecord & { attempts?: number; lockedUntil?: Timestamp | null })
    | undefined;
  if (!pin?.hash) {
    throw new HttpsError("failed-precondition", "No PIN set.");
  }

  const now = Date.now();
  if (pin.lockedUntil && pin.lockedUntil.toMillis() > now) {
    throw new HttpsError("resource-exhausted", "Too many tries. Please wait a little while.");
  }

  const ok = await verifyPin(input.pin, pin);
  if (!ok) {
    const attempts = (pin.attempts ?? 0) + 1;
    if (attempts >= PIN_MAX_ATTEMPTS) {
      await ref.update({
        "pin.attempts": 0,
        "pin.lockedUntil": Timestamp.fromMillis(now + PIN_LOCKOUT_MINUTES * 60_000),
      });
    } else {
      await ref.update({ "pin.attempts": attempts });
    }
    throw new HttpsError("permission-denied", "That PIN is not right.");
  }

  await ref.update({ "pin.attempts": 0, "pin.lockedUntil": null });
  const sessionId = randomUUID();
  const expiresAt = Timestamp.fromMillis(now + PARENT_SESSION_MINUTES * 60_000);
  await db.doc(`parents/${uid}/parentSessions/${sessionId}`).set({
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    maxExpiresAt: Timestamp.fromMillis(now + sessionMaxMs),
  });
  return { sessionId, expiresAtMillis: expiresAt.toMillis() };
});
