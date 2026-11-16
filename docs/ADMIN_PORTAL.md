# DeenStars – Admin Portal and Content Management

Status: DRAFT for approval. Version 0.1. Built in Phase 7. Content approval infrastructure (collections, review records, publish gate) is built from Phase 1 so that no unreviewed content is ever served.

## 1. Technology
- React, TypeScript, Vite, Firebase Hosting.
- Authentication via an admin identity tenant with MFA (see `AUTH_SECURITY.md` §1).
- All writes go through callable Cloud Functions (never direct Firestore writes from the browser), so validation, RBAC, audit logging and the publish gate live in one place.
- Environment banner (dev, staging, prod) on every page.

## 2. Roles (RBAC via custom claims)

| Role | Can do |
|---|---|
| `editor` | Create and edit drafts, upload audio and images to staging, submit for review |
| `reviewer` | See pending items with source tooling, approve or reject with notes. Cannot approve own drafts. Qualification recorded on profile |
| `publisher` | Publish approved content, schedule publication, unpublish (kill switch) |
| `rewardsManager` | View leaderboards, candidates, flags, prepare winners, record rewards |
| `admin` | Manage users and roles, configure star values and ranking rules, approve monthly winners (second approver), see audit log |
| `support` (read-only, optional) | View anonymised parent-level support information |

Role changes are admin-only, audited, and applied through custom claims. At least two `reviewer` accounts exist before launch.

## 3. Modules

| Module | Functions |
|---|---|
| Dashboard | Pending reviews, failed publish checks, reported issues, content versions live |
| Activities | CRUD for checklist items, age groups, Jummah items, star rule, verification type, illustration and audio |
| Duas and Surahs | Import verified text by source ID, transliteration, translation, audio, source reference |
| Quiz questions and quizzes | Question editor per format, answer editor, preview in the iOS-like renderer, duplicate finder |
| Games | Game config and content packs per template, preview |
| Milestones and badges | Conditions builder (form, not code), badge art, retroactive run preview |
| Weekly challenges | Schedule, activities, completion rules, badge |
| Star configuration | Edit `appConfiguration/rewards`. Changes versioned with diff and second-admin approval |
| Leaderboards | View live and final boards, flags, exclusions |
| Monthly winners | Candidates, eligibility checks, flags, approve, publish, record rewards |
| Announcements | Parent-facing announcements, scheduled |
| Source registry | Approved Quran and Hadith editions, imported text, licence notes |
| Reported issues | Parent reports of content problems |
| Audit log | Searchable, read-only, exportable |

## 4. Content lifecycle

```
Draft → Pending Review → Approved → Published (live, contentVersion++)
                │             │
             Rejected      Edit → new draft version (old stays live until the new one is published)
                              Archive → removed from clients
```

- Editors work in `contentDrafts/{draftId}` with `status` and `version`.
- `submitForReview` freezes the draft (copy-on-write) and creates a `contentReviewRecord`.
- The reviewer opens the item. Source panel shows the imported verified text next to the item text, link to the original source, translation source and grading. The reviewer ticks the review checklist and approves or rejects. Reject requires notes.
- `publishContent` runs `validateContentForPublish` (`ISLAMIC_CONTENT_POLICY.md` §7). Pass → writes to the read-only published collection and increments the content version in `appConfiguration/content`.
- Unpublish and rollback: "Kill switch" removes a live item at once (sets published doc `status: archived`) and bumps the version. The app drops it at the next sync.
- Scheduled publication for seasonal content (Ramadan, Eid) and weekly challenges.

## 5. Automated checks

Run on save (warnings), on submit (blocking for incomplete data) and on publish (blocking, authoritative).

- Missing or incomplete sources and references.
- Source text mismatch against the registry.
- Unapproved religious content or stale review.
- Invalid quiz answers and age-rule violations.
- Duplicate or near-duplicate questions.
- Metadata errors (age group, difficulty, category, alt text).
- Asset checks: file type, size, duration for audio, image dimensions, existence.
- Cross-reference checks: milestone badges, challenge activities, dua IDs in games exist and are published.

## 6. Audit trail

Every admin callable appends to `auditLog` (append-only, no client writes, no deletes):

```
{ entryId, at, actorUid, actorRole, action, targetType, targetId, version,
  before (hash and diff summary), after (hash and diff summary), reason, requestId }
```

Audited actions include content edits, submissions, review decisions, publishing, role changes, configuration changes, winner approval and publication, prize records, and any access to child-level candidate data.

## 7. Monthly rewards workflow in the portal
1. `computeMonthlyCandidates` result appears (state `candidates`).
2. Rewards manager reviews each category, eligibility checks (opt-in, age group, consent, country) and flags. Notes recorded.
3. Rewards manager moves to `underReview`, then requests approval.
4. An `admin` (second person) approves.
5. Publish: public results are generated from anonymous data.
6. Prize fulfilment tasks: contact parent, record consent, record dispatch, close. Delivery details purge date shown.
7. Monthly report export (aggregate only).

## 8. Data access and privacy in the portal
- Admins see child data only in monthly candidate screens, with internal references. Nicknames chosen by parents are hidden from admin screens by default.
- No bulk export of child-level data.
- Portal sessions time out after 30 minutes. Re-authentication required for role changes and winner approval.

## 9. Seed and migration tools
- CLI `seed` scripts load reviewed content packs (JSON) into `contentDrafts` for review. They never publish directly.
- Import tool for Quran text from the registry by `(surah, ayah range)`. Content authors cannot type Arabic Quran text into the form directly.

## 10. Build order
1. (Phase 1) Collections, rules, publish gate functions, a minimal CLI for seeding drafts and approving in the emulator.
2. (Phase 7) Full web portal.
Until the portal exists, content approval uses the CLI with the same functions, logged identically.
