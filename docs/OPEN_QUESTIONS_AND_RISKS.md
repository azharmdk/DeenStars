# DeenStars – Gaps, Decisions and Risks

Status: for your review. Each decision has a recommendation. Reply with approvals or changes.

## 1. Environment findings

| Item | Finding | Impact |
|---|---|---|
| OS | Windows 11 (10.0.26200) | iOS cannot be built or run here |
| Xcode, Swift | Not installed (not available on Windows) | Needs a Mac |
| Git | Not installed | Needed before any repo work |
| Node / npm | v24.21.0 / 11.19.0 | Good for Functions, rules tests and admin portal. Cloud Functions may not support Node 24 as a deploy runtime, so use Node 20 or 22 for functions (verify against Firebase docs) |
| Firebase CLI | Not installed | Install with `npm i -g firebase-tools` |
| Java | Not installed | Firestore Emulator needs a JDK |
| Workspace | Empty, not a Git repository | Greenfield |
| MCP and steering | None configured before this work | Steering added in `.kiro/steering/` |

## 2. Decisions needed (blocking before code)

| ID | Decision | Recommendation |
|---|---|---|
| D-1 | **iOS build environment.** Options: a Mac you own, a cloud Mac (MacinCloud and similar), or macOS CI runners (GitHub Actions) with a local Windows editor | A Mac for the iOS developer is strongly preferred. The backend and admin portal can start on this Windows machine immediately |
| D-2 | **Verifiable parental consent method** (COPPA and others) | Take legal advice. The data model supports changing the method. Likely an account-level consent plus a verification step such as a small card authorisation or another approved method |
| D-3 | **Minimum iOS version** | iOS 17 (Observation framework, modern SwiftUI) |
| D-4 | **Mascot and character style.** Some families avoid lifelike depictions of living beings | Non-human mascot (star or lantern character), stylised children optional. Confirm with the reviewer panel |
| D-5 | **Business model.** Free, paid upfront, subscription, or sponsored by donations | Not specified. Affects Kids Category rules (no ads, purchases behind parental gate), App Store review, and the cost of Firebase Blaze. Decide before Phase 8. Recommendation: design for a possible parent-only subscription behind a parental gate, build nothing now |
| D-6 | **Launch countries and data region** | Start with a single region. Decide US, UK, EU and others before choosing the Firestore location, which cannot be changed later |
| D-7 | **Admin identity separation** | Separate Identity Platform tenant for staff so that parent accounts can never carry admin claims |
| D-8 | **Content governance:** policy owner and at least two qualified Islamic reviewers, their qualifications, madhab and aqeedah approach for contested topics, process for conflicts | Required before any religious content is authored |
| D-9 | **Licences:** Quran text edition, translation, Hadith translations, reciters' audio, Arabic font, illustrations | Check commercial and children's app use for each |
| D-10 | **Monthly prizes and competition law** for minors by country, eligibility, tax, shipping | Legal review before enabling prizes. Launch can ship certificates only |
| D-11 | **Game flexibility:** new content remotely, new mechanics by release (not downloadable code) | Accept |
| D-12 | **Release strategy:** MVP release after Phase 3–4 vs a single v1.0 | Staged. Earlier family feedback improves the product |
| D-13 | **Crash reporting and analytics** | None at first. Consider Crashlytics later after privacy review. Use first-party aggregate counts for success metrics |
| D-14 | **App name and mark clearance** | Check "DeenStars" trademark and App Store name availability |

## 3. Missing or under-specified requirements found in the master prompt

1. **Monetisation** is not defined (D-5).
2. **Languages**: only English is specified. Many families will want Urdu, Arabic UI, Bengali, Turkish, Malay and others. Schema supports localised strings. Decide the first extra languages.
3. **Parental gate and parent PIN** are not specified. Needed for Kids Category and to protect approvals. Proposed in `AUTH_SECURITY.md`.
4. **Co-parents** (two guardians per child). Schema reserves `guardianUids`. Not in v1.
5. **Age progression**: how a child moves from 3–4 to 5 to 6. Proposed: parent-confirmed prompt on birthday month.
6. **Time zone and day boundaries**: needed for "daily" and Friday logic. Proposed: per-child time zone, server computed.
7. **Offline mode** behaviour is not specified. Proposed in `ARCHITECTURE.md`.
8. **Audio production**: who records, licences, and quality checks (Quran recitation and duas need qualified reciters).
9. **Illustration production**: style guide, count of assets (hundreds). Needs an illustrator and a review loop.
10. **Dua and Surah content selection**: which 12 duas and 3 Surahs go in the first release. Content team to propose, reviewers to approve.
11. **Salah content boundaries**: movements and recitation vary between schools of thought. Needs reviewer policy (kept simple and non-prescriptive for preschoolers).
12. **"Adult obligations" language** for Jummah and Salah for young children. Proposed in `ISLAMIC_CONTENT_POLICY.md` §3.12.
13. **Hijri calendar and seasonal content** (Ramadan, Eid): whether date-based features use Hijri dates. Moon-sighting differences make date-based triggers contentious. Proposed: seasonal content is manually scheduled by admin, not computed.
14. **Support, contact, feedback, FAQ**, and a "report a content issue" process.
15. **Accessibility for children with additional needs** (switch control, reduced stimuli mode).
16. **Parent report e-mails and deep links**: legal wording and unsubscribe.
17. **Account recovery for lost PIN**: proposed re-authentication.
18. **Data export and retention periods** (proposed in `CHILD_SAFETY.md`).
19. **Moderation of leaderboard nickname lists** and avatar sets (system-controlled, so low risk).
20. **Anti-cheat scope**: parents can inflate stars by approving everything. That is acceptable. The leaderboard caps and flags cover obvious abuse, and the monthly review is manual.
21. **Cost model**: Blaze plan is required for Functions. Estimate reads and writes per child per day to forecast costs. Leaderboard hourly rebuild cost control.
22. **Backup and disaster recovery** for Firestore (scheduled export and restore drill).
23. **Screen-time guidance**: parent daily limit. Proposed in `USER_FLOWS.md`.
24. **App Store age rating and Kids Category selection**: the Kids Category adds constraints (no third-party analytics, restrictions on external links). Decide whether to join the Kids Category or use a standard category with a 4+ rating and adopt child-safe practices anyway. Recommendation: Kids Category (ages 5 and under), after confirming the 6-year-olds fit the band (Apple's bands are 5 and under, 6–8, 9–11).
25. **Marketing site, privacy policy hosting and terms** (public URLs are mandatory for App Store review).

## 4. Technical risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Wrong or unverified religious content reaches children | Medium | Severe | Publish gate, human reviewers, source registry, imported (not typed) Quran text, kill switch, parent issue reporting |
| R-2 | Children bypass the parental gate and tamper with stars or approvals | Medium | High | Server-verified PIN session for sensitive actions, server-side rewards, caps, ledger |
| R-3 | Regulatory non-compliance (COPPA, Kids Category, GDPR-K) | Medium | Severe | Legal review, minimal data, no third-party SDKs, audit before launch |
| R-4 | Duplicate rewards through retries or races | High without design | High | Deterministic ledger IDs, transactions, idempotency keys, concurrency tests |
| R-5 | Leaderboard re-identification (small groups, unique nicknames) | Low–Medium | High | Curated names, no child IDs in rows, hiding rank numbers in small groups, no free text |
| R-6 | Competition and prize law violations | Medium | High | Legal review, certificates first, published terms |
| R-7 | Content bottleneck delays all phases | High | High | Start content governance now. Placeholder content for development only |
| R-8 | Firestore cost growth from rollups and leaderboard rebuilds | Medium | Medium | Aggregated rollup docs, limit queries, schedule hourly rebuilds only for opted-in groups |
| R-9 | Offline or clock skew creating wrong day keys | Medium | Medium | Server computes the day key. Accepts client day key only within a tolerance window |
| R-10 | Arabic rendering errors, such as missing diacritics | Medium | High | Bundled font, snapshot tests, reviewer checks in-app |
| R-11 | App Store rejection (Kids Category, account deletion, Sign in with Apple, privacy label) | Medium | Medium | Checklist from the start. Account deletion in-app, Apple token revocation |
| R-12 | Firebase vendor lock-in or SDK privacy behaviour changes | Low | Medium | Repository protocols isolate Firebase. Audit SDK data collection per release |
| R-13 | Reviewer disagreement on a topic | Medium | Medium | Two reviewers, escalation rule, conservative wording, exclude disputed topics |
| R-14 | Excessive screen-time incentives | Medium | Medium | Daily caps, limits, "all done" screen, report framing |
| R-15 | Windows-only environment blocks iOS work | Certain today | High | D-1 |
| R-16 | Single maintainer risk for content and code | Medium | Medium | Documentation, CI, steering files |

## 5. What I need from you

1. Approve or change D-1 to D-14 (recommendations are above, with D-1, D-2, D-4, D-5, D-8 the most important).
2. Approve the architecture (`ARCHITECTURE.md`, `FIREBASE_SCHEMA.md`, `AUTH_SECURITY.md`).
3. Approve the UI direction (`WIREFRAMES.md`, `DESIGN_SYSTEM.md`).
4. Confirm the first work item after approval. My suggestion: Phase 1 backend slice first (Firebase project setup, rules, emulator tests, parent PIN and reward functions skeleton), since it can be built and tested on this Windows machine while the Mac question is resolved.
