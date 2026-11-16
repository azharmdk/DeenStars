# DeenStars – Design System

Status: DRAFT for approval. Version 0.1.

Direction: playful, modern, clean, friendly, premium, Islamic-inspired. A calm preschool app with warm colour, big shapes and little text.

## 1. Colour tokens

Names are semantic. Hex values are starting points and must be checked for contrast on real devices.

| Token | Hex | Use |
|---|---|---|
| `emerald` | #0F8F6B | Primary brand, primary buttons |
| `emeraldDeep` | #0B6B52 | Text on light, pressed state |
| `mint` | #BDEBD9 | Soft backgrounds, success glow |
| `cream` | #FFF8E8 | App background |
| `sky` | #7CC4F2 | Secondary, learning |
| `gold` | #F6B51E | Stars, rewards |
| `lavender` | #B9A6EB | Quiz and games accents |
| `coral` | #FF7F6B | Accents, gentle highlight (never "error red") |
| `ink` | #24313A | Primary text |
| `inkSoft` | #5B6B76 | Secondary text |
| `card` | #FFFFFF | Cards |

Rules:
- Body text on `cream` or `card` uses `ink` (contrast above 7:1). White on `emerald` (#0F8F6B) is about 4.1:1, which passes AA for large text only. Buttons with regular-size labels use `emeraldDeep` (#0B6B52, above 7:1) as the fill.
- Gold text never sits on cream. Gold is for shapes and icons with a darker outline.
- Meaning is never carried by colour alone. Pair with icon or label.
- Dark mode: a deep-teal theme variant is planned for later. v1 ships a light theme, and is built with semantic tokens so dark can be added.

## 2. Typography

| Style | Size (pt, scales with Dynamic Type) | Font |
|---|---|---|
| `displayLarge` | 34 | Rounded, bold (SF Rounded, `.design(.rounded)`) |
| `title` | 26 | Rounded, bold |
| `headline` | 20 | Rounded, semibold |
| `body` | 17 | Rounded, regular |
| `caption` | 13 | Rounded, regular |
| `arabicLarge` | 36 | Bundled Naskh/Uthmani-style font, check license |
| `arabicBody` | 26 | Same |

- Use SF Rounded to avoid font licensing and loading cost. Arabic uses a bundled, properly licensed Quran-appropriate font. Selection is part of content review, since wrong diacritics change meaning.
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
