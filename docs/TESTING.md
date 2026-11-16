# DeenStars – Testing Strategy

Status: DRAFT for approval. Version 0.1.

## 1. Principles
- Each milestone is tested before the next one starts.
- Reward logic, security rules and content gates are the highest-risk areas and get the deepest coverage.
- Tests that need Xcode run on macOS (local Mac or CI macOS runner). Backend tests run anywhere with Node and the Firebase Emulator Suite.

## 2. Test layers

| Layer | Tooling | Scope |
|---|---|---|
| Swift unit tests | XCTest / Swift Testing | ViewModels, use cases, DayKey and time-zone logic, game template rules, quiz session state, mappers (DTO ↔ domain) |
| Swift UI tests | XCUITest | Onboarding, parental gate and PIN, checklist completion, approval, quiz flow, game flow, deletion |
| Snapshot tests | swift-snapshot-testing (dev only dependency, reviewed) | Design system components in light, large text, reduce motion |
| Accessibility tests | Accessibility Audit (`performAccessibilityAudit`), manual VoiceOver | Every screen |
| Functions unit tests | Vitest or Jest | Reward calculation, caps, ranking, milestone conditions, content gates |
| Functions integration | Firebase Emulator Suite (Auth, Firestore, Functions, Storage) | Callables end-to-end, idempotency, concurrency |
| Rules tests | `@firebase/rules-unit-testing` | Every row of the access matrix, positive and negative |
| Admin portal | Vitest, React Testing Library, Playwright | Review workflow, publish gate, RBAC |
| Content validation | CLI over sample packs | Source completeness, duplicates, quiz validity |
| Security | Abuse scripts, dependency audit, manual review | See §4 |
| Performance | Instruments, XCTest metrics | Launch time, memory, scrolling, game frame rate |

## 3. Critical test cases

### Rewards and approvals
- Same completion sent 50 times in parallel → one ledger entry.
- Approve twice, approve from two sessions → one reward.
- Decline then re-request → allowed. Stars awarded once after approval.
- Client sends a tampered star amount → ignored.
- Day boundary in different time zones, DST changes, device clock changes.
- Offline completion replay after 24 h and after 72 h.
- Config change mid-day → `configVersion` recorded, old entries untouched.
- Stars never decrease (property test over random action sequences).
- Quiz and game caps, repeat attempts, too-fast completions.
- Milestone unlocks exactly once, retroactive run is idempotent.

### Security and privacy
- A parent cannot read another parent's child (all subcollections).
- A signed-in parent cannot write stars, approvals, milestones, leaderboard rows or content.
- Unverified email cannot create children.
- Requests without App Check are rejected.
- Child-mode session cannot call protected callables without a parent session.
- PIN lockout and backoff.
- Leaderboard rows contain no child ID or real name. A script scans all response payloads.
- Deletion removes every subcollection document (scan after deletion).
- Network audit: the app contacts only Firebase and Apple domains. No third-party hosts.

### Content
- Publish blocked for each failure type in `ISLAMIC_CONTENT_POLICY.md` §7 (one test per row).
- Editing approved religious content creates a new draft and keeps old live.
- Reviewer cannot approve own item.
- Source text mismatch is detected.
- Placeholder content cannot reach staging or production.

### Accessibility
- VoiceOver completes every journey including quizzes and games.
- Dynamic Type up to the largest accessibility size on parent screens.
- Contrast checks for every token pair.
- Reduce Motion variants.

### Localisation and Arabic
- Arabic renders with diacritics, no clipping, correct RTL, and snapshot-matched against the reviewed glyph strings.

## 4. Security testing plan
1. Static: dependency audit (`npm audit`, Swift package review), secret scanning.
2. Rules: automated tests, plus manual attempts using the Firebase REST API with a real parent token.
3. Functions: fuzz inputs, replay attacks, parallel requests, privilege escalation attempts.
4. App: jailbreak-free review of stored data (Keychain, UserDefaults, cache), proxy traffic inspection.
5. External penetration test before launch.

## 5. CI (when a repository is set up)

| Job | Runner | Runs |
|---|---|---|
| `functions` | ubuntu | lint, type-check, unit and emulator tests |
| `rules` | ubuntu | rules tests |
| `admin-portal` | ubuntu | lint, tests, build |
| `ios` | macos | build, unit tests, UI tests on simulator, snapshot tests |
| `content` | ubuntu | validate sample and seed content |

Merge requires green jobs. Releases to TestFlight from tagged builds.

## 6. Manual test passes
- Each milestone: scripted checklist on a real iPhone (small and large).
- Accessibility pass with VoiceOver and Dynamic Type.
- "Toddler test": observe real 3–6 year olds with a parent present (with consent) using prototype builds.
- Islamic content pass: reviewer reads and listens to all content in the app, not just the admin portal.

## 7. Definition of done for a milestone
- Acceptance criteria in this plan met.
- Automated tests green (unit, integration, rules where relevant).
- Manual checklist done.
- Documentation updated.
- No open critical or high defects.
- Security and privacy self-check completed.
- Demo and sign-off from the product owner.

## 8. Launch testing (Phase 8)
TestFlight beta with parents (internal then external), crash and performance review, App Store metadata and privacy label review, Kids Category checklist, final content audit, load test of Functions (approvals burst on Friday), backup and restore drill.
