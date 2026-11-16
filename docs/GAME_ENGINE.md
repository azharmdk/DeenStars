# DeenStars – Game Engine Architecture

Status: DRAFT for approval. Version 0.1.

## 1. Goals
- Eight launch games, each 1–3 minutes, meaningful and calm.
- Add new **content** for existing games remotely.
- Add new **game mechanics** through app releases. App Store rules do not allow downloading executable code that changes app behaviour, so "new games remotely" means new content, new levels and new configurations of existing templates, not new code. Decision D-11 records this.
- No countdowns, no lives, no punishment, no gambling mechanics, no random or paid rewards.

## 2. Architecture

```
games/{gameId}            config: template, ageGroups, levels, ui strings, minAppVersion, reward rule
gameContent/{contentId}   content packs: items, pairs, sequences, letters, scenes (reviewed religious content)

iOS:
 GameCatalogRepository ─► GameRegistry[template → GameFactory]
 GameHost (SwiftUI)  ─► GameSession (@Observable, protocol-driven)
                         ├─ GameTemplate protocol (DragDrop, Match, Sequence, Pick, Letters …)
                         ├─ AudioCoordinator
                         ├─ FeedbackPresenter (gentle success and retry)
                         └─ ResultReporter ─► Cloud Function submitGameResult
```

### Template protocol

```swift
protocol GameTemplate {
    associatedtype Config: Decodable
    associatedtype Content: Decodable
    func makeSession(config: Config, content: Content, level: GameLevel, age: AgeGroup) -> any GameSession
}

protocol GameSession: Observable {
    var progress: GameProgress { get }      // 0...1, no time pressure
    func handle(_ input: GameInput)          // tap, drag, select
    var result: GameResult? { get }          // set when finished
}
```

### Templates and the eight games

| # | Game | Template | Content |
|---|---|---|---|
| 1 | Dua Matching | `MatchPairs` (situation ↔ dua) | pairs of situation image and dua card (audio, Arabic). Each dua references `duaLibrary` |
| 2 | Islamic Picture Matching | `MemoryPairs` | illustration sets |
| 3 | Build the Masjid | `DragAssemble` | pieces, target slots, snap points |
| 4 | Arabic Alphabet Explorer | `LetterPick` | letters, sounds, example word images. Letter set verified |
| 5 | Good Manners | `ScenarioPick` | scenes with kind and respectful choices |
| 6 | Islamic Story Sequence | `Sequence` | ordered story steps. Story approved, no Prophet depiction (text, audio, symbolic scenery only) |
| 7 | Five Pillars Learning Game | `PictureAudioPick` plus `Sequence` | pillars with picture and audio |
| 8 | Islamic Object Recognition | `PictureAudioPick` | prayer mat, Quran, masjid, lantern… |

Six templates cover eight games. Each template has: age rules, input mode (tap alternative always), feedback behaviour, and a reward report.

## 3. Game config (remote)

```json
{
  "gameId": "g_dua_match",
  "template": "MatchPairs",
  "title": {"en": "Dua Matching"},
  "ageGroups": ["5","6"],
  "levels": [
     {"level": 1, "pairs": 3, "contentIds": ["gc_duamatch_1"], "ageGroups": ["5"]},
     {"level": 2, "pairs": 4, "contentIds": ["gc_duamatch_2"], "ageGroups": ["6"]}
  ],
  "minAppVersion": "1.0.0",
  "rewardRuleKey": "game_completion",
  "estimatedSeconds": 120,
  "status": "approved",
  "version": 2
}
```

Unknown `template` or higher `minAppVersion`: the game is hidden in older apps.

## 4. Behaviour rules

1. **Short sessions**: one round is 1–3 minutes, with 3–6 items.
2. **Controls**: tap, or drag with an automatic tap alternative. Large hit areas, snap-to-target assist.
3. **Audio**: instructions are spoken, prompts replayable, and sounds can be muted.
4. **Age difficulty**: number of items, distractors, reading amount. Parents can raise or lower difficulty.
5. **Feedback**: correct → sparkle and sound. Incorrect → gentle bounce back, a hint after the second try, and finally the game shows the answer and continues. No loss.
6. **No timers** and no speed scoring.
7. **Replay**: "Play again" generates a new arrangement from the content pack.
8. **Meaning**: each game has a "What we learned" card at the end (reviewed text).
9. **Accessibility**: VoiceOver can complete every game (select-and-place model), Reduce Motion alternatives.
10. **Interruptions**: pause on backgrounding. Session resumes or ends quietly.

## 5. Rewards and anti-farming

- Stars are for **completing** a round, configured in `appConfiguration/rewards` (default 2 stars for first completion of a game each day, 1 star for the second, then 0 beyond that).
- Daily cap on game stars (default 8) and per-game cap.
- Server validation: `startGame` creates a session token. `submitGameResult` validates elapsed time against a minimum plausible duration and the number of moves versus items.
- Game and quiz stars together count toward the leaderboard only up to a fixed weekly cap (default 20, see `REWARDS.md` §8.2), so replaying cannot dominate rankings.
- Repetition earns learning progress, not extra rank points.

## 6. Content review
Game content that makes a religious claim (pairs of situations and duas, story steps, pillars, letters, object names) is a **religious content item** and follows the review workflow. Game config (levels, layout) is non-religious configuration but still versioned and audited.

## 7. Assets
Images, audio and animations are stored in Firebase Storage under `content/games/{gameId}/…` with a manifest listing size and hash. The app prefetches the manifest for games the child can access, and caches with a size cap. No remote code, no web views.

## 8. Testing
- Each template has pure-logic unit tests (game rules independent from UI).
- Snapshot and accessibility tests per template.
- Content validation tests run over sample packs in CI.
- Performance target: 60 fps on iPhone 12 in all templates.
