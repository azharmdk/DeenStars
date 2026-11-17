import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { AgeGroup, Difficulty } from "./types";

// Thin wrappers over the Cloud Function contracts. The future SwiftUI app calls the same functions.
async function call<T>(name: string, data: unknown): Promise<T> {
  const res = await httpsCallable(functions, name)(data);
  return res.data as T;
}

export const api = {
  recordConsent: (version: string) => call<{ ok: true }>("recordConsent", { version, confirmedParent: true }),
  setParentPin: (pin: string, currentPin?: string) =>
    call<{ ok: true }>("setParentPin", currentPin ? { pin, currentPin } : { pin }),
  startParentSession: (pin: string) =>
    call<{ sessionId: string; expiresAtMillis: number }>("startParentSession", { pin }),
  createChildProfile: (input: {
    nickname: string;
    birthYear: number;
    birthMonth: number;
    avatarId: string;
    ageGroup: AgeGroup;
    difficulty: Difficulty;
    timeZone: string;
  }) => call<{ childId: string }>("createChildProfile", input),
  updateChildProfile: (input: {
    childId: string;
    parentSessionId: string;
    nickname?: string;
    avatarId?: string;
    ageGroup?: AgeGroup;
    difficulty?: Difficulty;
  }) => call<{ ok: true }>("updateChildProfile", input),
  deleteChildProfile: (childId: string, parentSessionId: string) =>
    call<{ ok: true }>("deleteChildProfile", { childId, parentSessionId }),
  completeActivity: (childId: string, activityId: string) =>
    call<{ status: "done" | "pending"; starsAwarded: number; duplicate: boolean; dayKey: string }>("completeActivity", {
      childId,
      activityId,
      clientRequestId: crypto.randomUUID(),
    }),
  decideApproval: (childId: string, approvalId: string, decision: "approve" | "decline", parentSessionId: string) =>
    call<{ status: string; duplicate: boolean; starsAwarded?: number }>("decideApproval", {
      childId,
      approvalId,
      decision,
      parentSessionId,
    }),
  makeUpActivity: (childId: string, activityId: string, parentSessionId: string) =>
    call<{ status: string; duplicate: boolean; starsAwarded: number; dayKey: string }>("makeUpActivity", {
      childId,
      activityId,
      parentSessionId,
      clientRequestId: crypto.randomUUID(),
    }),
  recordTogether: (childId: string, approvalId: string, together: boolean, parentSessionId: string) =>
    call<{ ok: true }>("recordTogether", { childId, approvalId, together, parentSessionId }),
};

/** Friendly message for errors. Child-facing screens never show raw errors. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const message = (e as { message?: string })?.message ?? "";
  if (code.includes("permission-denied") && message) return message;
  if (code.includes("resource-exhausted") && message) return message;
  if (code.includes("failed-precondition") && message) return message;
  if (code.includes("unavailable") || code.includes("network")) return "You seem to be offline. Please try again.";
  return "Something went wrong. Please try again.";
}
