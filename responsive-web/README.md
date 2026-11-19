# DeenStars responsive web

Responsive version of the DeenStars web prototype. The phone-width prototype in `../web` is untouched and stays the reference. Both use the same Firebase project and backend (`../functions`, `../firestore.rules`).

## Run

```
npm ci
npm run dev           # http://localhost:5174, real project deenstars-dev
npm run dev:emu       # http://localhost:5174, local emulators
npm run build         # type-check and bundle to dist/
npm test              # unit tests
node scripts/make-printables.mjs   # rebuild the printable PDFs (needs Edge, and npm run build in ../functions)
```

Browser checks need the emulators running and seeded, and `dev:emu` running. Run `fix3` before `enhancements` (it sets up a 7-day streak):

```
node qa/layout.mjs
node qa/guest.mjs
node qa/fixes.mjs
node qa/fix3.mjs
node qa/sponsors.mjs
node qa/enhancements.mjs
```

Emulators: from the repo root run `firebase emulators:start --only auth,firestore,functions`, then `node functions/scripts/seed-emulator.mjs`. Test login: `qa@example.test` / `qa-password-123`, PIN `2468`.

## Website pages (no account needed)

Every dua, surah, story and printable has its own link, so shares from Instagram, WhatsApp or search land on the right page. A signed-in parent who opens a link sees that page, with an "Open the app" button.

| URL | Page |
|---|---|
| `/` | Home page |
| `/duas`, `/duas/category/<group>`, `/duas/<name>` | Dua Corner landing (groups, search, favourites, recently viewed), one group (for example `/duas/category/morning`), one dua (for example `/duas/before-sleeping`) |
| `/surahs`, `/surahs/<name>` | Short Surahs, one surah (for example `/surahs/al-ikhlaas`) |
| `/stories`, `/stories/category/<group>`, `/stories/<id>` | Story groups (Prophets, Good Character, Islamic Values, Bedtime Stories, Ramadan, Hajj & Umrah), one group, one story |
| `/stories/category/bedtime/routine` | Bedtime routine: a story, then bedtime duas, then goodnight |
| `/bedtime` | Removed. Redirects to `/stories/category/bedtime` |
| `/play` | Kindness Quiz and Picture Matching, with levels |
| `/printables`, `/printables/<id>` | Free printables, one printable (for example `/printables/ramadan-countdown`) |
| `/signin`, `/register` | Parent account |

Guests use a "guest" child on this device only. Nothing is saved to the server. The checklist, stars, streaks, badges, child profiles and parent area need a free parent account. The guest age choice is stored on the device (`ds_guest_age`).

**Add to Home Screen.** Grown-up pages and parent Settings offer to install the site like an app: the browser's own dialog on Chrome, Edge and Android; "Share, then Add to Home Screen" on iPhone Safari; "open in your browser" inside Instagram and other in-app browsers. Never shown on children's pages. Dismissed for 30 days per device.

## Layout

| Width | Navigation | Grids |
|---|---|---|
| under 768 px | sticky top header, bottom tab bar | lists 1 column, tiles 2 |
| 768 to 1023 px | same, collapsible filter panel | lists 2 columns |
| 1024 px and up | top navigation bar | lists 3 columns, tiles 3, then 4 from 1280 px |

Content is capped at 1280 px and centred.

## Stars, streaks and badges

- Stars page and parent report show what earned each star (from the append-only `starTransactions` ledger).
- Day streak and badges are computed server-side (`functions/src/lib/progress.ts`, trigger `onStarAwarded`). A day counts when a checklist item earned stars that day. Badge rules live in `appConfiguration/badges`. Badges are never removed; a broken streak is never shown.

## Sponsor banners (parent area only)

Plain static image banners, clearly labelled "Sponsored", shown only on the parent Overview. Never on a child screen, in Bedtime or on the public website. No video, animation, pop-ups, tracking, personalisation or ad network.

Banners are a curated server-side list: one Firestore document per sponsor in `sponsors/{id}`, added by an admin. Clients cannot write it and guests cannot read it.

```json
{
  "brandName": "Acme",
  "headline": "Up to 20% off for DeenStars families",
  "description": "Optional, at most 160 characters.",
  "imageUrl": "/sponsors/acme-june.webp",
  "imageAlt": "Acme logo with a family at a picnic",
  "linkUrl": "https://acme.example/deal",
  "ctaText": "Visit Acme",
  "startDate": "2025-06-01",
  "endDate": "2025-06-30",
  "isActive": true,
  "sortOrder": 1,
  "reviewedBy": "your name",
  "reviewedOn": "2025-05-28"
}
```

- Put the image in `public/sponsors/` and deploy the site. png, jpg or webp only (no gif, svg or video). Same-origin only, so the app contacts no new hosts.
- `appConfiguration/sponsors` holds `enabled`, `maxBanners` and the disclosure text shown under the banners.
- Dates are inclusive, UTC. An invalid, expired or switched-off record is not shown, and nothing is left in its place.
- Links open in a new tab with `rel="sponsored noopener noreferrer"` and campaign tags (`utm_source=deenstars&utm_medium=sponsored&utm_campaign=<id>`). No user, child or device identifier is ever added.
- Preview: tester tools (`?qe=1`) plus `?sponsorpreview=1` shows valid sponsors regardless of dates.
- Guard: `test/sponsors.test.ts` fails if any child or public screen imports the sponsor module, or if ad-network or tracking code appears.

## Printables

Four free A4 PDFs, colour and black and white, in `public/printables/`: bedtime dua chart, weekly salah tracker, good deeds star chart, Ramadan countdown. Listed at `/printables` (no sign-in) and in the parent area. Children see a list-only page from Home, with no downloads.

- `src/printables/catalog.ts` is the data model. Each sheet belongs to a pack; `isPaid: true` on a pack hides it. No paywall or purchase flow exists.
- The 99 Names sheet is a placeholder (not listed) until a verified source and reviewer approval exist.
- `scripts/make-printables.mjs` renders the sheets with Edge so Arabic is shaped correctly. The dua text and deed names come from the imported data packs.

## Game levels

- Kindness Quiz: Gentle (4 questions, 2 choices), Standard (6, 3), Challenge (8, 4). Starts at the child's difficulty setting; finishing a level unlocks the next. Questions 5 to 8 are AI-drafted samples for review.
- Picture Matching: Level 1 (4 pairs), Level 2 (6 pairs, after Level 1), Super Matching (8 pairs, unlocked by a 7-day streak, with a "New game unlocked" moment). Best time per level.
- Levels and best times stay on the device. No public scores, no ranking.

## Deploy (live at https://deenstars-app.web.app)

Run inside `responsive-web/`:

```
npm run build
firebase deploy --only hosting --project deenstars-dev
```

Server changes (rules, functions, config) deploy from the repo root and are shared with the old prototype.
