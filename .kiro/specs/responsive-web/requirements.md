# Requirements: Responsive Web Port of DeenStars

Status: DRAFT v2. Decisions from review applied (section 2). No open decisions. Waiting for your check of the feature inventory (section 4) before design and tasks.
Spec folder: `.kiro/specs/responsive-web/`
Target code folder: `/responsive-web` (new, does not exist yet)

## 1. Introduction

DeenStars today has a working React 18 + Vite + TypeScript web prototype in `web/`. It talks to Firebase project `deenstars-dev` (Auth, Firestore, Cloud Functions). The iOS app is still in planning, so the web prototype is the only running application.

This spec covers three things:

1. Copy the whole `web/` app into `/responsive-web` with no loss of behaviour.
2. Replace the fixed phone-width shell with a fluid layout from 360 px to 1440 px and wider.
3. Add a configurable sponsorship placement system (hero, featured card, in-feed card).

### 1.1 Hard constraint

No file outside `/responsive-web` and `.kiro/specs/responsive-web/` is created, modified, renamed or deleted. That includes `web/`, `functions/`, `docs/`, `firebase.json`, `firestore.rules`, `.kiro/steering/` and `qa/`. Verification: after every task, `git status --short` lists only paths under those two folders.

### 1.2 Audit findings that shape this spec

| # | Finding | Effect on this spec |
|---|---|---|
| A1 | The "existing application" is `web/` (about 30 source files, 52 art PNGs, 60 MP3s). `functions/`, `firestore.rules` and the seed content are the backend it uses. | Only `web/` is copied. The backend is shared and unchanged (REQ-1.4). |
| A2 | The shell is a phone-width frame: `.app { max-width: 520px }`, a rounded "phone" frame at 760 px and up, a fixed bottom tab bar capped at 520 px, bottom sheets capped at 480 to 520 px (`web/src/styles.css`). | Replaced in REQ-3. |
| A3 | The app has no directory, no text search, and no sponsor concept. Filtering is limited to the Checklist category pills and the automatic age-based selection in `activitiesForChild`. | Search and directory-style grids are not "existing features". See OQ-3 and OQ-4. |
| A4 | There are only about two screens that look like card grids today: the 2-column Explore tiles and the 2-column Picker/Play tiles. Most content is vertical lists and horizontal rails. | REQ-3 defines how lists and rails become grids without changing their content or order. |
| A5 | **Project rules prohibit advertising to children.** `.kiro/steering/child-safety.md` says "No advertising", `docs/CHILD_SAFETY.md` §37 says "No behavioural advertising", `docs/PRD.md` says "no third-party advertising SDKs", and the in-app consent screen tells parents "No ads". | Resolved: no ads. REQ-5 covers creator-reviewed brand deals on adult pages only. |
| A6 | The same rules require a parental gate for any external link and require asking before adding a network host. | REQ-5 requires the existing gate before outbound clicks and self-hosted media. |

## 2. Decisions

### 2.1 Resolved

| ID | Decision | Effect |
|---|---|---|
| OQ-1 | There are no ad networks and no paid ads. The only content is brand deals made by the creator (user-generated-content collaborations), each reviewed by the creator before it is added. A banner or link appears on the home (Welcome) page or in a separate Partners section. Never where children enter or use the app. | REQ-5 is renamed "Brand partner placements". Surfaces are limited to adult pages (REQ-5.2). Ad networks, tracking and programmatic ads stay out of scope. |
| OQ-2 | Update the consent wording. | REQ-5.23 and REQ-5.24. |
| OQ-3 | Search: "whatever works best". | No search box. A sticky header only. Reason: a search field on child screens would take free text from children, which the rules forbid, and the app has too little content for adult search to help. |
| OQ-5 | Hosting site name: any. | Working name `deenstars-app` (REQ-2.4). The name must be free in Firebase. If it is taken, a suffix is added at deploy time and reported to you. |
| OQ-6 | Instagram in-app browser: relax. | REQ-4 is reduced to defensive coding plus a short smoke check. The goal is a live responsive website. iPhone and Android apps come later. |
| OQ-8 | Repository layout: the old prototype keeps working as is and stays in git as usual. The new app is built in `/responsive-web`, using `web/` as the reference. | Nothing is moved or archived. REQ-9 now says so. |
| OQ-7 | Config validation dependency. | Hand-written validator, no new dependency. |

### 2.2 Still open

- **OQ-4 (low impact).** `categoryFilter` matches a surface key or `"global"` on the pages where partners appear (REQ-5.9). Say so if you want finer matching.
## 3. Glossary

- **Child mode**: everything shown after a child is picked (`ChildApp` and its sub-screens, Bedtime, Story reader, games).
- **Parent area**: screens after `ParentGate` and `ParentPin` (`ParentApp`).
- **Adult surface**: Welcome, Auth, Consent, Set PIN, Add-child form, Parent area. Not child mode and not the child Picker.
- **Placement / slot**: a position where a sponsorship may render. Slot types: `hero`, `featured_card`, `in_feed`.
- **Parity**: the same input produces the same visible result and the same Firebase calls as `web/`.

---

## 4. Feature inventory (traceability matrix)

Every row must be accounted for in design and tasks, and each gets a parity test in REQ-1.3. Source paths are relative to `web/src/`.

### 4.1 App states and routes

The app has no URL router. Navigation is state-driven. Parity means preserving these states and transitions, and (see REQ-3.9) not adding routes that change them.

| ID | Feature | Source |
|---|---|---|
| F-01 | Root states: loading, Welcome, Auth (register/login), SignedIn | `App.tsx` |
| F-02 | SignedIn gating order: Consent, then Set PIN, then first child form, then Picker | `App.tsx` |
| F-03 | Mode machine: `picker`, `child`, `gate`, `pin`, `parent` | `App.tsx` |
| F-04 | Auto-resume last child from `localStorage ds_last_child` | `App.tsx` |
| F-05 | Parent session local timeout: server `expiresAt` plus 10 minutes, then back to Picker | `App.tsx` |
| F-06 | Test-build banner and "Emulator mode" banner | `App.tsx`, `components/common.tsx` |
| F-07 | Dev-only galleries via `?gallery=scenes` and `?gallery=ui` (and `&theme=`), only when `import.meta.env.DEV` | `main.tsx`, `screens/Gallery.tsx`, `screens/UiGallery.tsx` |
| F-08 | Tester tools via `?qe=1` and `?qe=0`, URL param removed after read | `devFlags.ts` |
| F-09 | Service worker registered in production only | `main.tsx`, `public/sw.js` |

### 4.2 Onboarding and account

| ID | Feature | Source |
|---|---|---|
| F-10 | Welcome screen: brand mark, animated art, "Get started", "I already have an account" | `screens/Onboarding.tsx` |
| F-11 | Register (email, password), sign in, password reset email, mapped error messages | `screens/Onboarding.tsx` |
| F-12 | Consent screen "Step 1 of 3", four info items, `CONSENT_VERSION = proto-2025-1`, `recordConsent` call | `screens/Onboarding.tsx` |
| F-13 | Set parent PIN: enter, confirm, mismatch handling, `setParentPin` | `screens/Onboarding.tsx`, `components/PinPad.tsx` |
| F-14 | Child form: nickname (max 20), birth month and year, suggested age group, difficulty, avatar picker, time zone, `createChildProfile` | `screens/Onboarding.tsx` |
| F-15 | Sign out (Picker and Parent Settings) | `App.tsx`, `screens/ParentApp.tsx` |

### 4.3 Child mode

| ID | Feature | Source |
|---|---|---|
| F-20 | Picker: "Who is learning today?", avatar tiles, Sign out, Parent area button with pending-approval count badge | `App.tsx` |
| F-21 | Bottom tabs: Home, Checklist, Play, Stars, Me. Leaving a sub-screen via tab returns to that tab. | `screens/ChildApp.tsx` |
| F-22 | Home: greeting by hour, nickname, weekly star pill linking to Stars | `screens/ChildApp.tsx`, `time.ts` |
| F-23 | Home "Today's deed" hero: deterministic daily pick (`featuredForDay`), states done / waiting for grown-up / "Let's do it", streak line, "together" line | `screens/ChildApp.tsx`, `data.ts` |
| F-24 | Home season card: "Ramadan in N days", Ramadan day N, Eid al-Fitr / Eid al-Adha | `screens/Seasonal.tsx` |
| F-25 | Home Jummah banner (Fridays) with progress | `screens/ChildApp.tsx` |
| F-26 | Home "Today" rail: not-done first, done check, pending star, link to Checklist | `screens/ChildApp.tsx` |
| F-27 | Home Explore tiles: Dua Corner, Stories, Short Surahs, Play & Learn, Bedtime | `screens/ChildApp.tsx` |
| F-28 | Weekly theme card (`themes[week % n]`) with its deeds | `screens/Seasonal.tsx` |
| F-29 | Checklist: progress card, category filter pills (All + categories present), list with status badges, streak chip, "Together" tag, loading / error / empty notices, Jummah link on Fridays | `screens/ChildApp.tsx` |
| F-30 | Task sheet: art panel, category label (+ "sample"), description, educational explanation, streak notice, done / pending / declined states, "I did it" or "Ask a grown-up to check" (`verification`), error notice | `screens/ChildApp.tsx` |
| F-31 | Celebration overlay (1.8 s auto-dismiss, stars shown) and streak-milestone cheer once per day (`STREAK_CELEBRATIONS`) | `components/common.tsx`, `screens/ChildApp.tsx` |
| F-32 | Jummah screen: Friday header, step path, "Jummah Hero" card, "This Friday's story" (`week % n`), "I can do it" and "With a grown-up" sections | `screens/ChildApp.tsx` |
| F-33 | Stars tab: this week, today / month / all-time stats, active streaks list, 3 sample milestones (10, 50, 100) | `screens/ChildApp.tsx` |
| F-34 | Me tab: avatar, age group pill, My Duas, My Surahs, Stories, Bedtime, Appearance (Auto / Light / Dark), Parent area row with badge | `screens/ChildApp.tsx`, `theme.ts` |
| F-35 | Tester tools card (only if tester tools on): simulate Friday, simulate Ramadan day 1/5/15/27/30, Eid al-Fitr, Eid al-Adha (page reload on season change) | `screens/ChildApp.tsx` |

### 4.4 Learning content

| ID | Feature | Source |
|---|---|---|
| F-40 | Dua Corner: 6 groups (Sleeping, Waking up, Eating, Bathroom, Home and dressing, Duas from the Quran), learned count, per-dua state | `screens/Learn.tsx` |
| F-41 | Dua detail: Arabic via `ArabicText`, transliteration, translation, when to recite, repeat count, audio, Quran highlight (`highlightFromWord`), source line, review banner "Sourced text, pending scholar review" | `screens/Learn.tsx`, `components/ArabicText.tsx` |
| F-42 | Surah learning: list, per-ayah text and audio, play-all queue with current-ayah highlight, children's recitation, Surah progress | `screens/Learn.tsx` |
| F-43 | Progress picker (Not started, Learning, Practising). "Learned" is parent-only. `updateLearningProgress` | `screens/Learn.tsx`, `types.ts` |
| F-44 | Story library filtered by child's age band (little / young). Young band also sees little-band stories under "more". | `screens/Learn.tsx`, `types.ts` |
| F-45 | Story reader: scene pages (SVG scenes), refs, final verse page with audio and highlight, "Read the verses" reference view, next / back | `screens/Learn.tsx`, `components/scenes.tsx` |
| F-46 | Bedtime flow: start, story (night mode), bedtime duas, goodnight. Config from `appConfiguration/bedtime`. No stars. Story picked by `dayKey` sum mod n. | `screens/Learn.tsx` |
| F-47 | Audio queue: one audio at a time, `stopAllAudio`, `AudioButton` variants (primary / secondary / night) | `components/audio.tsx` |
| F-48 | Arabic rendering: `ArabicText` (Amiri Quran font), Hisn display cleaning, Quran text left intact | `components/ArabicText.tsx` |

### 4.5 Play

| ID | Feature | Source |
|---|---|---|
| F-50 | Play menu: Kindness Quiz, Picture Matching, 5 locked "Coming soon" tiles | `screens/Play.tsx` |
| F-51 | Quiz: 3 questions (age 3-4) or 4, options per age (2 / 3 / 4), shuffled, per-answer explanation ("Yes, well done!" / "Good try! Let's learn together."), end summary, close button. No stars, no penalty. | `screens/Play.tsx` |
| F-52 | Picture Matching: 3 / 4 / 6 pairs by age group, flip and match, completion celebration | `screens/Play.tsx` |

### 4.6 Seasonal

| ID | Feature | Source |
|---|---|---|
| F-60 | Hijri date and Ramadan / Eid detection (Umm al-Qura), country from time zone or parent override, regional and parent day adjustment (clamped) | `hijri.ts`, `data.ts` |
| F-61 | Ramadan screen: day header, 30-day calendar (done / today / future), today's deed from `appConfiguration/ramadan`, other deeds, "Ramadan Star" badge at `starBadgeDays` (default 20) | `screens/Seasonal.tsx` |
| F-62 | Eid screen: Eid al-Fitr or Eid al-Adha deeds | `screens/Seasonal.tsx` |
| F-63 | Activity eligibility: age group, `jummahOnly` on Friday, `ramadanOnly` in Ramadan, `eidOnly` at Eid | `data.ts` |

### 4.7 Parent area

| ID | Feature | Source |
|---|---|---|
| F-70 | Parental gate: random number-words addition, 4 options, wrong answer regenerates | `screens/ParentApp.tsx` |
| F-71 | PIN entry: 4-digit `PinPad`, `startParentSession`, friendly errors | `screens/ParentApp.tsx`, `components/PinPad.tsx` |
| F-72 | Parent tabs: Overview, Approvals (with count badge), Children, Settings. "Back to kids" header button. | `screens/ParentApp.tsx` |
| F-73 | Session guard: any `permission-denied` returns to PIN | `screens/ParentApp.tsx` |
| F-74 | Overview: "To check" banner, weekly report per child (stars, 7-day bar chart, category sentence, active days, best streak) | `screens/ParentApp.tsx` |
| F-75 | Approvals: grouped by day newest first, relative day labels, "Approve all", Approve / Not yet, expired notice, optional "Did you do this together?" prompt (about 1 in 5) | `screens/ParentApp.tsx` |
| F-76 | Children: list, add child, edit (age group, difficulty), delete with typed-nickname confirmation | `screens/ParentApp.tsx` |
| F-77 | "Missed yesterday?" make-up (yesterday only) via `makeUpActivity` | `screens/ParentApp.tsx` |
| F-78 | Duas and Surahs confirm "Learned" and printable Certificate | `screens/ParentLearning.tsx` |
| F-79 | Ramadan and Eid dates settings: country, day adjustment | `screens/ParentLearning.tsx` |
| F-80 | Settings: signed-in email, sign out, placeholder notice for later features | `screens/ParentApp.tsx` |

### 4.8 Data model, server contract, persistence

| ID | Feature | Source |
|---|---|---|
| F-90 | Types: `Child`, `Activity`, `Completion`, `Approval`, `Streak`, `Dua`, `Surah`, `Story`, `Theme`, `AgeGroup`, `Difficulty`, `Category` (7 categories), helpers `isStreakActive`, `ageBandFor`, `displayTitle` | `types.ts` |
| F-91 | Firestore reads: `parents/{uid}`, `children` (by `ownerUid`) and subcollections `checklistCompletions`, `rollups` (`total`, `d_`, `w_`, `m_`), `streaks`, `parentApprovals`, `duaProgress`, `surahProgress`; `activities`; `appConfiguration/{hijri,bedtime,themes,ramadan}`; `duaLibrary`, `surahLibrary`, `stories` | `data.ts` |
| F-92 | 12 callables: `recordConsent`, `setParentPin`, `startParentSession`, `createChildProfile`, `updateChildProfile`, `deleteChildProfile`, `completeActivity`, `decideApproval`, `makeUpActivity`, `recordTogether`, `updateLearningProgress`, `updateParentSettings`. `clientRequestId` from `crypto.randomUUID()`. | `api.ts` |
| F-93 | `friendlyError` mapping. Child screens never show raw errors. | `api.ts` |
| F-94 | Day logic: `dayKeyFor`, `weekKeyFromDayKey`, `daysOfWeek`, `useToday` (recomputed on visibility change and each minute) | `time.ts`, `data.ts` |
| F-95 | In-memory caches for activities and library docs; live listeners for completions, rollups, streaks, approvals, progress | `data.ts` |
| F-96 | Browser storage keys: `ds_last_child`, `ds_theme`, `ds_tester_tools`, `ds_sim_friday`, `ds_sim_season`, `ds_streak_cheer_{child}_{activity}_{day}` | various |
| F-97 | Firebase init with emulator switch `VITE_USE_EMULATORS=true`, Analytics not initialised | `firebase.ts` |

### 4.9 Design system and platform

| ID | Feature | Source |
|---|---|---|
| F-100 | Design tokens, light / dark / system theme, `prefers-reduced-motion`, `@media print` (certificate) | `styles.css`, `theme.ts` |
| F-101 | Components: `Art`, `Banner` (tones, wide, locked), `SectionHeader`, `Rail`, `PageTitle`, `Sheet` (Escape closes), `BackLink`, `Notice`, `ErrorBox`, `Loading`, `ProgressBar`, `StarCount`, `Avatar`, `CategoryChip`, `BrandMark`, `PinPad` | `components/*` |
| F-102 | Self-hosted fonts (Plus Jakarta Sans, Amiri Quran), art set (`public/art`, MIT licence file), audio (`public/audio`) | `public/`, `package.json` |
| F-103 | PWA manifest, icons, `apple-touch-icon`, `noindex` robots meta, theme colour | `index.html`, `public/` |
| F-104 | Accessibility: roles and labels on tabs, progress bars, dialogs, groups, `aria-pressed` filter pills | throughout |
| F-105 | QA scripts (Playwright, 390x844, screenshots) and `scripts/` tooling (`make-icons`, `fetch-art`) | `qa/`, `web/scripts/` |

---

## 5. Requirements

Format: EARS ("WHEN ... THE system SHALL ..."). "The app" means `/responsive-web`.

### REQ-1 Zero-loss migration

**User story:** As the product owner, I want every existing feature to work in the new app exactly as it does now, so that nothing is lost in the port.

1.1 THE app SHALL implement every feature F-01 to F-105 in §4 with the same user-visible behaviour, copy, ordering, and rules (for example age-based option counts, deterministic daily picks, positive-only streaks, no star deduction).
1.2 THE app SHALL be created by copying `web/` into `/responsive-web` (source, `public/`, scripts, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`) and adapting the copy. It SHALL NOT import from or symlink to `web/`.
1.3 THE spec's task list SHALL include a parity test for every feature ID in §4, run at 390 px width against both `web/` and `/responsive-web`, and any difference SHALL be either fixed or recorded here as an approved deviation.
1.4 THE app SHALL use the same Firebase project, Firestore collections, and the 12 callable contracts in F-92 without change. It SHALL NOT include its own copy of Cloud Functions, Firestore rules, or seed data. IF a backend change appears necessary, THEN the work SHALL stop and ask.
1.5 THE app SHALL keep Firebase Analytics uninitialised and SHALL add no analytics, advertising, attribution, or other third-party SDK or script.
1.6 THE app SHALL keep the "Test build" banner, `noindex` meta, and the "(sample)" title handling.
1.7 THE app SHALL keep all child-mode copy rules: short and warm, no red error screens, no failure state for missed activities, no guilt messaging.
1.8 WHERE the original code contains a defect, THE app SHALL keep the original behaviour and the defect SHALL be listed under "Observed issues" in the design doc for a separate decision. (This avoids silent behaviour changes during a port.)
1.9 WHEN `git status --short` is run at the repository root after any task, THE output SHALL contain only paths under `responsive-web/` and `.kiro/specs/responsive-web/`.

### REQ-2 Standalone project setup

**User story:** As a developer, I want `/responsive-web` to build and run on its own.

2.1 THE app SHALL have its own `package.json`, lockfile, `tsconfig.json`, and Vite config, and SHALL install with `npm ci` and build with `npm run build` (type-check plus Vite build) inside `/responsive-web`.
2.2 THE app SHALL support `dev`, `dev:emu` (emulator mode through `VITE_USE_EMULATORS`), `build`, and `preview` scripts matching `web/`.
2.3 THE app SHALL keep `dist/`, `node_modules/` and logs out of git (existing `.gitignore` patterns already match; no root `.gitignore` edit is allowed).
2.4 THE app SHALL provide its own Firebase Hosting config (working site name `deenstars-app`, see OQ-5), including the SPA rewrite and `Cache-Control: no-cache` for `/sw.js`.
2.5 THE app SHALL document in `/responsive-web/README.md` how to run it against the emulators and how it relates to `web/`.
2.6 THE app's service worker cache name SHALL differ from `web/`'s (`deenstars-shell-v4`) so both apps never share a cache on one origin during testing.

### REQ-3 Fluid responsive layout

**User story:** As a parent opening the app from Instagram or a desktop browser, I want the layout to fit my screen.

Breakpoints (min-width, mobile first): base `0`, `768px` (tablet), `1024px` (desktop), `1440px` (wide). Content max width `1280px`, centred.

3.1 THE app SHALL remove the 520 px `.app` cap, the rounded phone frame, the frame background, the 480 px sheet cap, and the `position: absolute` tab bar at 760 px.
3.2 THE app SHALL render with no horizontal page scroll and no clipped content at every viewport width from 360 px to 1920 px, in portrait and landscape.
3.3 **Mobile (< 768 px):**
  - Single-column layout.
  - A sticky top header containing the brand mark and screen title (no search; see OQ-3).
  - The existing bottom tab bar, full width, with safe-area padding.
  - Category filters shown as horizontally scrollable chips; where there are more than the chips can show, a bottom-sheet filter drawer.
  - Sheets stay bottom-anchored.
3.4 **Tablet (768 px to 1023 px):**
  - Content lists that are card collections (Explore tiles, story cards, dua groups, badges, children tiles, quiz and game tiles) SHALL use 2 columns.
  - Filters SHALL sit in a collapsible panel above the content (collapsed by default, state remembered per screen for the session).
  - Bottom tab bar remains.
3.5 **Desktop (≥ 1024 px):**
  - Card collections use 3 columns at 1024 px and 4 columns at 1280 px and wider where the content count supports it.
  - The primary navigation (the same 5 child tabs, or 4 parent tabs) moves to a persistent left sidebar. The bottom tab bar is hidden.
  - Filters SHALL be a persistent sidebar section or a top filter bar, one of which is chosen in design.
  - Sheets and dialogs are centred with max width 560 px.
  - The page content is centred in a max-width `1280px` container.
3.6 Reading and interaction screens (Story reader, Quiz, Picture Matching, Bedtime, Dua detail, Surah detail, Ramadan calendar, PIN pad, gate, auth and consent forms) SHALL keep a readable measure (max about 720 px for text, 420 px for forms and pads) and be centred, instead of stretching to the container width.
3.7 THE app SHALL keep the 60 px minimum touch target for child controls and a 44 px minimum for parent controls at all breakpoints. Tap alternatives remain for any drag.
3.8 THE app SHALL use `100dvh` with a `100vh` fallback, `env(safe-area-inset-*)`, and `viewport-fit=cover`, and SHALL NOT rely on a fixed height for any scroll container.
3.9 Navigation SHALL remain state-driven as in F-03. Browser back is not required to match native-app behaviour beyond what `web/` does today; adding URL routes is out of scope unless approved.
3.10 THE app SHALL respect `prefers-color-scheme`, `prefers-reduced-motion`, text zoom to 200 percent without loss of content, and the existing light / dark / auto setting.
3.11 THE Home "Today" rail and other horizontal rails SHALL remain rails on mobile and tablet, and MAY become a wrapping grid on desktop. Item order SHALL not change.
3.12 THE Picker, Welcome, Consent, PIN, gate and auth screens SHALL be centred single-column cards on tablet and desktop, with the Welcome art scaled up (no stretching).
3.13 IF a grid has fewer items than columns, THEN the items SHALL keep their normal card width and align to the start, not stretch to fill the row.

### REQ-4 Instagram in-app browser compatibility (relaxed)

**User story:** As a parent who followed a link from Instagram, I want the app to work in that built-in browser.

4.1 THE app SHALL be fully usable at 360 px width and with a dynamic viewport that changes as the in-app browser chrome shows and hides.
4.2 THE app SHALL NOT depend on the service worker, install prompts, `display: standalone`, or `beforeinstallprompt` for any feature. These are progressive extras only.
4.3 WHEN `localStorage` or `sessionStorage` access throws or is unavailable, THE app SHALL fall back to in-memory values for `ds_last_child`, `ds_theme`, tester flags, and streak-cheer keys, without crashing and without a visible error.
4.4 WHEN IndexedDB is unavailable, THE app SHALL fall back to session or in-memory Firebase Auth persistence so sign-in still works for the current visit, and SHALL tell the parent briefly that they may need to sign in again next time.
4.5 WHEN `crypto.randomUUID` is unavailable, THE app SHALL generate `clientRequestId` with `crypto.getRandomValues` or an equivalent, preserving uniqueness and idempotency behaviour.
4.6 THE app SHALL start audio only from a user tap and SHALL handle a rejected `play()` promise without an error screen.
4.7 THE app SHALL open any external link with `target="_blank"` and `rel="noopener noreferrer"` (plus `sponsored` where REQ-5 applies) and SHALL not use `window.open` from non-user events.
4.8 THE app SHALL avoid `position: fixed` elements that rely on the visual viewport matching the layout viewport, or SHALL test them with the on-screen keyboard open (PIN and form screens).
4.9 THE task list SHALL include one short smoke check on a real phone: open the live link from Instagram, sign in, and open Home, Checklist, and a Partner link. Results are noted in the task. Failures are fixed only if they block sign-in or navigation. A full device matrix is not required.

### REQ-5 Brand partner placements

**User story:** As the creator, I want to place partner brands in the app by editing a config file, without changing UI code.

Scope: creator-reviewed brand deals only. No ad networks, no auctions, no tracking. The data fields keep the names you specified (`slotType`, `isActive`, and so on), so "ad" in a field name means a brand deal entry.

**Safety gate**

5.1 THE app SHALL have a build-time constant `adsEnabled` that defaults to `false` in code and is switched on in the launch configuration after REQ-5.23 and REQ-5.24 are done. WHILE `adsEnabled` is `false`, THE app SHALL render no sponsorship UI, load no sponsor media, and the disclosure in REQ-5.14 SHALL not appear.
5.2 THE app SHALL define an explicit allowlist of surfaces where placements may render. The default allowlist SHALL contain only adult surfaces: `welcome` (the home page before sign-in), `partners` (a separate Partners page linked from Welcome and from Parent Settings), and `parent.overview`. It SHALL NOT contain the Picker, any child-mode screen, Bedtime, Story reader, Dua, Surah, Quiz, Matching, Ramadan, Eid, Jummah, or Stars. Adding a surface to the allowlist SHALL require a code change and a code review note.
5.3 THE app SHALL include an automated test that fails if any sponsorship component is rendered in child mode or inside any religious-content screen (Dua, Surah, Story, Bedtime, Ramadan, Eid, Jummah).

**Slot types**

5.4 **Hero Spotlight Banner (`hero`):** a full-width responsive banner near the top of an allowlisted surface, showing a "Sponsored Partner" badge, brand logo or visual, headline, short description, and a CTA button. Layout: stacked on mobile (media above text), side by side from 768 px. At most one hero renders per surface.
5.5 **Featured / Pinned card (`featured_card`):** a card rendered first in an allowlisted card grid or list, using the same card component, radius, spacing, and typography as neighbouring cards, plus a subtle "Featured Brand" badge. The maximum number of featured cards per surface SHALL be configurable (default 1).
5.6 **In-feed native promo card (`in_feed`):** a card injected into an allowlisted card grid after every Nth organic item. N SHALL be configurable per surface (default 6). Rules:
  - The card occupies exactly one grid cell at every breakpoint.
  - The order of organic items SHALL not change.
  - It SHALL be injected only between organic items, never before the first or after the last.
  - It SHALL carry a visible "Sponsored" label.
  - Where the surface has fewer than N organic items, no in-feed card renders.
  - The card is computed in the data list, so no empty wrapper or placeholder element exists in the DOM when nothing is injected.

**Configuration layer**

5.7 THE app SHALL read all placements from one data file (`src/ads/ads.json`, with typed access in `src/ads/adsConfig.ts`). Adding, swapping or removing a brand SHALL need only an edit to that file. No UI component SHALL contain brand copy, URLs, or dates.
5.8 EACH ad object SHALL support these fields, all validated at build time (a failing validation fails the build with a message naming the ad `id` and field):

| Field | Type | Rule |
|---|---|---|
| `id` | string | unique, kebab-case |
| `slotType` | `"hero"` \| `"featured_card"` \| `"in_feed"` | required |
| `brandName` | string | required, max 60 chars |
| `headline` | string | required, max 80 chars |
| `description` | string | required, max 200 chars |
| `mediaUrl` | string | required; same-origin path under `/sponsors/` (see 5.12) |
| `ctaText` | string | required, max 30 chars |
| `destinationUrl` | string | required; `https:` only |
| `categoryFilter` | `"global"` \| string[] | required; see 5.9 |
| `startDate` | `YYYY-MM-DD` | required |
| `endDate` | `YYYY-MM-DD` | required, on or after `startDate` |
| `isActive` | boolean | required |

5.9 THE app SHALL pass each placement a `context` made of the surface key (for example `parent.overview`) and, where the surface has an active filter, the active filter value. An ad matches WHEN `categoryFilter` is `"global"`, OR contains the active filter value, OR contains the surface key. Default values SHALL be documented in the config file header comment.
5.10 AN ad is eligible WHEN `isActive` is true AND today's date is between `startDate` and `endDate` inclusive AND its context matches. Today is evaluated in UTC, so every viewer sees the same switch-over moment. WHEN several ads are eligible for one slot, THE app SHALL pick deterministically (config order), without random rotation, so repeat views are stable.
5.11 THE app SHALL append UTM parameters to `destinationUrl` at click time: `utm_source=deenstars`, `utm_medium=sponsored`, `utm_campaign={ad.id}`, `utm_content={slotType}`. Existing query parameters on the destination SHALL be kept, and any UTM parameter already present SHALL be left as the config author set it. UTM values SHALL NOT include any user, child, account, or device identifier.
5.12 THE app SHALL serve sponsor media from `/responsive-web/public/sponsors/` (same origin). It SHALL NOT load images, fonts, scripts, or iframes from third-party hosts. The build SHALL fail if `mediaUrl` is not a same-origin path to an existing file.
5.13 WHEN a visitor activates a sponsor CTA, THE app SHALL first show the existing parental gate (`ParentGate`) unless the visitor is already inside a verified parent session (`ParentApp`), and only then open the link. A failed gate SHALL not open the link.
5.14 THE app SHALL show a plain-language disclosure on every page that renders at least one placement, in the footer, stating that some content is sponsored or comes from brand partners and that the creator may earn compensation or free products. Each placement SHALL also show its own badge ("Sponsored Partner", "Featured Brand", or "Sponsored"). The wording SHALL be one editable string in the config file. The disclosure SHALL be readable at 360 px without zooming and meet WCAG AA contrast. Legal review of the wording is required before launch; this spec does not provide legal advice.
5.15 Sponsor links SHALL carry `rel="sponsored noopener noreferrer"`.
5.16 THE app SHALL NOT add impression or click tracking, cookies, pixels, third-party scripts, or any identifier for sponsor measurement. IF measurement is wanted, THEN that is a separate decision (OQ-1).
5.17 Sponsor creatives SHALL NOT contain Quran, Hadith, duas, Arabic religious text, or any depiction of a Prophet, Companion, or Allah, and SHALL not use fear-based or punishment-based messaging. Adding an ad SHALL require a manual review note in the config entry (`reviewedBy`, `reviewedOn`; extra fields allowed beyond 5.8 for this purpose and not rendered).
5.18 THE app SHALL provide a preview toggle for brand managers: WHEN tester tools are on (F-08) and `?adpreview=1` is in the URL, THE app SHALL show all ads for allowlisted surfaces regardless of dates and `isActive`, outlined and labelled "PREVIEW". The toggle SHALL have no effect when tester tools are off, and SHALL never show ads on non-allowlisted surfaces.

**Consent and disclosure wording (OQ-2)**

5.23 THE consent screen item "What we never do" currently says "No ads, no chat between children, no location tracking, no selling data." THE app SHALL change it to wording that stays true once partner links exist. Proposed text (for your edit and legal review): "No ads shown to children, no chat between children, no location tracking, no selling data. Parents may see links from our brand partners in grown-up areas only." Children never see partner content.
5.24 THE `CONSENT_VERSION` constant SHALL change from `proto-2025-1` to a new value (proposed `web-2025-2`). Note for design: the server only checks that a version string exists (`functions/src/parent.ts`, `children.ts`), and the app only checks that a version exists (`App.tsx`). A new constant therefore applies to new sign-ups only. Making existing parents re-accept needs a version comparison in the app (a small behaviour change) and is listed as a design decision, not assumed.
5.25 THE app SHALL leave the existing docs and steering files unchanged (§1.1). A short list of statements in `docs/CHILD_SAFETY.md`, `docs/PRD.md` and `.kiro/steering/child-safety.md` that say "no advertising" SHALL be given to you as a suggested edit, because those files are yours to approve.
**Graceful collapse**

5.19 WHEN no ad is eligible for a slot, THE slot SHALL render nothing: no element, no margin, no padding, no gap, no skeleton, no "no ads" text. Surrounding content SHALL reflow as if the slot never existed.
5.20 WHEN a sponsor image fails to load, THE card SHALL remove itself entirely (not show a broken image) and the grid SHALL reflow without a gap.
5.21 Sponsor media SHALL have fixed aspect ratios (for example 16:9 hero, 4:3 card) declared in CSS, so loading does not shift the layout.
5.22 Grid alignment tests SHALL cover: 0, 1, and 2+ eligible ads, at 360, 768, 1024, and 1440 px, for each slot type.

### REQ-6 Accessibility

6.1 THE app SHALL keep every accessibility behaviour listed in F-104 and SHALL keep a visible keyboard focus style on all interactive elements.
6.2 THE sidebar navigation (desktop) SHALL use `nav` with an accessible name and `aria-current="page"` on the active item, matching the existing tab bar semantics.
6.3 THE filter drawer and collapsible filter panel SHALL be operable by keyboard and screen reader, trap focus while a drawer is open, close on Escape, and return focus to the trigger.
6.4 Sponsorship components SHALL announce their sponsored status to assistive technology (not by colour or position alone).
6.5 Text and controls SHALL meet WCAG 2.1 AA contrast in light and dark themes.

### REQ-7 Performance and reliability

7.1 THE initial JavaScript for the Welcome screen SHALL not grow compared with `web/`'s Welcome screen by more than 10 percent, measured with `npm run build` output. (Baseline captured as a task before any change.)
7.2 THE app SHALL lazy-load audio (no audio file is fetched until requested) and SHALL not preload sponsor media on non-allowlisted surfaces.
7.3 THE app SHALL avoid layout shift from images by reserving aspect ratio for art and sponsor media.
7.4 WHEN the network is unavailable, THE app SHALL show the existing friendly offline message and SHALL not show raw errors on child screens.

### REQ-8 Testing and verification

8.1 THE app SHALL include a Playwright visual and behaviour suite (ported from `qa/`) that runs the existing 20-step walkthrough in `qa/screens.mjs` at 360, 390, 768, 1024, and 1440 px, with screenshots written to a git-ignored folder inside `/responsive-web`.
8.2 THE suite SHALL assert, at each width: no horizontal overflow (`scrollWidth <= clientWidth`), no console errors, and the expected layout mode (tab bar below 1024 px, sidebar at 1024 px and up).
8.3 THE suite SHALL assert F-23 to F-27 daily picks equal those of `web/` for the same date and child.
8.4 THE ad system SHALL have unit tests for: date window (inclusive edges, UTC), `isActive`, context matching, deterministic selection, UTM appending (existing params kept, identifiers absent), config validation failures, and in-feed injection positions (N = 1, 6, list shorter than N).
8.5 THE ad system SHALL have negative tests for: child-mode rendering (REQ-5.3), third-party media host (REQ-5.12), CTA without gate (REQ-5.13), and `adsEnabled = false` (REQ-5.1).
8.6 THE app SHALL run the existing backend test suites in `functions/` unchanged to confirm the shared backend still passes. Where they need the emulator and Java, the task SHALL say so.
8.7 Documentation for new behaviour SHALL live in `/responsive-web/docs/`. Updating the root `docs/` is a follow-up that needs your approval because of §1.1.

---

### REQ-9 Repository layout (resolved)

9.1 `web/` SHALL stay where it is, build and deploy exactly as it does today, and remain tracked in git as usual. It is the reference for parity (REQ-1.3) and SHALL NOT be moved, archived, frozen or edited.
9.2 `/responsive-web` SHALL be a separate app in the same repository. Both apps can be run at the same time (`web/` on Vite port 5173, `/responsive-web` on a different port set in its Vite config, for example 5174).
9.3 `/responsive-web` SHALL deploy to its own Firebase Hosting site (working name `deenstars-app`) using its own `firebase.json` and `.firebaserc` inside `/responsive-web`. The root `firebase.json`, which serves `web/dist` to `deenstars-dev`, SHALL NOT change.
9.4 Where `/responsive-web` needs the shared backend, it SHALL use the same Firebase project as `web/` (REQ-1.4). The new hosting domain SHALL be added to Auth authorised domains by you (Firebase console), and I will list the exact domain when the site exists.
9.5 Root `README.md` and `docs/` SHALL NOT change. `/responsive-web/README.md` explains how the two apps relate.

---
## 6. Out of scope

- Changes to `web/`, `functions/`, `firestore.rules`, `firestore.indexes.json`, `docs/`, `qa/`, steering files, or root config.
- Any new child-facing feature, new content, or new reward logic.
- The SwiftUI iOS app.
- Text search, URL routing, or deep links (OQ-3, REQ-3.9), unless approved.
- Ad networks, programmatic ads, sponsor impression or click analytics (REQ-5.16).
- Payments, sponsor self-serve portal, or a server-side ad API.
- Legal sign-off on disclosure wording, consent text, or children's-privacy compliance.

## 7. Assumptions

- You want a separate copy rather than refactoring `web/` in place, so both can run during the transition.
- The shared dev backend (`deenstars-dev`) is acceptable for the new app, and its Auth authorised domains can be extended by you.
- Node 20 or 22 and npm are available, as for `web/`.
- Content shown (activities, duas, surahs, stories) stays data-driven from Firestore. Hard-coded sample data that exists in `web/` today (the 4 Kindness Quiz questions, the "Coming soon" tiles, the sample milestones, avatar and category style tables) is copied as is. Moving it to Firestore would conflict with the parity rule in REQ-1.1 and is not part of this port.


