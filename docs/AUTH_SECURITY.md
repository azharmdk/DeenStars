# DeenStars – Authentication and Security

Status: DRAFT for approval. Version 0.1.

## 1. Identity model

| Actor | Identity | Notes |
|---|---|---|
| Parent | Firebase Auth user (Sign in with Apple, or email and password) | Owns all data |
| Child | None. A `children` document owned by the parent | No email, no password, no device identity |
| Admin staff | Firebase Auth user in a separate **admin Firebase Auth tenant or project** with custom claims | Preferred: a separate Identity Platform tenant so that parent accounts can never gain admin claims. Confirm in D-7 |

## 2. Parent authentication

- **Sign in with Apple**: required by Apple whenever another third-party login is offered. We offer email too, so Apple sign-in must be present. Handle `credentialRevoked` and implement token revocation on account deletion (Apple requires it).
- **Email and password**: Firebase Auth. Password minimum 10 characters, email verification before child profile creation. Password reset by Firebase email template customised with the DeenStars brand.
- **Re-authentication** is required for: changing email/password, resetting the parent PIN, deleting a child, deleting the account, and data export.
- **Logout** clears the Firebase session, the parent-mode session, the local Firestore cache, and cached audio tied to the child.
- No social logins other than Apple.
- Account enumeration: password reset and login errors use neutral wording.

## 3. Child mode and parent mode

The app holds one Firebase session (the parent's). To keep a child out of the parent area and out of reward manipulation, two layers are used:

### 3.1 Parental gate (client, deterrent)
Required to enter parent area, open settings, leave the app, external links, purchases. Apple's Kids Category expects a gate that a young child cannot pass. Design: a challenge that needs adult reading and reasoning (for example "Press and hold the two corners for 3 seconds while reading a short word instruction" or a number-words arithmetic prompt). The gate is random each time.

### 3.2 Parent PIN and parent-mode session (server-verified)
- Parent sets a 4–6 digit PIN during onboarding. It is stored only as a salted slow hash (scrypt or Argon2id via a Cloud Function). Never stored client-side.
- `startParentSession(pin)` verifies the PIN and creates `parents/{uid}/parentSessions/{sid}` with `expiresAt` = 5 minutes (extended on activity, max 15 minutes). The session id is returned to the app and held in memory only.
- **Protected callables** (`decideApproval`, `updateDuaProgress` to parentConfirmed, `setLeaderboardOptIn`, `deleteChildProfile`, `updateChildProfile` for age or difficulty changes, `exportChildData`, notification and privacy settings) require a valid `sessionId`.
- Rate limit: 5 wrong attempts then a lockout of 15 minutes, doubling after repeat lockouts. A lockout never blocks child mode.
- Face ID or Touch ID may unlock the PIN **locally** (Keychain item with biometry access control) and the app then submits the PIN to the server. The PIN never leaves the device in the clear except over TLS to the function.
- Forgot PIN: re-authenticate with the account credentials, then set a new PIN.

Why both layers: the gate stops young children in the UI. The PIN session stops anyone who bypasses or reads UI state, and protects approvals and stars if a child finds a way to call the API using the parent's session.

## 4. App Check

- **App Attest** provider on iOS 14+ for release builds, DeviceCheck fallback. Debug provider for dev and CI only, with registered debug tokens.
- Enforce App Check on Firestore, Storage, and all callable functions (`enforceAppCheck: true`). Use replay protection (limited-use tokens) on the reward functions and PIN functions.
- Admin portal uses reCAPTCHA Enterprise App Check.

## 5. Secrets and configuration

- No secrets in the app. `GoogleService-Info.plist` is not a secret but prod values are kept out of the repo.
- Function secrets via Secret Manager.
- Admin credentials with MFA required (enforced by Identity Platform).

## 6. Firestore Security Rules strategy

Principles:
1. Deny by default. `match /{document=**} { allow read, write: if false; }` at the root.
2. Parents read their own data. They never write ledgers, completions, approvals, milestones, leaderboards or content.
3. Published content is read-only to any signed-in, verified parent with App Check.
4. Cross-document checks are done by rules only where cheap (`get()` calls are limited). Anything complex lives in a callable.
5. Rules are unit-tested with the Emulator Suite (`@firebase/rules-unit-testing`) as a required CI step.

### Access matrix

| Path | Read | Write |
|---|---|---|
| `parents/{uid}` | owner | owner for limited fields (`displayName`, notification prefs). `pin`, `consent`, `childCount` are blocked |
| `parents/{uid}/parentSessions/*` | none | none (functions only) |
| `parents/{uid}/notifications/*` | owner | owner may only set `readAt` |
| `children/{id}` | `ownerUid == auth.uid` | none (callables). Exception: none in v1 |
| `children/{id}/**` | owner | none, except `duaProgress`/`surahProgress` via callables only |
| `activities, duaLibrary, surahLibrary, quizzes, quizQuestions, games, gameContent, milestones, achievements, weeklyChallenges, badges` | signed in, email verified | none |
| `appConfiguration/*` | signed in | none |
| `leaderboards/**` | signed in | none |
| `monthlyRewards/**` (public published view only) | signed in, only when `status == published` and fields contain no child refs | none |
| `contentDrafts, contentReviewRecords, auditLog, adminUsers, prizeFulfilment` | none from app clients | none from app clients. The admin portal goes through callables |

Example fragment:

```
function signedIn() { return request.auth != null; }
function isOwner(childData) { return signedIn() && childData.ownerUid == request.auth.uid; }

match /children/{childId} {
  allow read: if isOwner(resource.data);
  allow write: if false;
  match /{sub=**} {
    allow read: if isOwner(get(/databases/$(database)/documents/children/$(childId)).data);
    allow write: if false;
  }
}
match /activities/{id} { allow read: if signedIn(); allow write: if false; }
```

(Reads of subcollections do one `get()` each. Acceptable. An alternative is to denormalise `ownerUid` into every child subdocument and check `resource.data.ownerUid`, which avoids the extra read. Use that for high-volume collections such as `starTransactions`.)

### Storage rules
- `content/**`: read for signed-in users. Write none (functions or admin SDK).
- No child-uploaded files. No user-generated media.
- Admin uploads go to `staging/**` through signed URLs from callables, then move to `content/**` on publish.

## 7. Cloud Function authorisation checklist (every callable)

1. `request.auth` present, email verified (or Apple verified).
2. App Check token valid.
3. Input validated with a schema (zod). Reject unknown fields.
4. Resource ownership: `children/{childId}.ownerUid == uid`.
5. Parent session valid where required.
6. Content is published and eligible for the child.
7. Rate limit per uid and per child.
8. Idempotency key honoured.
9. Structured log with no personal data. Log childId only as an opaque ID.

## 8. Abuse and anti-cheat

- Daily caps and once-per-day rules are enforced server-side (see `REWARDS.md`).
- Quiz and game attempts need a server-issued `attemptToken` created at start. Completion earlier than a plausible minimum duration is awarded zero stars (no error shown to the child).
- Suspicious patterns (many completions within seconds, repeated identical attempts, activity at implausible volume) set `flags` used in admin review. They are never auto-punitive.
- Leaderboard excludes ledger entries marked `leaderboardEligible: false` (capped game and quiz stars beyond the share limit).

## 9. Data protection summary

- TLS in transit. Firebase encrypts at rest.
- Firestore in a single region chosen by the legal review (D-6).
- Backups: scheduled Firestore export to a locked-down bucket, retention 30 days. Deletion requests propagate to backups on expiry. Document this in the privacy notice.
- Logging without personal data. Crash reports only after approval of Crashlytics (open item).

## 10. Security testing

Rules unit tests, function authorisation tests, an abuse test suite (replays, parallel requests, tampered amounts), dependency audit in CI, an external review before App Store submission. See `TESTING.md`.
