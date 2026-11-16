# DeenStars – Stars, Milestones, Challenges, Leaderboards and Monthly Recognition

Status: DRAFT for approval. Version 0.1. All numbers are starting values. They live in `appConfiguration/rewards` and can be changed without an app release.

## 1. Principles

1. Stars celebrate effort and learning. They are never removed.
2. No streak penalties. "Seven Days of Learning" counts days with activity in a rolling count of any seven days, not seven consecutive days, so a missed day never resets progress.
3. The server awards everything. The app displays.
4. Repetition does not inflate rank. Each source rewards once per day, or is capped.
5. Rules are published and understandable by a parent.

## 2. Star rules (initial)

| `ruleKey` | Applies to | Stars | Limit |
|---|---|---|---|
| `habit_simple` | Simple daily habit | 2 | once per activity per day |
| `manners` | Good manners | 3 | once per activity per day |
| `good_deed` | Good deed (parent-approved) | 5 | once per activity per day |
| `dua_learning` | Dua moves to `learned` for the first time | 5 | once per dua per child (ever) |
| `dua_practice` | Daily dua practice | 1 | once per dua per day, max 3 per day |
| `jummah_challenge` | Jummah checklist complete | 10 | once per Friday |
| `weekly_challenge` | Weekly challenge complete | 10–15 | once per challenge |
| `quiz_completion` | Finishing a quiz | 3 | once per quiz per day, daily cap 9 |
| `game_completion` | Finishing a game round | 2 for the first completion of each game per day, 1 for the second, then 0 | daily cap 8 |
| `milestone_bonus` | Optional per milestone | per milestone | once ever |
| `surah_step` | Surah learning step | 2 | once per step per child |

Config shape:

```json
{ "configVersion": 7,
  "rules": { "habit_simple": {"stars": 2, "perSourcePerDay": 1},
             "quiz_completion": {"stars": 3, "perSourcePerDay": 1, "dailyCap": 9} },
  "leaderboard": { "weeklyGameQuizCap": 20, "parentCustomTaskStars": 1, "parentCustomLeaderboardEligible": false } }
```

Each `starTransaction` stores `configVersion` and the `ruleKey` so that later changes never rewrite history.

Per-activity override: an `activity` may set `starRuleKey`, or `starOverride` (reviewed in the admin portal, bounded by min and max of the config).

Parent-added custom tasks: stars limited to the configured amount and **not leaderboard eligible**, so a parent cannot inflate a child's ranking by inventing tasks.

## 3. Totals

Computed from the ledger and stored as rollups:
- Total, daily (`d_`), weekly (`w_`), monthly (`m_`). Weeks start Monday in the child's time zone, months by calendar month in that time zone.
- Rollups can be rebuilt from `starTransactions` at any time by an admin function.

## 4. Completion flow summary

```
completeActivity(childId, activityId, clientRequestId)
  ├─ verification == self:    transaction → completion(done) + ledger + rollups
  └─ verification == parent:  transaction → completion(pending) + approval(pending) + parent notification queued

decideApproval(approvalId, decision, parentSessionId)
  ├─ approve: transaction (requires status == pending) → approval(approved), completion(done), ledger + rollups
  └─ decline: approval(declined), completion(declined). Child sees an encouraging message.
```

Duplicate protection: the completion doc ID is `{activityId}_{dayKey}`. The ledger ID is deterministic. Approval requires `pending`. Two parents tapping at the same time resolve to one reward.

## 5. Parent-approved activities
Set per activity (`verification: "parent"`). Good deeds, helping, charity and manners tasks default to parent approval. Simple habits default to self-report. Parents can switch approval requirements down (for example "I trust Aisha, don't ask me for habits") but not remove approval from items marked `requiresParent: true` (for example charity).

Pending items expire after 14 days without penalty. Approvals are processed in batches ("Approve all for Aisha"), with each item still creating its own idempotent transaction.

## 6. Milestones

Defined remotely in `milestones`. Evaluated by Cloud Functions when a ledger entry or progress record is created.

| Category | Examples |
|---|---|
| Islamic Knowledge | Quran Explorer, Arabic Letter Explorer |
| Dua Learning | My First Dua, Five Duas Learned |
| Quran Learning | Quran Explorer (listening and Surah steps) |
| Good Manners | Kindness Champion |
| Good Deeds | My First 10 Good Deeds |
| Daily Habits | Seven Days of Learning, 30-Day Learning Milestone, Little Salah Star |
| Games and Quizzes | My First Islamic Quiz |
| Jummah | My First Jummah Checklist, Jummah Hero (weekly badge) |
| Stars | First 100 Stars |

Condition types: see `FIREBASE_SCHEMA.md` §2.15. Examples:
- My First Dua: `count_events(dua.learned, 1)`.
- Seven Days of Learning: `distinct_days(any_activity, 7)`.
- 30-Day Learning Milestone: `distinct_days(any_activity, 30)`.
- First 100 Stars: `total_stars(100)`.

Rules:
- Unlock exactly once per child (`childMilestones/{milestoneId}`), with `achievedAt`, badge, optional stars.
- Retroactive evaluation when a new milestone is published (a scheduled job runs through recent ledger data, in batches).
- Copy tone: "You earned…", never "You missed…". Locked milestones show a hint and no deadlines.
- Milestone text never says or implies a child's religious worth depends on the badge count. Parent report phrase: "Celebrating Aisha's learning journey".

## 7. Weekly challenges

Remote, scheduled (`startDate`, `endDate`), age-targeted. Completion rule: all required activities or at least N of M, each counted once per day. Stars 10–15 and a badge on completion. Participation is automatic (no sign-up). Missed challenges simply end, with no negative state. A challenge can be completed over several days, and any previous partial progress is kept for display only.

## 8. Weekly leaderboard (optional, anonymous)

### 8.1 Eligibility
- Parent opt-in per child. Parent can opt out at any time.
- Groups: ages 3–4, 5, 6 (the child's configured age group).

### 8.2 Score
Weekly stars = sum of ledger entries in the child's local week with `leaderboardEligible == true`.

Leaderboard anti-dominance rules (all in `appConfiguration/rewards.leaderboard`):
1. Quiz and game stars together count up to `weeklyGameQuizCap` (default 20) per week for ranking. Stars beyond that still go to the child's personal total and are marked `leaderboardEligible: false`.
2. Parent custom tasks are not leaderboard eligible.
3. Each source counts once per day (already true for ledger).
4. Admin-flagged suspicious activity can exclude ledger entries from the board (audited).

### 8.3 Ranking and ties
- Rank by weekly leaderboard stars, highest first.
- **Equal scores share the same rank** (for example "tied 3rd"). The next rank skips accordingly. No hidden tie-breaker for display.
- For ordering rows within a tie, the board uses the list order that is alphabetical by public nickname. This is cosmetic, and rank numbers are the same.
- The board shows the top 20 in each group and the child's own position. For small groups (fewer than 10 participants) the board is shown as "Friends this week" without numbers, to avoid discouraging children.
- Published rules text is stored in `appConfiguration/ranking` and shown in the app.

### 8.4 Display
Anonymous nickname, system avatar, weekly stars, rank, achievement badges. Nothing else. Personal progress view is always available to every child, whether or not they opted in.

### 8.5 Build process
`buildWeeklyLeaderboard` runs hourly for the current week (status `live`), and a final pass after the week ends in every time zone (status `final`, Monday 06:00 UTC plus buffer for late offline syncs, with a 48-hour correction window for offline completions before final). The Function reads ledger entries by `weekKey` and `leaderboardEligible`, builds rows and writes snapshots. Rows hold no child IDs.

## 9. Monthly recognition

Categories: DeenStars Champion, Kindness Champion, Learning Explorer, Dua Star, Participation Award.

| Category | Basis |
|---|---|
| DeenStars Champion | Top leaderboard-eligible stars of the month in the age group, among opted-in children |
| Kindness Champion | Most distinct good deed and manners activities completed (distinct items and days, not volume) |
| Learning Explorer | Variety: distinct categories, quizzes and games played across topics |
| Dua Star | Most duas moved to `learned` or confirmed by parent in the month |
| Participation Award | **Not a ranking.** Everyone who meets a consistency threshold (for example active on 12 or more days in the month) receives a certificate, whatever their rank |

Tie-breaking for winner selection (published): (1) more distinct active days, (2) more distinct categories, (3) earlier last-qualifying day. If still tied, co-winners are recognised. No random draw.

### Workflow
1. `computeMonthlyCandidates` creates a candidate list (admin-only, includes internal references).
2. Admin checks eligibility: opt-in, consent for prizes, age group, country eligibility.
3. Admin reviews suspicious flags (very high volume, uniform timing, repeated rapid completions).
4. Admin approves winners. A second admin approves publication (two-person rule).
5. Publish: public view lists anonymous nickname and avatar only.
6. Fulfilment: parent contacted by email. Parent consents to the prize terms. Delivery details are handled in `prizeFulfilment` and deleted after fulfilment.
7. Admin records distribution (`recordReward`) for audit.

Prizes: Islamic children's books, activity books, certificates, gift packages. Digital certificates are generated for everyone who earns recognition, and physical prizes are optional. The eligibility rules and terms are published (D-10 on legality).

## 10. Screen-time and healthy design

- Daily caps on game and quiz stars remove the reward for long sessions.
- Optional parent-set daily play limit and "all done for today" screen.
- Weekly reports show active days and learning topics rather than raw minutes, unless the parent enables time reporting.
- No reward for opening the app, no streak counters tied to loss, no push notifications to the child.

## 11. Edge cases

| Case | Behaviour |
|---|---|
| Child changes age group | Future checklists change. History kept. Leaderboard entry moves to the new group next build, and weekly stars carry only in the new week |
| Time zone change (travel) | Day keys follow the stored time zone. The parent can update it. Ledger entries keep their own `dayKey` |
| Offline completion synced days later | Awarded using the `dayKey` from the client request if it is within 48 hours of the server time. Otherwise it uses the sync day |
| Content unpublished after a completion | Stars stay. Completion history keeps a title snapshot |
| Rule change | Applies from the next transaction. `configVersion` stored |
| Duplicate device logins | Idempotency keys make duplicate completions no-ops |
