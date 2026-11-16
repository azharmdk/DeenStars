---
inclusion: always
---

# DeenStars product rules

DeenStars is an iOS (SwiftUI) Islamic early-learning app for children aged 3–6, owned by a parent, backed by Firebase. Full specs are in `docs/`. Read the relevant doc before changing a feature.

## Workflow
- The architecture and UI direction must be approved before application code is written. Check `docs/OPEN_QUESTIONS_AND_RISKS.md` for decision status.
- Implement one milestone at a time (`docs/ROADMAP.md`). Test it before starting the next. Update docs when behaviour changes.
- Do not add features or change finalised product decisions without discussing it first.

## Non-negotiable product rules
- Never deduct stars. No streak penalties, no guilt messaging, no punishment in games or quizzes.
- Stars, approvals, milestones, leaderboard rows and published content are written only by Cloud Functions or admin tools. Clients never write them.
- Reward writes are idempotent: deterministic ledger IDs, Firestore transactions, `clientRequestId`.
- Do not hardcode religious content, checklist tasks, star values, quiz questions or milestone rules in the app. They come from Firestore content and `appConfiguration`.
- Quiz and game stars are participation-based and capped. Repetition must not dominate leaderboards.
- Leaderboard is opt-in, anonymous, calculated by Cloud Functions. Child-to-child communication does not exist.
- Parent-only areas need the parental gate and a server-verified parent session.
- Missed activities show no failure state.
- Do not imply a child's religious worth depends on stars, milestones or rank.

## Tone for child-facing copy
Short, warm, positive. Simple words. Audio for ages 3–4. No red error screens.
