# DeenStars – Quiz Engine Specification

Status: DRAFT for approval. Version 0.1.

## 1. Goals
- Remotely managed question bank. New quizzes ship without an App Store release.
- Precise, reviewed wording (see `ISLAMIC_CONTENT_POLICY.md`).
- Age-specific presentation. Gentle feedback. No timers, lives or penalties.
- Participation-based, capped stars. Answers are visible to the client, so correctness is not used to award stars (AD-5).

## 2. Categories
`prophets`, `manners`, `fivePillars`, `quranBasics`, `masjidSalah`, `dailyDuas`, `greetings`, `goodDeeds`, `ramadanEid`, `generalKnowledge`.

## 3. Formats (question types)

| Type | Rendering | Ages |
|---|---|---|
| `pictureChoice` | Question with image options | 3–4, 5, 6 |
| `audioChoice` | Narrated question, picture or text options | 3–4, 5, 6 |
| `matching` | Pair left items with right items (tap, tap) | 5, 6 (simplified 3 pairs for 3–4 optional) |
| `dragDrop` | Drag item to target. Tap alternative required | 5, 6 |
| `trueFalse` | Statement with True or False | 6 only |
| `scenario` | Short illustrated situation, choose the kind or correct action | 5 (simple), 6 |

### Age rules (validated at publish)

| Age group | Options | Reading | Allowed types |
|---|---|---|---|
| 3–4 | 2–3 | None required. Audio narration required | pictureChoice, audioChoice |
| 5 | 3–4 | Minimal | pictureChoice, audioChoice, matching, dragDrop, scenario |
| 6 | 4 (true/false has 2) | Short sentences | All types |

## 4. Data model

### `quizQuestions/{questionId}` (published, read-only)

```json
{
  "questionId": "q_prophets_0012",
  "contentRecordId": "cr_...",
  "type": "pictureChoice",
  "category": "prophets",
  "ageGroups": ["5", "6"],
  "difficulty": 1,
  "prompt": { "en": "Who is the last Prophet and Messenger of Allah?" },
  "promptAudioPath": "content/audio/q_prophets_0012_prompt.m4a",
  "illustrationPath": "content/img/q_prophets_0012.png",
  "illustrationAlt": { "en": "A crescent moon and a star over a masjid" },
  "options": [
    { "id": "a", "text": { "en": "Prophet Muhammad ﷺ" }, "isCorrect": true },
    { "id": "b", "text": { "en": "…" }, "isCorrect": false }
  ],
  "correctOptionIds": ["a"],
  "explanation": { "en": "Allah sent many Prophets to guide humanity. Prophet Muhammad ﷺ is the final Prophet and Messenger." },
  "explanationAudioPath": "…",
  "source": { "type": "quran", "surahNumber": 33, "surahName": "Al-Ahzab", "ayahStart": 40, "ayahEnd": 40 },
  "version": 3,
  "status": "approved",
  "publishedAt": "…"
}
```

For `matching`: `pairs: [{leftId, rightId, leftContent, rightContent}]`. For `dragDrop`: `items`, `targets`, `correctMap`. For `scenario`: same as choice, with `scenarioIllustration`. Distractors for religious questions must not themselves be false religious statements shown as plausible fact when avoidable. They are reviewed like the answers.

Note the wording example in the prompt. Questions must be self-contained, unambiguous, and must not imply there is only one Prophet.

### `quizzes/{quizId}`
`{title, category, ageGroups, difficulty, questionIds[] or selectionRule{count, category, difficulty}, illustrationPath, estimatedMinutes, status, version}`.
Selection rules allow a daily-rotating quiz from the bank. The selection is made server-side per attempt start, using the child's age group, avoiding questions seen in the last 14 days.

### `children/{id}/quizAttempts/{attemptId}` (see schema).

## 5. Flow and server validation

```
App: startQuiz(childId, quizId)  ──► Function creates attempt {attemptId, questionIds, startedAt, nonce}
App: shows questions, records selections locally for immediate feedback
App: submitQuizAttempt(attemptId, answers[], clientRequestId) ──►
     Function: verify owner, attempt open, questionIds match, answers well-formed,
     compute correctCount from the stored question versions,
     check minimum plausible duration, apply daily cap,
     in one transaction write attempt result + starTransaction (deterministic id) + rollups.
```

- Attempt IDs are server-created. A given attempt can be completed once (idempotent replays return the same result).
- The function stores the question **versions** shown, so later edits do not rewrite history.
- Gentle failure: if validation fails, the child still sees the normal finish screen and 0 stars. The reason is logged for the parent report, not shown to the child.

## 6. Scoring and stars

| Item | Value (configurable in `appConfiguration/rewards`) |
|---|---|
| Quiz completion | 3 stars for finishing, whatever the number of correct answers |
| Optional learning bonus | +1 star when the child plays a quiz in a category they have not played in the last 7 days (promotes variety) |
| Daily quiz star cap | 9 stars/day |
| Leaderboard contribution | Quiz and game stars together count up to a weekly cap (see `REWARDS.md` §8.2) |
| Repeat of the same quiz same day | 0 stars after the first completion that day |

Correctness is tracked for parent reports ("Strong topics", "Topics to explore together"), not for stars.

## 7. UX behaviour

- Progress dots, not a timer.
- Option tap → immediate feedback: correct = star sparkle and "Yes!". Incorrect = soft "Good try!" and the correct answer is highlighted, so the child learns.
- The explanation appears after every question, with audio. A source chip appears for parents (gated).
- Questions: 5 per quiz for age 5 and 6, 3–4 for age 3–4.
- "Read to me" replays audio. Auto-play of the prompt on show.
- Option order is shuffled per attempt. Answers positions are randomised by the app using the `options` list.
- Drag and drop and matching have tap alternatives for accessibility and for small children.
- Never reveal that content is "wrong" in a shaming way. Never show a score as a grade ("2/5"). Show stars and "You learned 5 new things".

## 8. Authoring checks (publish gate)

See `ISLAMIC_CONTENT_POLICY.md` §7. Quiz-specific:
- At least one correct option. Exactly one for single-choice types.
- Options count matches age rules.
- No duplicate options after normalisation.
- Prompt does not end with an ambiguous pronoun reference ("our Prophet").
- Explanation and source are present.
- Audio prompt exists for ages 3–4.
- Duplicate or near-duplicate detection using normalised text and similarity score.
- Question has an illustration alt text.

## 9. Client implementation notes

- `QuizSession` (`@Observable`) holds state: `idle → loading → question(i) → feedback(i) → finished`.
- `QuestionRenderer` registry maps `type` → SwiftUI view. Unknown types are skipped and the question is dropped from the session (forward compatibility with older app versions). Questions carry `minAppVersion` for new types.
- The client caches approved questions by category and age group for offline play. Offline attempts are queued, then validated on sync. Stars are awarded only after validation.
