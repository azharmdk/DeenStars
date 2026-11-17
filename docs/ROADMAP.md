# DeenStars – Development Roadmap

Status: Version 0.2. Re-planned after QE round 1 and the retention requirements.

## How this roadmap works

- **Web-first, then iOS.** Each feature phase is built on the shared Firebase backend and the web prototype (PWA) first, tested with QEs, then ported to the native SwiftUI app in Phase 8. The backend (Cloud Functions, rules, schema) is the production backend and is not rebuilt.
- **One phase at a time.** Each phase ends with a tested, demoable slice and a sign-off before the next starts (`TESTING.md` §7).
- **Content runs in parallel.** Religious content (duas, stories, Surahs, seasonal items, quiz questions, audio) must be reviewed under `ISLAMIC_CONTENT_POLICY.md`. Until reviewers are named (D-8), features ship with clearly marked sample content.
- Estimates are rough effort for one developer. They are not commitments.

## Where we are

| Phase | Name | Status |
|---|---|---|
| 0 | Planning and environment | Done |
| 0.5 | Web prototype, QE round 1 | Done |
| **1** | **Daily habit loop** | **Built and deployed, waiting for QE sign-off** |
| 2 | Bedtime and learning | Planned |
| 3 | Seasonal and weekly themes | Planned. Ramadan deadline, see below |
| 4 | Rewards that go somewhere | Planned |
| 5 | Quizzes, games and stories | Planned |
| 6 | Family and notifications | Planned |
| 7 | Admin portal | Planned |
| 8 | iOS app (SwiftUI) | Planned. Needs a Mac (D-1) |
| 9 | Testing and launch | Planned |

**Ramadan deadline.** Ramadan 1448 is expected to begin around early to mid February 2027 (subject to moon sighting). For a Ramadan calendar to be live in time, Phase 3 must be finished, with its content reviewed, by mid January 2027. If Ramadan is the priority, Phase 3 can be moved ahead of Phase 2. Decide before Phase 1 ends.

---

## Phase 0 – Planning and environment (done)
- Product, architecture, schema, security, flows, design, content policy, child safety, quiz, game, rewards, admin, testing and roadmap documents.
- Kiro steering files.
- Tooling: Git, Node, JDK, Firebase CLI. GitHub repo (private). Firebase `deenstars-dev` project (US region, Blaze plan).
- Still open: decisions in `OPEN_QUESTIONS_AND_RISKS.md`, in particular D-1 (Mac), D-2 (consent method), D-4 (mascot), D-5 (business model), D-8 (content reviewers).

## Phase 0.5 – Web prototype, QE round 1 (done)
- Installable PWA at https://deenstars-dev.web.app on the real dev backend.
- Parent account (email), consent, parent PIN, parental gate, multiple children, profile picker.
- Checklist with self-reported and parent-approved items, stars awarded on the server, approvals, Jummah screen, Dua Corner layout, kindness quiz, picture matching.
- Backend: rules, reward and parent-session functions, 28 automated tests, live smoke test.
- QE fixes: hidden tester tools (`?qe=1`), PIN checking state, consent button, compact filters.
- Redesign v0.2: professional icon set, restrained palette, brand mark (`DESIGN_SYSTEM.md`).

## Phase 1 – Daily habit loop (next, about 2–3 weeks)
Goal: give parents and children a reason to open the app every day, and make the approval loop tight.
- **Today moment:** one featured item each day on Home ("Today's deed" or "Dua of the day"), so there is always one small thing to do.
- **Approval refinements:** outline star and "Waiting for grown-up" label. Approvals grouped by day with the time. Pending count on the Parent area button. Pending items expire at the end of the next day, with no stars and no failure message. Which items need approval stays as it is (selected items only).
- **Positive streaks:** per-activity runs, for example "5 days in a row". Shown only while active and celebrated at 3, 5 and 7 days. Nothing is shown when a run ends. One grace day per week, and a parent can mark yesterday's item as done (make-up). Calculated on the server from completed or approved days.
- **Weekly-first Stars page:** leads with "You earned X stars this week" and active streaks, not a live counter.
- **Optional "Did you do this together?" prompt** on about 1 in 5 approvals. Never blocks approval. Answer stored if given.
- **"Do it together" deeds:** a tag for activities meant for parent and child together (for example "Help set the table"). Shown with a family label.
- **Weekly parent report (in-app):** "This week Aya learned 2 duas and did 5 kind deeds". Positive framing, in the parent area.
- **No public ranking:** remove the planned global leaderboard from scope (product decision, see `PRD.md` §10).
**Tests:** streak calculation (grace day, make-up, time zones), expiry job, approval grouping, report numbers match the ledger.
**Exit:** a family can use the app daily, and the parent sees a weekly summary.

## Phase 2 – Bedtime and learning (about 3–4 weeks)
Goal: own the five minutes before sleep, and make learning real.
- **Bedtime mode:** a calm, dim, audio-led wind-down. One short story and the bedtime dua. Large controls, no stars pressure, auto-ends.
- **Dua Corner, real version:** reviewed duas with Arabic, transliteration, translation, source and recorded audio. Learning progress saved on the server. Parent confirms "learned".
- **Short Surah learning** with recorded audio, step by step.
- **Audio for everything** a 3–6 year old needs: prompts, task titles, stories and duas. Quran and duas use recorded, licensed recitation, never text-to-speech.
- **Printable moments (first set):** a certificate when a child learns their first dua.
**Content dependency:** reviewed duas, Surahs, bedtime stories and licensed audio.
**Exit:** a child can do the bedtime routine end to end with real, reviewed content.

## Phase 3 – Seasonal and weekly themes (about 3 weeks, Ramadan deadline)
Goal: give families built-in moments to return for.
- **Ramadan calendar:** a 30-day countdown and challenge, one small activity a day, with a celebration at the end. Dates scheduled by an admin, not calculated, because moon sighting differs by community.
- **Eid celebration week.**
- **Jummah special:** a refreshed Friday experience each week (builds on the existing Jummah screen).
- **Weekly themes:** kindness, gratitude, honesty and others. Each theme has its own deeds and a themed look. Built on weekly challenges.
- **Seasonal scheduling tool** (CLI until the admin portal exists).
**Content dependency:** reviewed Ramadan, Eid and theme content.
**Exit:** a scheduled Ramadan run and a weekly theme work end to end in the dev project.

## Phase 4 – Rewards that go somewhere (about 3–4 weeks)
Goal: turn stars into something a child can see grow.
- **Milestones and badges engine** (server-side, unlock once).
- **Consistency badges** against the child's own past, for example "Kindness Week" (good deeds on 7 days within a week), "First dua learned", "Helped set the table 5 times".
- **Star garden or masjid:** a picture that grows as the child's lifetime stars grow. Stars are never spent or deducted, so unlocks follow lifetime totals.
- **Unlockable extras** at known star milestones, for example new mascot outfits. No random rewards.
- **Mascot** that greets the child by name and reacts to streaks (needs commissioned art, D-4).
- **Shareable and printable cards:** badges and a "Star of the Week" card. Sharing happens from the parent area only, behind the gate, with nickname only.
- **Community total:** "All DeenStars kids did 10,000 kind deeds this week". Aggregate counts only, no names or ages.
**Exit:** badges unlock exactly once, the garden reflects lifetime stars, and the community total contains no personal data.

## Phase 5 – Quizzes, games and stories (about 5–6 weeks)
- Quiz engine with all formats, question bank, server-awarded participation stars with caps.
- Game templates and the remaining games: Dua Matching, Good Manners, Arabic Alphabet, Story Sequence, Build the Masjid, Five Pillars, Object Recognition.
- **Growing story:** one short Prophet story a week, unlocking the next chapter. No depiction of any Prophet, sourced and reviewed under the content policy, established facts kept distinct from traditions.
**Content dependency:** reviewed questions, game content and stories.
**Exit:** launch games playable with reviewed content, anti-farming tests green.

## Phase 6 – Family and notifications (about 3 weeks)
- **Family challenge:** a shared goal for the whole family ("Can our family do 20 kind deeds this week?") with a shared reward. Collective, not ranked.
- **Notifications to parents:** weekly report by push or email, approval reminders, Friday and Ramadan reminders. Parent-controlled, quiet hours.
- **On hold (decision pending):** family leaderboard, monthly awards and prizes, grandparents' cheers (see Parked below).

## Phase 7 – Admin portal (about 5 weeks)
- Web admin portal: content editing, review workflow with source tooling, scheduling for seasonal content and weekly themes, star configuration, audit log, roles.
- Replaces the seed and scheduling CLIs as the main route.

## Phase 8 – iOS app, SwiftUI (about 8–10 weeks, needs a Mac)
- Xcode workspace, design system in SwiftUI, Sign in with Apple, App Attest.
- Port all screens built in Phases 1–6 against the same backend.
- Native audio, haptics and accessibility (VoiceOver, Dynamic Type).

## Phase 9 – Testing and launch (about 4–5 weeks)
- Full test passes: unit, UI, security, accessibility, performance.
- Turn on email verification and App Check enforcement. Remove dev-only tools.
- External penetration test, content audit, privacy and legal review, DPIA if needed.
- TestFlight beta, App Store assets, privacy label, Kids Category checklist, submission.

---

## Parked (on hold until you decide)
| Item | Why parked |
|---|---|
| Family leaderboard (siblings) | Your decision to hold. Concern: older siblings usually win |
| Monthly awards and prizes | Your decision to hold. Needs legal review (D-10) and a new basis now that public ranking is out |
| Grandparents send a star or voice cheer | Cross-account sharing and voice recordings need a privacy review (`CHILD_SAFETY.md` excludes voice). Stars must stay earned, so a grandparent "cheer" would not add stars |
| Cousins in a family board | Cross-account consent needed |

## Not adopted (conflicts with agreed rules)
| Suggestion | Conflict | Alternative in scope |
|---|---|---|
| Mystery box, surprise bonus stars on random days, variable rewards | Master spec §12 bans gambling-style mechanics. `CHILD_SAFETY.md` bans dark patterns. Apple Kids Category and the UK Age Appropriate Design Code discourage compulsive design for children | Predictable surprises: a daily featured deed revealed with a small animation, unlocks at known milestones |
| Spending stars | Product rule: stars are never deducted | Garden and unlocks follow lifetime stars |

## Content work (parallel track, critical path)
1. Name the content policy owner and at least two reviewers (D-8).
2. Prepare the source registry (Quran edition, translations, Hadith collections).
3. Commission illustration, mascot and audio (reciter and voice rights).
4. Draft and review, in phase order: Phase 1 daily items and "Dua of the day" pool; Phase 2 bedtime stories, duas, Surahs; Phase 3 Ramadan and Eid set, weekly themes; Phase 5 quiz questions and Prophet stories.
