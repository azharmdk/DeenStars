# DeenStars – System Architecture

Status: DRAFT for approval. Version 0.1.

## 1. System context

```
 ┌──────────────────────┐        ┌────────────────────────────────────────┐
 │ iOS app (SwiftUI)    │        │ Firebase project                       │
 │  Child mode          │◄──────►│  Auth · App Check · Firestore · Storage│
 │  Parent mode (gated) │        │  Cloud Functions (TypeScript)          │
 └──────────────────────┘        │  Cloud Messaging · Remote Config*      │
                                 │  Hosting (admin portal)                │
 ┌──────────────────────┐        │                                        │
 │ Admin portal (web)   │◄──────►│  Content pipeline: draft→review→publish│
 │  React + TypeScript  │        └────────────────────────────────────────┘
 └──────────────────────┘
 * Remote Config only for non-sensitive flags. Reward values live in Firestore (`appConfiguration`) so they are audited.
```

Key facts:
- The child has no Firebase identity. The app signs in as the **parent**. "Child mode" is a UI state. Because of that, the backend cannot rely on identity to tell parent from child. It uses a **parent-mode session** that Cloud Functions verify (see `AUTH_SECURITY.md`).
- Clients never write stars, approvals, milestones, leaderboard rows or published content.
- Clients read only published, approved content.

## 2. iOS app

### 2.1 Technology
- Swift 5.10+ / Swift 6 language mode when dependencies allow, SwiftUI, async/await, Observation (`@Observable`), iOS 17+.
- Firebase iOS SDK through Swift Package Manager: `FirebaseAuth`, `FirebaseFirestore`, `FirebaseFunctions`, `FirebaseStorage`, `FirebaseMessaging`, `FirebaseAppCheck`. No Analytics, no Ads. Crashlytics only after privacy review (open item).
- Audio: `AVFoundation`. Haptics: `CoreHaptics` via a small wrapper. Animation: SwiftUI plus Lottie-style assets only if a privacy-clean, no-network library is approved. Default is SwiftUI animation.

### 2.2 Layering (MVVM, strict dependency direction)

```
Features (Views + ViewModels)  ──►  Domain (models, use cases, protocols)
                                         ▲
Data (Firebase repositories) ────────────┘ implements protocols
DesignSystem  ◄── used by Features only
Core (utilities, logging, config, DI)
```

Rules:
1. Views contain no business logic and never import Firebase.
2. ViewModels depend on protocols from Domain, injected at the composition root.
3. Only `DSData` imports Firebase. This keeps the Android-compatible content model and eases testing with in-memory fakes.
4. Rewards are never computed on device. The device only displays results returned by the backend.

### 2.3 Module layout (local Swift packages in one Xcode workspace)

```
DeenStars/
  DeenStars.xcodeproj
  App/                       // @main, composition root, navigation shell, AppEnvironment
  Packages/
    DSCore/                  // Logger, Clock, DayKey, Result helpers, FeatureFlags
    DSDesignSystem/          // Colors, Typography, Components, Mascot, Motion, Haptics
    DSDomain/                // Entities, repository protocols, use cases
    DSData/                  // Firestore/Functions/Storage implementations, DTO mapping, cache
    DSAudio/                 // Audio playback + cache
    FeatureOnboarding/
    FeatureChildHome/
    FeatureChecklist/        // includes Jummah
    FeatureDuaCorner/        // includes Surah learning
    FeatureQuiz/
    FeaturePlayLearn/        // game host + 8 game renderers
    FeatureAchievements/
    FeatureChildProfile/
    FeatureParent/           // dashboard, approvals, settings (gated)
  Tests/ UITests/
```

### 2.4 State and navigation
- `AppState` (root): `signedOut | needsConsent | parentHome | childMode(childId)`.
- `NavigationStack` per tab. A single `Router` per feature, no global singleton.
- Switching from child mode to parent mode requires the parental gate (see `AUTH_SECURITY.md`).

### 2.5 Offline and caching
- Firestore offline persistence on, with a bounded cache size.
- Content is fetched by `contentVersion`. `appConfiguration/content` holds the current version per content type. The app refreshes when the version changes.
- Audio and images are cached on disk by `(path, version)` with a size cap, and are prefetched on Wi-Fi for the child's age group.
- Completions made offline are queued as callable requests with an idempotency key and retried. UI shows a neutral "saving" state, never an error state a child sees.

### 2.6 Localisation and Arabic
- English strings in `Localizable.xcstrings`. Arabic content is data, rendered with a bundled Uthmani-style font and correct RTL. Never build Arabic text by string concatenation.

## 3. Backend

### 3.1 Cloud Functions (TypeScript, 2nd gen, one region matching Firestore)

Callable (App Check enforced, Auth required):

| Function | Purpose |
|---|---|
| `completeActivity` | Child completes a task. Awards stars or creates a pending approval |
| `decideApproval` | Parent approves or declines. Requires parent-mode session |
| `submitQuizAttempt` | Validates attempt, awards capped participation stars |
| `submitGameResult` | Validates session, awards capped stars |
| `updateDuaProgress` | Child moves Not started → Practising. Parent confirms memorisation |
| `startParentSession` | Verifies PIN, issues short-lived parent-mode session |
| `setParentPin` / `resetParentPin` | PIN lifecycle (reset needs re-authentication) |
| `createChildProfile` / `updateChildProfile` | Validates age group, records consent version |
| `setLeaderboardOptIn` | Parent opt-in, generates anonymous nickname and avatar |
| `deleteChildProfile` / `deleteAccount` | Starts deletion job |
| `exportChildData` | Parent data export (privacy right) |
| Admin callables | `submitForReview`, `reviewDecision`, `publishContent`, `approveWinners`, `recordReward`, etc. |

Triggers and schedules:

| Function | Trigger | Purpose |
|---|---|---|
| `onStarTransactionCreated` | Firestore create | Update rollups, evaluate milestones |
| `evaluateMilestones` | Called by the above | Unlock milestones, write `childMilestones` |
| `buildDailyChecklist` | Schedule + on demand | Compose per-child daily checklist |
| `buildWeeklyLeaderboard` | Schedule, Monday 00:05 UTC and hourly refresh | Rank opted-in children by age group |
| `computeMonthlyCandidates` | Schedule, 1st of month | Produce candidates for admin review |
| `sendScheduledNotifications` | Schedule | Parent-only reminders and weekly report |
| `runDeletionJob` | Task queue | Deletes child or account data in batches |
| `validateContentForPublish` | Called by `publishContent` | Automated checks from `ISLAMIC_CONTENT_POLICY.md` |
| `auditLogWriter` | Admin callables | Append-only audit entries |

### 3.2 Reward integrity pattern

1. Client sends `{childId, activityId, clientRequestId}`.
2. Function verifies parent owns child, activity is published and eligible, parent session if needed.
3. In a Firestore transaction: compute `dayKey` from the child's stored time zone, derive the deterministic id `txn_{childId}_{ruleKey}_{dayKey}`, create the `starTransactions` doc if it does not exist, and update rollup counters.
4. If it already exists, return the existing result (idempotent).
5. Star amount comes from the activity's server-side `starValue` snapshot or `appConfiguration/rewards`. The client's amount is ignored.

### 3.3 Content pipeline

```
Editor drafts (contentDrafts) → Pending Review → Reviewer inspects source → Approved
   → validateContentForPublish → publish to read-only collections with contentVersion++
```
Published collections (`activities`, `duaLibrary`, `quizQuestions`, …) are writable only by Cloud Functions. Details in `ADMIN_PORTAL.md`.

### 3.4 Admin portal
- React + TypeScript + Vite on Firebase Hosting. Role claims (`editor`, `reviewer`, `rewardsManager`, `admin`) as Firebase custom claims. All writes go through callable functions so rules and audit logging are in one place.

## 4. Environments

| Env | Firebase project | Purpose |
|---|---|---|
| dev | `deenstars-dev` | Developer testing, Emulator Suite |
| staging | `deenstars-staging` | TestFlight, content rehearsal |
| prod | `deenstars-prod` | App Store |

Separate Apple bundle identifiers per environment through Xcode configurations. Firebase config files are not committed for prod.

## 5. Build and tooling reality check

The current workspace machine is Windows with Node 24 and no Git, Xcode or Firebase CLI.
- Backend (Functions, rules, admin portal) can be built and tested here with Node, Firebase CLI and the Emulator Suite. Emulator needs a JDK for Firestore.
- The iOS app **cannot be built or run on Windows**. It needs macOS with Xcode. See D-1 in `OPEN_QUESTIONS_AND_RISKS.md`.
- Cloud Functions runtime versions are limited to those Firebase supports. Node 24 locally may need a Node 20/22 version manager. Verify current supported runtimes when setting up.

## 6. Key architecture decisions

| ID | Decision | Alternatives | Reason |
|---|---|---|---|
| AD-1 | Child profiles are top-level `children/{childId}` with `ownerUid` and a `guardianUids` array | Subcollection of parent | Collection-group jobs, future co-guardian, simpler leaderboard builds. Rules check `ownerUid` |
| AD-2 | Child activity data in subcollections of the child | Flat collections | Scoped queries and rules, easy deletion by recursive delete |
| AD-3 | Draft content in `contentDrafts`, published content in read-only collections | Status flag in one collection | Clients can never read unapproved content. Rules stay trivial |
| AD-4 | Star ledger (`starTransactions`) is the source of truth, rollups are derived | Counters only | Auditable, repairable, supports daily/weekly/monthly |
| AD-5 | Quiz and game stars are participation-based, not correctness-based | Correctness-based | Answers must be visible to the client for instant feedback, so correctness cannot be trusted |
| AD-6 | Games are data-driven templates, mechanics ship with the app | Downloaded scripts | App Store rules forbid downloaded code that changes app functionality |
| AD-7 | Leaderboard rows are server-written snapshots with no child IDs exposed | Query live data | No personal data exposure, cheap reads |
