# Website improvements log

Scope: `responsive-web/` only. Items are delivered one at a time. Each entry lists architecture, schema, routes and migration steps.

## 4. Dua Corner (done)

**UX.** `/duas` is a landing page: search, Recently viewed, Favourites, and groups (Morning, Evening, Daily Life, Food & Drink, Travel, Sleep, plus Duas from the Quran, which already had content). Every group opens its own page. A group with no reviewed duas yet (Evening, Travel) shows "Coming soon" and a way back, so no card is a dead end. The nav label is now "Dua Corner".

**Before eating.** Shows "In the name of Allah." with the short Arabic. "If you forget at the start" expands to the second text. The long narration, its transliteration and its audio are not shown next to the short version, because the recording is of the long text.

**Content.** The two Arabic and translation texts were supplied by the project owner and are treated as reviewer-approved by the owner's decision (see `.kiro/steering/scope-responsive-web.md`). They live in `functions/src/seed/packs/dua-overrides.json`, not in app code. No other Arabic or religious text was written. A named reviewer must still be recorded before publish.

**Routes.**
| Route | Change |
|---|---|
| `/duas` | now the landing page |
| `/duas/category/<group>` | added |
| `/duas/<slug>` | unchanged |

`App.tsx` now passes everything after the section as the item (`category/morning`).

**Schema.** `duaLibrary/{id}` gains two optional fields: `concise {arabic, translation}` and `ifForgotten {label, arabic, translation}`, plus `conciseProvenance`. No rules change (client read-only). No index change.

**Device-only data.** Favourites and recents are stored in `localStorage` (`ds_dua_fav`, `ds_dua_recent`, up to 6 recents). Nothing is sent to the server, so no new child data field is collected.

**Migration.** Re-seed `duaLibrary` so `dua_before_eating` gets the new fields: emulator `node functions/scripts/seed-emulator.mjs`; dev project, run the project's content import. Old clients keep working because the fields are optional.

**Tests.** `npm test` (`test/dua-corner.test.ts`: favourites, recents cap, every dua in exactly one group, before-eating texts). Browser: `node qa/dua-corner.mjs` (54 checks at 360, 768 and 1440 px).
## 7. Play & Learn: levels, Find the Mosque, Today's Islamic Challenge (done)

**UX.** `/play` has no age picker or age grouping. A player level (Level 1, 2, 3, 4, Expert) rises with finished games: 3, 8, 15 and 25 games. It never goes down. The menu shows: player level, Today's Islamic Challenge (with an active streak), the games with level pickers, "Earlier challenges" (last 7 days), and coming-soon cards.

**Find the Mosque.** Tap the masjid among pictures. Levels: Level 1 (3 pictures, 3 rounds), Level 2 (4, 3), Level 3 (6, 4), Level 4 (9, 4), Expert (12, 5). A level opens when the one before it is finished. A wrong tap fades that picture. After two wrong taps the masjid glows. Nothing is timed or deducted. One in-game star per round, never reduced by wrong taps.

**Today's Islamic Challenge.** One available game per day, chosen by `days since 2024-01-01 mod number of daily games`, so it is the same for everyone on a day with no server. The archive shows the last 7 days and can be replayed. A replay is marked "later" and does not extend the streak. The streak counts days finished on the day. It stays visible until the end of the next day and is hidden when no run is active, so a broken run is never shown. Missed days show no failure state.

**Adding a game.** Add an entry to `src/games/catalog.ts` and a view in `Play.tsx`. Entries with `status: "soon"` render as coming-soon cards and are never the daily game. Registered but not built: Good Deeds Collector, Journey to the Masjid, Ramadan Lantern Quest, Kindness Adventure. For these, collecting good deeds must use gentle feedback with no deductions or failure screens.

**Data.** Progress is stored on the device only, in `localStorage` key `ds_play_v1_<childId>` (`completions`, `mosqueFinished`, `daily`). Nothing is sent to a server and no schema, rules or index changes are needed. Existing keys for quiz and matching are unchanged.

**Routes.** None added or removed. `/play` no longer shows the age bar. The `ds_guest_age` choice still applies to Stories until item 5.

**Open items (not done yet).**
- *Account stars.* Stars in Find the Mosque are shown in the game only. Adding them to the star ledger needs a server function (`completeGame`: Firestore transaction, deterministic ledger id, `clientRequestId`, daily cap) with emulator tests, as the product rules require.
- *Content source.* Game config and the sample quiz are in code, as before. The rules say content and star values should come from Firestore (`games`, `gameContent`, `appConfiguration`). That move is not done yet.
- *Day key.* The daily challenge uses the browser's time zone. The rules say reward day logic is server-side, so this must move to the server when rewards are added.

**Tests.** `test/play-learn.test.ts` (23 tests: levels, rounds always have one masjid, unlock rules, deterministic daily game, streak shown only while active, replays do not extend it). Browser: `node qa/play.mjs` (89 checks at 360, 768 and 1440 px, including finishing the daily challenge with a fixed clock).