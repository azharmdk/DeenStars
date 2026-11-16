# DeenStars – Firestore Schema

Status: DRAFT for approval. Version 0.1.

Conventions:
- Document IDs: deterministic where idempotency matters, otherwise auto-ID.
- Timestamps are Firestore `Timestamp` in UTC. Day-based logic uses `dayKey` (`yyyy-MM-dd`) and `weekKey` (`yyyy-Www`, ISO week, Monday start) computed **server-side** in the child's stored IANA time zone. Jummah uses the child's local Friday.
- `W` = writable by client. `F` = written only by Cloud Functions. `R` = readable by owning parent.
- Every content document carries `schemaVersion`. Fields are additive to keep older app versions working.
- Localisable text is stored as maps: `{ "en": "…" }` so more languages can be added later.

## 1. Collection map

```
parents/{uid}
  settings (map), consent (map)
  parentSessions/{sessionId}                  F  short-lived parent-mode sessions
  notifications/{notificationId}              F  parent-facing inbox

children/{childId}                            ownerUid = parent uid
  checklistDays/{dayKey}                      F  composed daily checklist (the "dailyChecklists")
  checklistCompletions/{completionId}         F
  parentApprovals/{approvalId}                F  (parent decides via callable)
  duaProgress/{duaId}
  surahProgress/{surahId}
  quizAttempts/{attemptId}                    F
  gameProgress/{gameId}                       F
  childMilestones/{milestoneId}               F
  childAchievements/{achievementId}           F
  challengeParticipations/{challengeId}       F
  starTransactions/{txnId}                    F  append-only ledger
  rollups/{periodKey}                         F  e.g. total, d_2025-01-31, w_2025-W05, m_2025-01

— Published content (read: any signed-in parent; write: F only) —
activities/{activityId}
duaLibrary/{duaId}
surahLibrary/{surahId}
quizzes/{quizId}
quizQuestions/{questionId}
games/{gameId}
gameContent/{contentId}
milestones/{milestoneId}
achievements/{achievementId}
weeklyChallenges/{challengeId}
badges/{badgeId}
appConfiguration/{docId}                     rewards, content versions, flags, ranking rules, consent texts

— Authoring (read/write: admin roles via callables only) —
contentDrafts/{draftId}
contentReviewRecords/{recordId}
auditLog/{entryId}
adminUsers/{uid}

— Competition —
leaderboards/{weekKey_ageGroup}/entries/{entryId}     F  anonymous snapshot rows
monthlyRewards/{monthKey}                              F  candidates, approvals
monthlyRewards/{monthKey}/awards/{awardId}             F
prizeFulfilment/{fulfilmentId}                         F  admin-only, minimal contact data held outside child docs
```

The 25 collections in the master prompt are all represented. `dailyChecklists` is `children/{childId}/checklistDays`.

## 2. Documents

### 2.1 `parents/{uid}`
| Field | Type | Notes |
|---|---|---|
| displayName | string? | Optional, for parent only |
| email | string? | Mirrors Auth, null for Apple private relay is fine |
| createdAt | ts | |
| consent | map | `{version, acceptedAt, method, appVersion}` for privacy notice and verifiable parental consent |
| settings | map | `notificationPrefs`, `weeklyReportEnabled`, `screenTimeReminderMinutes` |
| pin | map | `{hash, salt, kdf, attempts, lockedUntil}` hashed server-side (F) |
| childCount | int | F |

### 2.2 `children/{childId}`
| Field | Type | Notes |
|---|---|---|
| ownerUid | string | Parent |
| guardianUids | [string] | Reserved for co-guardian, equals `[ownerUid]` in v1 |
| nickname | string | 1–20 chars, parent-entered, never shown publicly |
| birthYear / birthMonth | int | Month and year only, minimises data |
| ageGroup | enum | `3-4`, `5`, `6`. Parent may override |
| difficulty | enum | `gentle`, `standard`, `challenge` |
| avatarId | string | From fixed set |
| timeZone | string | IANA |
| learningPrefs | map | Optional: audio-first, reading level |
| leaderboard | map | `{optIn, entryId, publicNickname, publicAvatarId, optInAt}` |
| customChecklist | map | Parent additions and hides: `{hiddenActivityIds[], parentActivityIds[]}` |
| totals | map | `{stars, milestones, duasLearned}` (F, denormalised for fast display) |
| createdAt, updatedAt | ts | |
| deletion | map? | `{requestedAt, status}` |

No photo, no real name field, no email, no address, no location.

### 2.3 `activities/{activityId}` (published)
| Field | Type |
|---|---|
| activityId | string (stable ID, e.g. `act_habit_bismillah_eat`) |
| title, description, educationalExplanation | localised string |
| category | enum `dailyHabit, salah, quran, dua, manners, goodDeed, jummah` |
| ageEligibility | `{min: 3, max: 6, ageGroups: ["3-4","5","6"]}` |
| difficultyLevels | [enum] |
| illustrationPath | Storage path |
| audioPath | Storage path? |
| starRuleKey | string (e.g. `habit_simple`, `good_deed`) resolves to `appConfiguration/rewards`. Optional `starOverride` |
| verification | enum `self`, `parent` |
| frequency | enum `daily`, `weekly`, `jummahOnly`, `once` |
| isReligiousContent | bool (true triggers review rules) |
| source | map (required when religious) see `ISLAMIC_CONTENT_POLICY.md` |
| status | `approved` (published docs are always approved) |
| version, publishedAt, contentRecordId | |
| sortOrder, tags | |

### 2.4 `children/{childId}/checklistDays/{dayKey}` (F)
`{dayKey, weekKey, isFriday, items: [{activityId, status, completionId?, starsAwarded?}], generatedAt, contentVersion}`
Status values: `todo`, `pendingApproval`, `done`, `declined`. `declined` shows to the child as "Let's try again together", not as failure, and the task can be done again that day.

### 2.5 `children/{childId}/checklistCompletions/{completionId}` (F)
`completionId` = `{activityId}_{dayKey}` (deterministic, ensures one completion per day).
`{activityId, dayKey, verification, status, requestedAt, resolvedAt?, starTxnId?, clientRequestId}`

### 2.6 `children/{childId}/parentApprovals/{approvalId}` (F)
`approvalId` = same as completionId. `{activityId, activityTitleSnapshot, requestedAt, status: pending|approved|declined|expired, decidedAt, decidedBySessionId, starTxnId}`.
Pending approvals older than 14 days become `expired` without penalty. A child can re-request.

### 2.7 `children/{childId}/starTransactions/{txnId}` (F, append-only)
`txnId` = `{ruleKey}_{sourceId}_{dayKey}` (idempotency key).
`{amount (always > 0), sourceType, sourceId, ruleKey, dayKey, weekKey, monthKey, createdAt, configVersion, leaderboardEligible: bool, cappedFrom?: int}`
No negative amounts exist. Corrections by admin use a separate `adjustment` source type with a mandatory audit entry, and are used only for bug repair.

### 2.8 `children/{childId}/rollups/{periodKey} (F)`
`{stars, byCategory: {…}, activeDays, updatedAt}` for keys `total`, `d_*`, `w_*`, `m_*`. Rebuildable from the ledger.

### 2.9 `duaLibrary/{duaId}` (published)
| Field | Notes |
|---|---|
| title, category | category enum from the prompt |
| arabicText | Verified text, with tashkeel |
| transliteration, translation | Localised string |
| translationSource | e.g. translator and edition |
| explanation, whenToRecite | Localised string |
| audioPath | Recitation file with `reciter`, `audioRights` fields |
| source | See content policy: Quran or Hadith reference objects |
| ageGroups, difficulty, sortOrder | |
| version, contentRecordId | |

### 2.10 `surahLibrary/{surahId}`
`{surahNumber, nameArabic, nameTransliterated, meaning, ayahs: [{number, arabicText, transliteration, translation}], audioPath, ageGroups, learningSteps, source, version, contentRecordId}`

### 2.11 `children/{childId}/duaProgress/{duaId}`
`{state: notStarted|learning|practising|learned|parentConfirmed, updatedAt, practiceCount, parentConfirmedAt?}`
Client may write only the transition to `learning` or `practising` through a callable. `learned` and `parentConfirmed` need the parent session.

### 2.12 `quizzes/{quizId}` and `quizQuestions/{questionId}`
Detailed in `QUIZ_ENGINE.md`. Indexed on `status`, `category`, `ageGroup`, `difficulty`.

### 2.13 `children/{childId}/quizAttempts/{attemptId}` (F)
`{quizId, quizVersion, startedAt, completedAt, answers: [{questionId, selected, correctAtTime}], correctCount, total, starsAwarded, dayKey, clientRequestId}`

### 2.14 `games/{gameId}`, `gameContent/{contentId}`, `children/{childId}/gameProgress/{gameId}`
Detailed in `GAME_ENGINE.md`. Progress holds `{plays, lastPlayedAt, bestLevel, byDay: {dayKey: {plays, starsAwarded}}}` (F).

### 2.15 `milestones/{milestoneId}` and `children/{childId}/childMilestones/{milestoneId}`
Milestone: `{title, description, illustrationPath, category, badgeId, conditions: {type, params}, starReward?, ageGroups, status, version}`.
Condition types: `count_events` (event type and count), `distinct_days`, `distinct_items`, `weekly_challenge_complete`, `total_stars`, `friday_checklist_complete`. Evaluated only in Cloud Functions.
Child record: `{milestoneId, achievedAt, badgeId, starsAwarded, milestoneVersion}`.

### 2.16 `achievements/{achievementId}` and `childAchievements`
Achievements are weekly or seasonal recognitions such as Jummah Hero of the week. Same shape as milestones, plus `periodKey`.

### 2.17 `weeklyChallenges/{challengeId}` and `challengeParticipations`
Challenge: `{title, description, illustrationPath, ageGroups, startDate, endDate, activityIds[], completionRule: {type: all|atLeast, count}, starReward, badgeId, status, version}`.
Participation (F): `{challengeId, progress: {activityId: dayKey}, completedAt?, starTxnId?}`.

### 2.18 `leaderboards/{weekKey}_{ageGroup}/entries/{entryId}` (F)
`{rank, publicNickname, publicAvatarId, weeklyStars, achievementBadgeIds[], activeDays, updatedAt}`
`entryId` is random and held only on the child doc. It does not encode childId. The entry holds no childId.
Header doc `leaderboards/{weekKey}_{ageGroup}`: `{status: live|final, rulesVersion, computedAt, participantCount}`.

### 2.19 `monthlyRewards/{monthKey}` (F, admin)
`{status: candidates|underReview|approved|published, categories: {category: [{childRef (admin-only), score, flags[]}]}, reviewedBy, publishedAt}`. Public publication shows only the anonymous nickname and avatar.
`prizeFulfilment` records prize type, parental consent reference, shipped date, and holds delivery details only for the duration needed, then is purged.

### 2.20 `parents/{uid}/notifications/{id}` (F)
`{type, title, body, createdAt, readAt?, deepLink}` Parent-facing only. There are no child notifications.

### 2.21 `appConfiguration/*`
- `rewards`: `{configVersion, rules: {ruleKey: {stars, dailyCap?, perItemPerDay: 1}}, quizDailyCap, gameDailyCap, leaderboard: {weeklyGameQuizCap: 20, parentCustomLeaderboardEligible: false}}`
- `content`: `{versions: {activities: 12, duas: 5, …}}`
- `ranking`: `{rulesVersion, tieBreakers: […], humanReadable: {en: "…"}}`
- `consent`: `{currentVersion, texts}`
- `flags`: feature flags, minimum app version.

### 2.22 `contentDrafts`, `contentReviewRecords`, `auditLog`, `adminUsers`
See `ADMIN_PORTAL.md`. `contentReviewRecords/{id}` fields: `contentId, contentType, version, status, reviewerUid, reviewedAt, sourceChecked: bool, notes, sourceSnapshotHash`.

## 3. Index plan (initial)

| Collection | Fields |
|---|---|
| activities | `category, ageEligibility.ageGroups (array-contains), sortOrder` |
| quizQuestions | `status, category, ageGroups (array-contains), difficulty` |
| quizzes | `category, ageGroups (array-contains)` |
| duaLibrary | `category, ageGroups (array-contains), sortOrder` |
| children (collection group) | `ownerUid` |
| starTransactions (collection group) | `weekKey, leaderboardEligible`, `monthKey` |
| parentApprovals (collection group) | `status, requestedAt` |
| weeklyChallenges | `status, startDate, endDate` |
| leaderboards/*/entries | `rank` |

Add composite indexes only when a query needs them, kept in `firestore.indexes.json`.

## 4. Atomicity and idempotency

- Every reward write is one Firestore transaction touching: the source doc (completion/attempt), the ledger doc (deterministic ID), and rollup docs.
- Callables take `clientRequestId`. Replays return the stored result.
- The deterministic ledger ID is the final guard. `create()` fails if the ID exists.
- Approval: the transaction reads `parentApprovals/{id}`, requires `status == pending`, and sets the new status and the ledger doc together.

## 5. Security rules strategy

See `AUTH_SECURITY.md` §6 for the rules matrix. Principle: deny by default, clients read their own data and published content, clients write almost nothing directly. Direct client writes are limited to non-sensitive parent profile settings and some `children` fields through validated callables instead.

## 6. Deletion

`deleteChildProfile` recursively deletes `children/{childId}` and all subcollections, removes the leaderboard entry, removes Storage objects tied to the child (none expected), and anonymises or removes mentions in `monthlyRewards` candidates. Records legally required (for example prize fulfilment) are kept only as long as needed. Details in `CHILD_SAFETY.md`.
