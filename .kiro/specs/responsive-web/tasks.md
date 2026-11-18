# Tasks: Responsive Web Port

Legend: [x] done and verified, [ ] not done, [~] done with a noted limit.
Rule: after each task `git status --short` shows only `responsive-web/` and `.kiro/specs/responsive-web/`.

## M1 Copy and baseline
- [x] 1.1 Copy `web/` to `responsive-web/` (without `node_modules`, `dist`). REQ-1.2
- [x] 1.2 `npm ci` and `npm run build` pass. Baseline JS 767 kB (199 kB gzip). REQ-2.1, 7.1
- [x] 1.3 Set Vite dev port 5174, rename service worker cache, set manifest orientation `any`. REQ-2.6, 9.2

## M2 Browser safety
- [x] 2.1 `storage.ts` safe wrapper and unit tests; replace all `localStorage` use. REQ-4.3
- [x] 2.2 Auth persistence fallback list in `firebase.ts`. REQ-4.4
- [x] 2.3 `newRequestId()` with fallback, used by `api.ts`, with unit test. REQ-4.5

## M3 Responsive shell
- [x] 3.1 `Shell` component, `TabBar` passed as `nav`, used by `ChildApp` and `ParentApp`. REQ-3.3 to 3.5
- [x] 3.2 Rewrite shell CSS: remove 520 px cap, frame, absolute tab bar; add breakpoints; sidebar at 1024 px. REQ-3.1
- [x] 3.3 List-to-card and grid rules, rail grid, sheet sizing, `.reading` class on reading screens. REQ-3.4 to 3.6, 3.11, 3.13
- [~] 3.4 `FilterBar` for the Checklist. Mobile bottom-sheet drawer not built (8 chips or fewer, they scroll). REQ-3.3 to 3.5
- [x] 3.5 Welcome, Picker and form screens centred on large screens. REQ-3.12
- [x] 3.6 Playwright layout checks at 360, 390, 768, 1024, 1440 through the emulator (97 checks pass). REQ-8.1, 8.2

## M4 Brand partner placements
- [x] 4.1 `types.ts`, `validate.ts`, `engine.ts` with unit tests (date edges, UTC, context, UTM, injection). REQ-5.8 to 5.11, 8.4
- [x] 4.2 `ads.json`, `ads.sample.json`, Vite validation plugin (fails build on bad entry or missing media). REQ-5.7, 5.8, 5.12
- [x] 4.3 Components: hero, featured card, in-feed card, disclosure, Partners page, gated link. REQ-5.4 to 5.6, 5.13 to 5.15
- [x] 4.4 Wire to `welcome`, `partners`, `parent.overview` only; Partners link in Welcome and Parent Settings. REQ-5.2
- [x] 4.5 Preview mode. REQ-5.18
- [x] 4.6 Negative tests: child-mode import boundary, disabled flag, non-allowlisted surface, third-party media. REQ-5.1 to 5.3, 8.5
- [x] 4.7 Collapse and alignment checks at 5 widths with 0, 1, 2+ ads (145 checks pass). REQ-5.19 to 5.22

## M5 Consent, hosting, docs
- [x] 5.1 Consent text and `CONSENT_VERSION`. REQ-5.23, 5.24
- [x] 5.2 `firebase.json`, `.firebaserc`, README in `responsive-web/`. REQ-2.4, 2.5, 9.3
- [x] 5.3 Suggested edits to root docs/steering written to `responsive-web/docs/SUGGESTED_DOC_EDITS.md`. REQ-5.25

## M6 Verification
- [x] 6.1 Final `npm run build`, unit tests, layout tests pass.
- [x] 6.2 Compare JS size with baseline. REQ-7.1
- [x] 6.3 Confirm `web/` and all other existing paths unchanged in git. REQ-1.9
- [~] 6.4 Emulator walkthrough at 5 widths covers Welcome, Picker, Home, Checklist (with filter), Play, Quiz, Stars, Me, Dua Corner, Stories, Parent gate, PIN and all 4 parent tabs. Not walked: story reader pages, Bedtime, Ramadan/Eid (tester tools), Picture Matching, approvals flow, child add/edit/delete. REQ-8.1
- [ ] 6.5 Phone smoke check from Instagram on the live link (needs deploy; yours to run). REQ-4.9

## M7 Website mode (added after QE feedback)
- [x] 7.1 Public website frame: header with links, mobile menu, footer; landing page with hero, features and parent sections.
- [x] 7.2 Path routes for public pages (`/duas`, `/surahs`, `/stories/<id>`, `/bedtime`, `/play`, `/signin`, `/register`, `/partners`), browser back and deep links.
- [x] 7.3 Guest mode: learning pages without an account, no saved progress, local age choice.
- [x] 7.4 `firestore.rules`: public read for `duaLibrary`, `surahLibrary`, `stories`, `appConfiguration/bedtime` (approved). Rules tests 14/14.
- [x] 7.5 Signed-in desktop navigation moved from a sidebar to a top bar.
- [x] 7.6 Suites: unit 42, rules 14, layout 97, partners 145, guest 73 checks, all passing. Deployed rules and hosting; live guest smoke test passes.