---
inclusion: always
---

# Architecture and coding standards

Full docs: `docs/ARCHITECTURE.md`, `docs/FIREBASE_SCHEMA.md`, `docs/AUTH_SECURITY.md`, `docs/DESIGN_SYSTEM.md`.

## iOS (SwiftUI)
- Swift, SwiftUI, async/await, `@Observable`, iOS 17+ (pending decision D-3). MVVM.
- Local Swift packages: `DSCore`, `DSDesignSystem`, `DSDomain`, `DSData`, `DSAudio`, `Feature*`.
- Dependency direction: Features → Domain ← Data. Only `DSData` imports Firebase. Views never contain business logic.
- ViewModels get dependencies through protocols injected at the composition root. Provide in-memory fakes for tests.
- Reusable components live in `DSDesignSystem` and use semantic tokens (colour, type, spacing). No magic numbers in feature views.
- Accessibility is required: VoiceOver labels, Dynamic Type, Reduce Motion, 60 pt child touch targets, tap alternatives to drag.
- Arabic is data rendered through `DSArabicText`. Never concatenate Arabic strings.
- No third-party SDKs for analytics, ads or attribution. New dependencies need a privacy and licence review noted in the PR.
- The iOS app cannot be built on the Windows dev machine. Do not claim iOS code compiled or ran unless it did on macOS.

## Backend (Firebase)
- Cloud Functions in TypeScript, 2nd gen, callable with App Check and Auth enforced. Validate input with a schema (zod). Reject unknown fields.
- Authorisation checklist for every callable is in `docs/AUTH_SECURITY.md` §7.
- Firestore: deny by default. Children are `children/{childId}` with `ownerUid`. Child data lives in subcollections. Published content collections are read-only to clients.
- Day logic (`dayKey`, `weekKey`) is computed server-side in the child's time zone.
- Star ledger is append-only. IDs are deterministic. Rollups are derived and rebuildable.
- Security rules changes need emulator rules tests in the same change.
- Logs contain no personal data. Use opaque IDs.

## Quality
- Tests accompany each milestone (`docs/TESTING.md`). Reward logic, rules and content gates need negative tests.
- Keep documentation in `docs/` current when behaviour changes.
- No unrequested refactors or features. Prefer small, reviewable changes.
