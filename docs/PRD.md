# DeenStars – Product Requirements Document

Status: DRAFT for approval. Version 0.1.

**Tagline:** Little Steps. Beautiful Habits. Brighter Hearts.
**Platform (v1):** iPhone, native SwiftUI. **Backend:** Firebase. **Audience:** children aged 3–6, owned and managed by a parent or guardian.

## 1. Vision

A premium early-learning companion that helps young children enjoy Islamic habits, duas, manners, good deeds, quizzes and games, and helps parents trust the accuracy of what their children learn. It should feel like a quality preschool app, not a religious reference app.

## 2. Principles (apply to every feature)

1. **Authenticity first.** No religious content reaches a child unless a qualified human reviewer approved it against a cited source. See `ISLAMIC_CONTENT_POLICY.md`.
2. **Child safety first.** Minimal data, parent-owned profiles, no messaging, no ads, no location. See `CHILD_SAFETY.md`.
3. **No punishment, no guilt.** Stars are never deducted. There are no streak penalties and no failure states in games.
4. **Effort over rank.** Personal milestones matter more than leaderboard position. A child's religious worth is never tied to points.
5. **Server decides rewards.** The client reports events. Cloud Functions decide stars.
6. **Content is data.** Religious content, tasks, star values and questions are never hardcoded in the app.
7. **Simplify the wording, never the meaning.**

## 3. Personas

| Persona | Needs |
|---|---|
| Parent / guardian (account owner) | Trust in accuracy, quick setup, simple oversight, control of privacy, approvals in one place, progress without pressure to increase screen time |
| Child 3–4 | Pictures, audio, large buttons, almost no reading, parent nearby |
| Child 5 | Simple checklists, picture quizzes, short games |
| Child 6 | More independence, short Surah/dua memorisation, scenario questions, Arabic letters |
| Content reviewer (qualified Islamic scholar/teacher) | Inspect the original reference, approve or reject with notes |
| Content editor | Draft content, upload audio, submit for review |
| Admin / rewards manager | Review leaderboards and monthly results, publish winners, record prizes |

## 4. Scope by feature area

Detail for each area lives in the linked documents. The numbering matches the master prompt.

| Area | Summary | Doc |
|---|---|---|
| Accounts and onboarding | Sign in with Apple, email/password, recovery, multiple child profiles, consent and privacy disclosures before child features | `AUTH_SECURITY.md`, `USER_FLOWS.md` |
| Child app | Five tabs: Home, Checklist, Play & Learn, Achievements, Profile | `USER_FLOWS.md`, `WIREFRAMES.md` |
| Checklists | Dynamic by age and difficulty; six categories; self-reported or parent-approved; Jummah on Fridays | `REWARDS.md`, `FIREBASE_SCHEMA.md` |
| Dua and Quran | Dua Corner, Learn This Dua states, short Surah learning | `ISLAMIC_CONTENT_POLICY.md` |
| Good deeds and manners | Good Deed of the Day, no photo evidence | `REWARDS.md` |
| Milestones | Remote-configured, seven categories | `REWARDS.md` |
| Quizzes | Remote question bank, six formats, age-specific design | `QUIZ_ENGINE.md` |
| Games | Eight games on a data-driven engine | `GAME_ENGINE.md` |
| Stars and weekly challenges | Central, configurable, server-awarded | `REWARDS.md` |
| Leaderboard and monthly recognition | Opt-in, anonymous, server-calculated, admin-approved | `REWARDS.md`, `ADMIN_PORTAL.md` |
| Parent dashboard | Separate protected area | `USER_FLOWS.md` |
| Admin portal | Web app, RBAC, audit trail, review workflow | `ADMIN_PORTAL.md` |

## 5. Functional requirements (testable summary)

### 5.1 Accounts
- FR-A1 Parent can register with Apple, or email and password. Password recovery by email. Secure logout.
- FR-A2 Parent can create, edit and delete multiple child profiles. Children have no credentials.
- FR-A3 Child features are disabled until the parent completes the privacy notice and consent step.
- FR-A4 Parent area is protected by a parental gate and a parent PIN (with optional Face ID). See `AUTH_SECURITY.md`.
- FR-A5 Account deletion removes all child data (see deletion procedure in `CHILD_SAFETY.md`).

### 5.2 Checklists
- FR-C1 Each task has every field listed in `FIREBASE_SCHEMA.md` (`activities`).
- FR-C2 Checklist for a child is composed server-side from published activities matching age group, difficulty and parent customisations.
- FR-C3 Self-reported tasks award stars immediately through a Cloud Function.
- FR-C4 Parent-approved tasks become `pendingApproval`. Stars are awarded only on approval.
- FR-C5 A task can award stars at most once per child per day-key. Replays and retries do not duplicate stars.
- FR-C6 Missed tasks have no penalty and no visible "failed" state.
- FR-C7 Jummah checklist appears on Fridays in the child's time zone, with progress indicator and weekly badge.

### 5.3 Learning
- FR-L1 Dua Corner lists published duas by category. Each dua has Arabic, transliteration, translation, audio, explanation, when to recite, and verified source.
- FR-L2 Learn This Dua tracks: Not started, Learning, Practising, Learned, Parent-confirmed.
- FR-L3 Only the parent can set Parent-confirmed.
- FR-L4 Short Surah learning follows the same model.

### 5.4 Quizzes and games
- FR-Q1 Quiz questions come from the remote bank. Only approved questions are served.
- FR-Q2 Wrong answers produce gentle feedback and the explanation. There are no timers and no lives.
- FR-Q3 Stars are for participation, capped per day (see `REWARDS.md`).
- FR-G1 Games last about 1–3 minutes, have replay, audio support and no punishment.
- FR-G2 Game content is remote. New game mechanics need an app release (see `GAME_ENGINE.md`).

### 5.5 Rewards
- FR-R1 Totals: all-time, daily, weekly, monthly. Computed from the `starTransactions` ledger.
- FR-R2 Star values come from remote configuration.
- FR-R3 Milestones unlock server-side and are configurable remotely.

### 5.6 Leaderboard
- FR-LB1 Off by default. Parent opts in per child.
- FR-LB2 Shows system-generated nickname and avatar, weekly stars, position and achievements only.
- FR-LB3 Ranking and tie rules are published in the app.

### 5.7 Parent dashboard
- FR-P1 Pending approvals list with approve all, approve one, decline.
- FR-P2 Progress by day, week and month, dua and Surah progress, quiz and game summaries.
- FR-P3 Notification, leaderboard and privacy settings.
- FR-P4 Optional screen-time reminder (parent-configured) and a daily "enough for today" state in the child app.

### 5.8 Admin and content
- FR-AD1 Draft, Pending Review, Approved, Rejected, Archived workflow with automated publish checks.
- FR-AD2 Edits to approved religious content create a new version and require review again.
- FR-AD3 Full audit trail.

## 6. Non-functional requirements

- Accessibility: VoiceOver labels, Dynamic Type, contrast AA or better, reduced motion, touch targets at least 60 pt for child screens.
- Performance: cold start under 2 s on iPhone 12 or newer. Games run at 60 fps.
- Offline: previously loaded content and checklists work offline. Completions queue and sync later. Stars show as "syncing" until confirmed.
- Reliability: all reward functions are idempotent.
- Privacy: no third-party advertising or analytics SDKs.
- Minimum OS: iOS 17 proposed (allows `@Observable`, SwiftData-free). Confirm in decision D-3.
- Language: English first. Arabic text is always shown with correct shaping, diacritics and RTL layout.

## 7. Out of scope for v1

Android app (backend and content model stay compatible), child-to-child communication, user-generated content, ads, in-app purchases (undecided, see D-5), live classes, prayer time calculation and Qibla.

## 8. Success measures (privacy-preserving)

Measured from first-party data the app already stores for its function, not from third-party analytics:
- Share of parents who complete onboarding.
- Weekly active children as a share of registered children.
- Average checklist completion per active day.
- Dua Learned count per child per month.
- Approval turnaround time.
- Content review turnaround and rejection rate.

## 9. Decisions requiring your approval

See `OPEN_QUESTIONS_AND_RISKS.md` for the full list with recommendations. The decisions that block coding are D-1 to D-8.

## 10. Product decisions log

| Date | Decision |
|---|---|
| 2026-11 | Web prototype (PWA) first on the real dev backend, iOS SwiftUI app later (`ROADMAP.md`). |
| 2026-11 | Approval: selected items need parent approval, simple habits stay self-reported. May be revisited. |
| 2026-11 | Pending approvals expire at the end of the next day, silently, with no stars. Replaces the 14-day expiry. |
| 2026-11 | Streaks are positive only: shown while active and celebrated (for example "Fajr 5 days in a row"). A broken run is never shown. Grace day and parent make-up allowed. Replaces the "no streaks" rule, while keeping the "no guilt" principle. |
| 2026-11 | No public or global ranking of children. Replaces master spec §16 (anonymous weekly leaderboard). |
| 2026-11 | On hold: family leaderboard, monthly awards and prizes. |
| 2026-11 | Retention features added to scope by priority (`ROADMAP.md` Phases 1–6). Random and variable rewards are not adopted. |
