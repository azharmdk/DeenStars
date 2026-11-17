# DeenStars – Islamic Content Policy: Trusted Sources and Review Rules

Status: DRAFT for approval. Version 0.1. **Non-negotiable.** The policy owner and the reviewer panel must be named before content work starts (D-8).

## 1. Scope

Applies to every item a child or parent could read, hear or see that makes or implies a religious claim: duas, Surahs, quiz questions and answers, games, stories, checklist task explanations, milestone descriptions, mascot dialogue, illustrations that teach religion, audio, notifications and the App Store listing text.

## 2. Trusted sources (in priority order)

1. The Holy Quran (Arabic text from a verified digital edition, see §4).
2. Sahih al-Bukhari.
3. Sahih Muslim.
4. Other recognised Hadith collections, only after authenticity is checked and graded by a recognised scholar or source.
5. Established Islamic scholarship, where interpretation is needed. The reviewer names the source.
6. Reliable Islamic educational references for supplementary explanations (for example established children's Islamic education publishers). Cannot be the sole source for a religious ruling, or for a religious claim.

## 3. Hard rules

1. Never invent Quranic verses.
2. Never invent Hadith.
3. Never attribute unverified statements to any Prophet.
4. Never present weak or fabricated narrations as authentic.
5. Distinguish established facts from historical traditions. Wording such as "Muslims believe" or "it is reported" is used where appropriate.
6. Avoid disputed jurisprudential questions for preschool children (for example details of prayer positions where schools differ, the ruling on specific actions, or music). Where a practice varies, the content says "Your family may do it a little differently. Ask your parents."
7. Use respectful terminology: "Allah", "Prophet Muhammad ﷺ", "peace be upon him" form per style guide, and respectful reference to other Prophets (عليه السلام) in text and audio.
8. Never depict any Prophet or Allah visually.
9. Do not auto-publish AI-generated religious content. AI may draft. AI never approves.
10. Simplify wording, never meaning. Questions must not be ambiguous in a way that distorts belief. Example: "Who is our Prophet?" is not allowed. "Who is the last Prophet and Messenger of Allah?" is.
11. Teach that Muslims believe in all of Allah's Prophets.
12. Obligations vs. learning: the app presents age-appropriate learning and habits. It does not state that a child is sinful or deficient. Adult obligations (for example Jummah attendance) are labelled "With family, grown-ups decide".
13. No fear-based or punishment-based religious messaging for children (for example hellfire warnings) in v1.

## 4. Source registry and reference formats

Approved editions are recorded in the admin portal `sourceRegistry` before use.

### 4.1 Quran reference (required fields)
```
{ type: "quran", surahNumber, surahName, ayahStart, ayahEnd,
  arabicText (verified), arabicEdition (e.g. named digital Uthmani edition),
  translationText, translationSource (translator + edition + licence),
  verifiedBy, verifiedAt }
```
Arabic text must be imported from a verified digital edition by ID and **not typed by hand**. The admin portal shows the imported text beside the reference for the reviewer to compare. Recommended candidates: Tanzil project, or the King Fahd Complex digital text. Confirm licence terms (D-9).

### 4.2 Hadith reference (required fields)
```
{ type: "hadith", collection, bookNumber/bookName, chapter, hadithNumber,
  numberingSystem (e.g. in-book, USC-MSA), narrator,
  arabicText, translationText, translationSource,
  authenticityGrading (sahih|hasan|daif|…), gradedBy, verificationStatus }
```
Only `sahih` or in some cases `hasan` hadith are used for religious teaching to children, and only after reviewer sign-off. Weak narrations (`daif`) are not used in v1.

### 4.3 Scholarly or educational reference
```
{ type: "scholarly", title, author, publisher, edition, pageOrSection, url?, reviewerNote }
```

### 4.4 Duas
Each dua must link to a Quran or Hadith reference. A dua from popular practice without a verified primary source is not published. The reference identifies the exact wording of the narration, and the Arabic text matches the cited narration.

### 4.5 Audio
- Recitation of the Quran and duas must come from a reciter with a clear licence for use in a commercial children's app (`audioRights`).
- The reviewer listens to every audio file against the approved text, checking pronunciation and tajweed basics.
- Text-to-speech must not be used for Quran or duas. It can be used for non-religious UI prompts only if approved.

### 4.6 Illustrations
No Prophet depiction. Reviewer checks masjid, prayer, hajj, Kaaba and Quran illustrations for accuracy (for example respectful handling of the Quran, the Kaaba drawn accurately, modest clothing in prayer scenes). The reviewer lists the specific checks in the style guide.

## 5. Content record (applies to all religious items)

| Field | Notes |
|---|---|
| contentId | Stable, never reused |
| contentType | `dua`, `surah`, `quizQuestion`, `activity`, `gameContent`, `story`, `milestone`, `explanation`, `audio`, `illustration` |
| title | |
| questionOrActivity | |
| correctAnswer | For quiz items |
| explanation | |
| sourceType | `quran`, `hadith`, `scholarly`, `educational` |
| sourceReference | One or more reference objects (§4) |
| ageGroup | `3-4`, `5`, `6` |
| difficulty | |
| reviewer | UID of a user with the `reviewer` role |
| reviewStatus | `draft`, `pendingReview`, `approved`, `rejected`, `archived` |
| reviewDate | |
| version | Integer, increments on every change after approval |

## 6. Review workflow

```
Draft ──submit──► Pending Review ──approve──► Approved ──publish──► Live
  ▲                    │                         │
  └──── Rejected ◄─────┘                         └── edit ──► new version = Draft
                                     Archived ◄── retire (kept for audit, not served)
```

- Roles: `editor` drafts and submits. `reviewer` approves or rejects. `publisher` (admin) publishes. An editor cannot review their own item. A reviewer cannot be the author of the item they review.
- Reviewer qualification: a person with recognised Islamic studies training, named in the admin portal profile (`qualification`, `institution`). Minimum two reviewers for v1 launch content, so a second opinion is available for anything contested.
- Reviewer screen shows: the item, the source reference with the **verified source text next to the item text**, a link or scan to the original, the diff from the previous version, and checklist items (text matches source, translation faithful, wording unambiguous, age-appropriate, no depiction issues, audio matches text).
- Approval records a `contentReviewRecord` with `sourceSnapshotHash` so any later change to the underlying text invalidates approval.
- Any edit to approved religious content creates version n+1 as `draft` and the old version stays live until the new one is approved. Typo fixes in non-religious fields (such as `sortOrder`) do not trigger review. A field-level list defines which fields are "religious fields".
- Rejected items keep reviewer notes. Archived items are not served but stay in the audit log.

## 7. Automated publish gate (`validateContentForPublish`)

Publishing is blocked when any of the following is true:

| Check | Rule |
|---|---|
| Missing source | Religious item has no `sourceReference` |
| Incomplete reference | Required fields in §4 missing, e.g. no ayah number or no hadith number and no alternative locator |
| Unverified text | Quran Arabic text does not match the registry text byte for byte (after normalisation) |
| Hadith grading | No grading or grading below allowed level |
| Not approved | `reviewStatus != approved` or review record version != content version |
| Self-review | Reviewer uid equals author uid |
| Stale review | `sourceSnapshotHash` mismatch |
| Quiz validity | Answer index out of range, no correct answer, more than one correct for single-choice, fewer or more options than the age rule, an option duplicates another |
| Duplicate question | Normalised text similarity above threshold with an existing live or pending question (exact and near-duplicate) |
| Metadata | Missing age group, difficulty, category, illustration alt text, or an age group not allowed for the format |
| Audio | Religious audio has no `audioRights`, or its transcript does not match the approved text |
| Prohibited terms | A configurable list (for example disallowed phrases, fear-based wording) |
| Dependencies | Referenced illustration, audio or source is missing |

Failures produce a readable report in the admin portal. The publish function re-runs checks server-side. The UI cannot bypass it.

## 8. Ongoing quality

- Parents can report an error from a gated "Report a content issue" button that sends the content ID and version, no personal data. Reports create a review task.
- Content on live is re-reviewed on a schedule (every 12 months), or sooner when reported.
- Corrections: when an error is found, the item is unpublished immediately (kill switch), reviewed, and republished as a new version.
- Seasonal content (Ramadan and Eid) is reviewed before the season starts.

## 9. AI usage policy

- Allowed: draft question ideas, simplify language, suggest illustration briefs, translate drafts for human review.
- Not allowed: producing or "verifying" Arabic text, citing references that a human has not opened, approving content.
- Anything AI drafts is tagged `draftOrigin: "ai-assisted"` in the draft record, and the reviewer sees the tag.
- AI-drafted references are treated as unverified until the reviewer opens the original source.

## 10. Seed content (Phase 2 onwards)

No religious seed content is written into the app or the repository by AI without human verification. The first content set (about 30 checklist items, 12 duas, 3 short Surahs, 60 quiz questions, 8 game content packs) is drafted by the content team, reviewed under this policy, and imported with the admin tool or a seed script. Placeholder items in development builds are marked `isPlaceholder: true` and cannot be published to staging or production.

## 11. Sources in use (decision 2026-11: free and open sources only, no permission requests for now)

Arabic text and audio are always imported from these sources by reference, never typed by hand. Each stored item keeps its source, edition and item ID so a reviewer can open the original.

| Content | Source | Licence or terms | Notes |
|---|---|---|---|
| Quran Arabic text | Tanzil Project, Uthmani text, served by the AlQuran Cloud API (`quran-uthmani`) | CC BY 3.0. Verbatim only, credit Tanzil and link to tanzil.net | Never modified. Display changes are UI only |
| Quran English translation | Marmaduke Pickthall, *The Meaning of the Glorious Koran* (1930), via AlQuran Cloud (`en.pickthall`) | Public domain (US: published 1930; author died 1936) | Old-fashioned wording. Kid-friendly wording lives in our own UI copy, never inside the translation |
| Quran transliteration | AlQuran Cloud (`en.transliteration`) | Free to use, no stated licence | Confirm before public launch |
| Quran recitation | Sheikh Mahmoud Khalil al-Husary (Murattal) and Sheikh al-Husayni al-Azazi with children, from the Islamic Network CDN used by AlQuran Cloud and EveryAyah | Free to use, no stated licence | Files are copied to DeenStars hosting so the app contacts no third-party hosts. Confirm before public launch |
| Duas (Arabic, English meaning, audio) | *Hisn al-Muslim* (Fortress of the Muslim) by Sa'id ibn Ali ibn Wahf al-Qahtani, via the hisnmuslim.com API | Free to use, no stated licence | Human-recorded audio. Copied to DeenStars hosting (the source serves plain HTTP). The API has no hadith references, so the reviewer adds the collection and number from Sunnah.com before production |
| Prophet stories | References only: the Quran verses listed on each story scene, with Ibn Kathir's *Tafsir* and *Qisas al-Anbiya* for context | Story wording is written by the DeenStars team (AI-assisted draft) | Each scene cites its verses. No invented dialogue or events. Status "pending scholar review" until approved |
| Story and scene images | Original DeenStars vector scenes drawn in code (no generative AI images) | Owned by DeenStars | No human or Prophet figures at all in Prophet stories: only scenery, animals and objects |
| Hijri calendar | Umm al-Qura calendar from the Unicode CLDR / ICU data built into browsers and Node | Open (Unicode licence) | Per-country day adjustment, set by admin, plus a parent adjustment of plus or minus one day |

Rules that follow from the sources:
- **No synthetic voices.** No text-to-speech or AI audio anywhere in the app. Audio exists only where a human qari or reciter recording exists. Stories are read aloud by the parent.
- Dev and QE builds may show sourced items with status "pending scholar review", clearly labelled. Staging and production show only approved items (§6 and §7).
- Licences marked "confirm before public launch" are tracked in `OPEN_QUESTIONS_AND_RISKS.md` (D-9).
