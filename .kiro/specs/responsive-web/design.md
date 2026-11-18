# Design: Responsive Web Port of DeenStars

Implements `requirements.md` (v2). Code lives in `/responsive-web`. `web/` is the untouched reference.

## 1. Approach

Copy `web/` to `/responsive-web`, then change four things and nothing else:

1. **Layout** (CSS plus one small `Shell` component).
2. **Browser safety** (storage, auth persistence, request IDs).
3. **Brand partner placements** (new `src/ads/` module, used only on adult pages).
4. **Consent wording, manifest, hosting config.**

Screens, hooks, data access, API calls and content logic are copied as they are. Any edit to those files is limited to adding a CSS class, swapping `localStorage` for the safe wrapper, or wrapping output in `Shell`.

## 2. Layout

### 2.1 Breakpoints

| Name | min-width | Navigation | Card collections | Filters |
|---|---|---|---|---|
| mobile | 0 | sticky top header + bottom tab bar | 1 column for lists, 2 for small tiles (as in the original) | scrollable chips |
| tablet | 768 px | same | lists become 2-column cards, tiles 2 columns | collapsible panel |
| desktop | 1024 px | left sidebar, no tab bar, no top header | lists 3 columns, tiles 3 then 4 at 1280 | always-visible chip bar |

Container: `max-width: 1280px`, centred. Beyond 1280 px the page background continues; content does not stretch.

### 2.2 Shell

```
<div.app>
  <PrototypeBanner/>
  <Root>
    Welcome / Auth / Consent / PIN / Gate / Picker      -> .screen.no-tabs   (centred, max 560 px)
    ChildApp / ParentApp                                 -> <Shell nav={TabBar}>…</Shell>
```

`Shell` renders:

- `header.app-header` (sticky, brand mark and screen title, hidden at 1024 px and up),
- `aside.side` (brand block, hidden below 1024 px, plus the existing `nav` element),
- `div.main` (the existing screen),
- overlays (sheets, celebration) unchanged.

Below 1024 px `.side` uses `display: contents`, so the existing fixed bottom tab bar keeps working as before. At 1024 px and up `.with-nav` becomes a two-column grid (248 px sidebar, content). The tab bar element is the same one, restyled as a vertical list. Bedtime keeps its own full-screen night view with no shell.

### 2.3 Rules for converting lists to grids

- `.list` at 768 px and up becomes `grid; repeat(auto-fill, minmax(min(100%, 320px), 1fr))` and each `.list-item` becomes its own card. Order is unchanged. No stretching of a lone card.
- `.grid2` keeps 2 columns on mobile and tablet, 3 at 1024 px, 4 at 1280 px, but only inside tab screens. Gate, Picker and form screens stay narrow.
- `.rail` stays a horizontal rail below 1024 px and becomes a wrapping grid at 1024 px and up.
- Reading screens get `.reading` (max 720 px, centred): Dua detail, Surah detail, Story reader, Quiz, Matching, Bedtime, Ramadan, Eid.
- `.sheet` is bottom-anchored below 768 px and centred (max 560 px) above.

### 2.4 Filters

`FilterBar` wraps the existing Checklist chips. The chip markup is unchanged. Below 768 px the row scrolls. From 768 px to 1023 px a toggle button (`aria-expanded`) opens and closes the chip panel. At 1024 px and up chips wrap in an always-open bar. The Checklist has at most 8 chips, so the mobile bottom-sheet drawer from requirements 3.3 and 6.3 is not built. This is a recorded deviation, reversible if more filters are added.

## 3. Browser safety (REQ-4)

| Change | File |
|---|---|
| `safeStorage` get/set/remove with in-memory fallback. All `localStorage` uses go through it. | `src/storage.ts`, `App.tsx`, `data.ts`, `devFlags.ts`, `theme.ts`, `ChildApp.tsx` |
| `initializeAuth` with persistence order IndexedDB, local, session, in-memory | `src/firebase.ts` |
| `newRequestId()` using `crypto.randomUUID`, falling back to `getRandomValues` | `src/id.ts`, `api.ts` |
| Audio `play()` rejection is already caught; kept | `components/audio.tsx` |
| Service worker cache renamed `deenstars-web-shell-v1`; app never depends on it | `public/sw.js` |
| Manifest `orientation` changed from `portrait` to `any` | `public/manifest.webmanifest` |

## 4. Brand partner placements

### 4.1 Files

```
src/ads/
  types.ts        Ad, AdsFile, SlotType, Surface
  validate.ts     pure validator (no imports); used by Vite plugin and tests
  engine.ts       isEligible, selectForSlot, appendUtm, injectInFeed, ALLOWED_SURFACES
  ads.json        { enabled, disclosure, inFeedEvery, maxFeatured, ads: [] }
  ads.sample.json fake brands, used by tests and dev preview only
  usePlacements.ts hook: surface -> { hero, featured, inFeed, any }
  Partners.tsx    HeroSlot, FeaturedCard, InFeedCard, Disclosure, PartnersPage, PartnerLink
public/sponsors/  self-hosted images
```

### 4.2 Data flow

```
ads.json --(build-time validate, fails the build)--> engine
surface key + (active filter) --> usePlacements --> eligible ads --> slot components
click --> PartnerLink --> (gate unless parent session) --> window.open(appendUtm(url))
```

- `enabled: false` makes `usePlacements` return nothing, so components render `null`.
- Surfaces outside `ALLOWED_SURFACES` return nothing even if `enabled` is true. This is the single enforcement point.
- Eligibility: `isActive`, UTC date window inclusive, context match. Selection is config order.
- `injectInFeed(items, ad, every)` returns a new array with the ad after items `every`, `2*every`, and so on, never first or last. The component renders the array, so a collapsed slot leaves no DOM.
- Image `onError` sets state that removes the whole card.
- Aspect ratios are set in CSS (hero 16:9 on mobile and 21:9 side image on 768 px and up, card 4:3).

### 4.3 Surfaces and placement

| Surface key | Page | Slots |
|---|---|---|
| `welcome` | Welcome (home before sign-in) | hero, plus a "Partners" link when anything is eligible |
| `partners` | Partners page (from Welcome and Parent Settings) | hero, featured cards, in-feed cards (no organic items, so shown as a grid) |
| `parent.overview` | Parent Overview | featured cards first, in-feed after every Nth weekly report |

Child mode, Picker, onboarding, and all learning screens never import from `src/ads/`. A test scans for this (REQ-5.3).

### 4.4 Gate and links

`PartnerLink` is an `<a>`-looking button. On click: if inside a parent session, open. Otherwise show the existing `ParentGate`; on pass, open. Link: `target=_blank`, `rel="sponsored noopener noreferrer"`. UTM: `utm_source=deenstars`, `utm_medium=sponsored`, `utm_campaign=<id>`, `utm_content=<slot>`; keys already in the URL are left alone.

### 4.5 Preview

Tester tools plus `?adpreview=1`: ignores `isActive` and dates, outlines each placement with "PREVIEW". Allowed surfaces still apply. In dev builds only, `?adsample=1` loads `ads.sample.json` (code is removed from production builds).

## 5. Consent and versions

Consent item text changes per REQ-5.23. `CONSENT_VERSION` becomes `web-2025-2`. Existing parents are not forced to re-accept (REQ-5.24 decision): the app only checks that some version exists, and the server accepts any 1 to 40 character string.

## 6. Hosting

`/responsive-web/firebase.json` serves `dist` to site `deenstars-app` with an SPA rewrite and `no-cache` for `/sw.js`. `.firebaserc` points at `deenstars-dev`. No root file changes. Vite dev port 5174.

## 7. Testing

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | `engine`, `validate`, `safeStorage`, `newRequestId`, import-boundary scan |
| Layout | Playwright (Edge) at 360, 390, 768, 1024, 1440 | no horizontal overflow, nav mode per width, partner slots collapse and render, grid alignment |
| Parity | Playwright vs the running emulator | the `qa/screens.mjs` walkthrough at each width |

Vitest and `playwright-core` are new dev dependencies (tooling only; nothing ships to users).

## 8. Known deviations from the requirements

- No mobile filter drawer (see 2.4).
- Mobile keeps the 2-column small tiles from the original instead of 1 column, because they are the thumb-sized entry points.
- No forced re-consent (see 5).
- The in-feed rule "never on a surface with no organic items" is relaxed on the Partners page only.
