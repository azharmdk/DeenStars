# Tasks: Content fixes and growth features (review of 2026-11-17)

Legend: [x] done and verified locally, [ ] not started, [?] blocked on a decision (see bottom).
Nothing in this file is deployed yet (decision D2).

## M1 Fix 1: quiz scoring
- [x] Score counts correct answers; "You got N out of M right!"; "You learned N new things" from correct answers; no overlay on results.

## M2 Fix 2: content accuracy
- [x] 2.1 21:87 transliteration from Quran.com (documented exception).
- [x] 2.2 Story cards show the reader's page count.
- [x] 2.3 Verse references in Quran order.
- [x] 2.4 Dua transliterations imported from hisnmuslim.com.
- [?] 2.4b Sleeping dua word order is in the hisnmuslim.com source (D1).
- [x] 2.5 All Quran translations: Talal Itani, ClearQuran Allah Edition (licence checked), credited.
- [x] 2.6 Approvals sentence rewritten.
- [x] 2.7 Bismillah on its own line.
- [x] 2.8 Hidden byte-order mark removed from 1:1. Arabic otherwise unchanged (0 of 69 ayahs, 0 of 14 duas).

## M3 Fix 3
- [x] 3.1 Star history (Stars page, parent report).
- [x] 3.2 Day streak and badges, server-side; ledger now stores category. Rule used pending D3.
- [x] 3.3 Labelled chart.
- [x] 3.4 Spinners and double-tap guard on all save buttons.
- [x] 3.5 Smaller matching cards; story caption below the picture.

## M4 Printables
- [x] 4.1 Printables in the parent area, list-only tile on child Home, public /printables with no sign-in.
- [x] 4.2 Four PDFs (bedtime dua chart, salah tracker, good deeds chart, Ramadan countdown), colour and black and white, A4, one page each. Arabic shaped by Edge; text from the data packs.
- [?] 4.3 99 Names colouring sheet (D4). Placeholder only, not listed.
- [x] 4.4 Pack model with `isPaid`; paid packs hidden; no payment step anywhere.

## M5 Sponsor banners
- [x] Server-side curated `sponsors` list (rules: signed-in read, no client writes; rules tests).
- [x] Parent Overview only; removed from the public home page and the old Partners page.
- [x] Static png/jpg/webp only, "Sponsored" label, new tab, campaign tags without identifiers, disclosure.
- [x] Guards: import boundary, no ad-network or tracking code, no video or animation.

## M6 Games
- [x] 6a.1 Quiz levels Gentle 4 / Standard 6 / Challenge 8, from the child's difficulty, next level unlocks. Questions 5-8 are AI-drafted samples (tagged in code) for the reviewer.
- [x] 6a.2 Matching levels 4 / 6 / 8 pairs, best time per level on the device.
- [x] 6a.3 "New game unlocked: Super Matching" at a 7-day streak (server longest run).
- [x] 6a.4 No public scores, no ranking; family-only (device-local).
- [?] 6b Daily puzzle for parents (D5, D6). Not started: every clue is religious content that must come from a reviewed bank, and the family board needs a data decision.

## Technical notes
- [x] Shareable URLs for every dua, surah, story and printable; signed-in parents can open shared links.
- [x] Add to Home Screen prompt (native, iOS instructions, in-app browser hint); grown-up pages only.
- [x] `functions/.gitignore` no longer hides `functions/src/lib/` (core server code was untracked).

## Verification (local emulators, throwaway test account)
- Browser: fix3 34, fixes 120, guest 73, layout 97, sponsors 70, enhancements 94 checks, phone and desktop widths, all passing.
- Unit and server: website 37, functions unit 50, rules 16, integration 26, all passing. Production build passes.

## Decisions needed
- D1 Sleeping dua translation source.
- D2 Deploy (website, functions, rules, config). Content changes also affect the old prototype's labels.
- D3 Day streak: count self-checked items, or grown-up approved only.
- D4 99 Names sheet: source list and reviewer sign-off on the format.
- D5 Who authors quiz and puzzle content.
- D6 Family puzzle board: who the members are and what is stored about them.
