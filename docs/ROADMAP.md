# DeenStars – Development Roadmap

Status: DRAFT for approval. Version 0.1.

Each phase ends with a demoable, tested slice. Estimates are rough effort for one experienced iOS developer plus part-time backend support. They depend on the environment decision D-1 and on content readiness. They are not commitments.

## Phase 0 – Planning and environment (current)
- Documents (this set), wireframes, steering files.
- Decisions D-1 to D-11 (see `OPEN_QUESTIONS_AND_RISKS.md`).
- Environment: Mac with Xcode, Git repo, Firebase projects, Apple Developer account, Node 20/22.
- Content team: named policy owner and two reviewers.
- Visual direction: mascot and illustration style, tested with sample screens.
**Exit:** approval of architecture, UI direction and decisions.

## Phase 0.5 – Installable web prototype (PWA) for QE testing (approved direction)
Purpose: validate UI, flows and the reward backend with QEs in a browser before building the SwiftUI app. Not the production app.
- Frontend: React + TypeScript + Vite PWA (manifest, service worker, Add to Home Screen on iPhone). Hosted on GitHub Pages. Reuses the design tokens from `DESIGN_SYSTEM.md`.
- Backend: real Firebase **dev** project (Auth, Firestore, Functions, rules, App Check for web). The Cloud Functions, rules and schema built here are the production backend, so this work is not thrown away.
- Mascot: non-human star or lantern character, swappable (D-4).
- Content: placeholder only, labelled "Sample, not reviewed". No invented religious text. Synthetic test data only.
- Flows for the first QE round: onboarding and consent, PIN and parental gate, multi-child picker, checklist, parent approvals, Jummah (with a simulated Friday switch in dev), Dua Corner (placeholder duas), quiz.
- Visible "Prototype" banner and a test-data reset option.
- Web-only limits: no App Attest, no Sign in with Apple parity, audio needs a tap first, push only on installed web apps (iOS 16.4+).
**Exit:** QE feedback collected, UI direction confirmed, backend contracts proven. Then the SwiftUI app starts (Phase 1 iOS parts).

## Phase 1 – Foundation (about 4–5 weeks)
- Repo, Xcode workspace, local packages, CI skeleton.
- `DSDesignSystem` base tokens and components.
- Firebase projects (dev, staging), Emulator Suite, Firestore rules baseline (deny all), App Check.
- Auth: Sign in with Apple, email, verify, reset, logout.
- Parent account, consent and privacy flow, parent PIN, parental gate.
- Child profile create, edit, delete, profile picker. Onboarding.
- Content pipeline skeleton: draft, review record, publish gate, seed CLI (no religious content authored by AI).
**Tests:** rules tests for parents and children, auth flows, PIN lockout, deletion.
**Exit:** a parent can sign up, consent, add a child, and reach an empty child home. Delete works.

## Phase 2 – Daily experience (about 4 weeks)
- Child Home, Checklist tab, detail sheet, category views.
- `completeActivity`, `decideApproval`, ledger, rollups.
- Parent approvals screen, parent notifications (approval requests).
- Star jar, daily and weekly totals.
- Time zone and day-key logic, offline queue.
**Tests:** idempotency, concurrency, approval duplicates, day boundaries.
**Exit:** reviewed starter checklist (placeholder content in dev, real content in staging) works end to end with approvals.

## Phase 3 – Islamic learning (about 4 weeks)
- Dua Corner, Learn This Dua states, audio, source chip, parent confirm.
- Short Surah learning.
- Jummah checklist and screen.
- Good Deeds, Good Manners categories, Good Deed of the Day.
**Content dependency:** verified duas, Surah texts, audio, reviewed by the reviewer panel.
**Exit:** child learns a dua and parent confirms. A Friday run works with a time zone test.

## Phase 4 – Gamification (about 3 weeks)
- Milestones engine, badges, achievements.
- Weekly challenges.
- Achievements tab.
**Exit:** milestones unlock exactly once and retroactive evaluation works.

## Phase 5 – Quizzes and games (about 6 weeks)
- Quiz engine (all formats), question bank import, quiz stars and caps.
- Game host and templates. Games in order: Dua Matching, Good Manners, Islamic Picture Matching, Arabic Alphabet, Story Sequence, then Build the Masjid, Five Pillars, Object Recognition.
**Exit:** all launch games playable with reviewed content. Anti-farming tests green.

## Phase 6 – Community and rewards (about 3–4 weeks)
- Anonymous weekly leaderboard (opt-in), ranking function, display rules.
- Monthly candidate computation, participation awards (certificates).
- Notifications (weekly report, Friday reminder).
**Gate:** legal review of competition and prize rules (D-10) before enabling prizes.

## Phase 7 – Administration (about 5 weeks)
- Web admin portal modules, RBAC, review UI with source tooling, audit log.
- Replace the seed CLI as the main route (CLI stays for bulk imports).
- Reward management.
**Note:** if content volume grows before this phase, bring the review UI forward. The CLI is a stopgap.

## Phase 8 – Testing and launch (about 4–5 weeks)
- Full test passes (unit, UI, security, accessibility, performance).
- External penetration test, content audit, privacy review, DPIA if needed.
- TestFlight beta, App Store assets, privacy label, Kids Category checklist.
- Submission and review response time.

## Suggested release strategy
- **MVP (end of Phase 3 plus parts of Phase 4):** checklist, duas, Jummah, stars, approvals, milestones. Enough to test the core habit loop with families.
- **v1.0 (end of Phase 8):** includes quizzes, games, leaderboard and monthly recognition.
This ordering lets families use the app earlier. Confirm in D-12. The roadmap order from the master prompt is preserved, only the release point is a proposal.

## Dependencies on content (critical path)
Content is usually the real bottleneck. Start now:
1. Name the policy owner and reviewers.
2. Prepare the source registry (Quran edition, translations, Hadith collections and numbering systems).
3. Commission or choose illustrations and audio (reciter rights).
4. Draft initial sets: about 30 activities, 12 duas, 3 Surahs, 60 quiz questions, 8 game packs.

## Milestone acceptance
Each milestone uses the definition of done in `TESTING.md` §7, and a demo to the product owner before the next one starts.
