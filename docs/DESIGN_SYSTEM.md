# DeenStars – Design System

Status: DRAFT. Version 0.2 (revised after QE feedback that v0.1 looked generic and AI-made).

Direction: modern, calm and professional, with Islamic-inspired detail used sparingly. Warmth comes from layout, type and a few well-chosen accents, not from many bright colours.

v0.2 changes:
- No emoji as icons anywhere. One icon family (Lucide in the web prototype, SF Symbols in iOS) until a commissioned DeenStars icon and illustration set exists.
- Restrained palette: one deep green primary, warm neutrals, one gold accent for stars. Category colours are muted tints with a darker foreground.
- No gradients. Subtle 1 px borders instead of heavy shadows. Tighter radii (20 / 14 / 10).
- A real typeface (Plus Jakarta Sans in the prototype) instead of a rounded system font.
- The cartoon mascot is replaced by a crescent-and-star brand mark until a professional mascot is commissioned (D-4).
- A subtle eight-point star lattice is the only decorative pattern, used on brand surfaces.

## 1. Colour tokens

Names are semantic. Values are mirrored in `web/src/styles.css` and must be mirrored in the SwiftUI `DSDesignSystem`.

| Token | Hex | Use |
|---|---|---|
| `primary` | #0E5C4F | Brand, primary buttons, active states |
| `primaryStrong` | #0A463C | Pressed state |
| `primarySoft` | #E4F0EC | Soft fills, done states |
| `accent` | #C98A12 | Stars and rewards only |
| `accentSoft` | #FBF1DC | Reward highlights |
| `bg` | #F7F5F0 | App background (warm neutral) |
| `surface` | #FFFFFF | Cards, lists |
| `surface2` | #F1EEE7 | Segmented controls, subtle fills |
| `border` | #E6E1D6 | Card and list borders |
| `ink` | #1B2A28 | Primary text |
| `ink2` | #566462 | Secondary text |
| `ink3` | #8B9593 | Tertiary text, inactive icons |
| `danger` | #A23A2C | Destructive actions (parent area only) |

Category tints (foreground / background): Habits #2F7D5B / #E6F2EC, Salah #2F5D8A / #E5EDF6, Quran #4A4F96 / #ECEBF7, Duas #9A6410 / #FBF1DC, Manners #A1475A / #F8E8EB, Good Deeds #1F7377 / #E2F1F1, Jummah #2A3A6A / #E6EAF4.

Rules:
- White on `primary` is above 7:1. Body text uses `ink` on `bg` or `surface` (above 12:1).
- Gold is never used for text on light backgrounds. It marks stars and rewards.
- Meaning is never carried by colour alone. Pair with an icon or label.
- No red in child mode. Errors in child mode use calm neutral notices.
- Dark mode later. Semantic tokens make it possible.

## 2. Typography

| Style | Size (pt, scales with Dynamic Type) | Weight |
|---|---|---|
| `display` | 34 | 750 |
| `title` | 28 | 750, tracking -2% |
| `headline` | 21 | 700 |
| `body` | 16 | 400 |
| `label` | 14 | 700 |
| `eyebrow` | 12, uppercase, tracking +8% | 700 |
| `arabicLarge` | 36 | Bundled Naskh/Uthmani-style font, check licence |
| `arabicBody` | 26 | Same |

- Web prototype: Plus Jakarta Sans (OFL), self-hosted, no font CDN requests. iOS: choose between SF Pro and a licensed bundled brand face before Phase 1. Arabic uses a bundled, properly licensed Quran-appropriate font. Selection is part of content review, since wrong diacritics change meaning.
- Support Dynamic Type up to `accessibility3` on parent screens. Child screens support up to `xxxLarge` with layouts that reflow.
- Line height at least 1.3 for Arabic to keep diacritics from clipping.

## 3. Spacing, shape, elevation

- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Corner radius: cards 24, buttons 28 (pill), chips 16.
- Shadows: soft, low-opacity (`black 8%`, blur 12, y 4). No harsh borders.
- Child touch targets 60 pt minimum, parent 44 pt minimum.

## 4. Components (in `DSDesignSystem`)

| Component | Notes |
|---|---|
| `DSButton` (primary, secondary, ghost, child-large) | Pill, press animation, haptic, 60 pt child size |
| `DSCard` | Rounded, soft shadow, optional illustration slot |
| `DSStarBadge` / `DSStarJar` | Animated star count, reduce-motion aware |
| `DSProgressRing`, `DSProgressDots`, `DSLanternPath` | Progress for checklist, quiz, Jummah |
| `DSTaskRow` | Illustration, title, status chip, stars |
| `DSAnswerOption` | Large option with picture or text, correct/gentle states |
| `DSMascotView` | States: wave, cheer, think, sleep. Lottie-free by default, SwiftUI-drawn or image sequences |
| `DSAudioButton` | Speaker with playing state, VoiceOver label |
| `DSArabicText` | Handles RTL, font, size, line height, selectable off |
| `DSSourceChip` | "Verified source" chip, opens parent-gated source sheet |
| `DSConfetti` | Gentle, short, respects reduce motion |
| `DSTabBar` | Large icons, labels always visible |
| `DSParentalGate`, `DSPinPad` | Parent area |
| `DSEmptyState`, `DSGentleError` | Friendly, no red alarm screens |
| `DSSheet` | Detail sheets with large grabber |

## 5. Motion and sound

- Durations 0.2–0.6 s, spring animations, no flashing. Respect `accessibilityReduceMotion` (fade instead of bounce).
- Star earn: star floats to jar, soft chime. Max one celebration per action.
- Sound is off by default only if the device is on silent. A parent toggle controls sound effects. Narration is controlled separately.
- No flashing content at rates that could trigger photosensitivity (stay under 3 flashes per second, ideally none).
- Haptics are light and optional.

## 6. Illustration and imagery rules

- Style: flat, rounded, friendly shapes, soft gradients. Consistent line weight.
- Motifs: crescent moon, lantern, masjid, dome, stars, dates, prayer mat, Quran stand, garden, desert-night, camels, cats, rainbow.
- **Never depict any Prophet** (including Prophet Muhammad ﷺ) or the Companions in any form. No faces for them, no silhouettes, no flames or light shapes representing them.
- Do not depict Allah in any form.
- Children and family characters are fine as stylised figures. Model clothing modestly. Offer diverse skin tones and family compositions.
- Whether the mascot is a character figure or an animal is decision D-4. Many families prefer not to have lifelike living figures, so the recommended default is a friendly **non-human mascot** (such as a small star or lantern character) with optional child characters.
- Alt text and VoiceOver labels required for every illustration asset.
- Pictures that teach something religious (masjid, prayer movements) get the same review as text.

## 7. Accessibility checklist

- VoiceOver labels and hints for all controls, correct reading order, custom actions for task rows.
- All audio content has an on-screen text equivalent, and all on-screen content that matters has audio for ages 3–4.
- Dynamic Type, Bold Text, Increase Contrast, Reduce Motion, Reduce Transparency, Switch Control and Voice Control supported.
- Games offer a tap alternative to drag and drop.
- Colour-blind safe: shapes and icons accompany colour.
- Test with Accessibility Inspector and on-device VoiceOver for each release (`TESTING.md`).

## 8. App icon and brand
Emerald background, gold star with crescent, rounded. Name check for trademark clashes is an open item.

## 9. Tooling
- Design source files in Figma (not stored in repo, link tracked in docs). Export tokens to `DSDesignSystem/Tokens` Swift file by hand in v1.
- SwiftUI previews required for each component in light, large text, and reduced motion variants.
