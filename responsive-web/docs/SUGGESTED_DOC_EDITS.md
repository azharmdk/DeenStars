# Suggested edits to existing docs (not applied)

These files are outside `responsive-web/`, so they were left alone. Apply them if you agree.

| File | Current statement | Suggested change |
|---|---|---|
| `.kiro/steering/child-safety.md` | "No advertising, no behavioural tracking, no third-party analytics or attribution SDKs." | "No advertising to children and no behavioural tracking. Creator-reviewed brand partner links may appear on adult pages only (Welcome, Partners, Parent area), behind the parental gate. No third-party analytics or attribution SDKs." |
| `docs/CHILD_SAFETY.md` rule 5 | "No behavioural advertising, no advertising SDKs, no attribution SDKs." | Keep, and add: "Brand partner links are static, self-hosted and reviewed by the creator. They appear on adult surfaces only." |
| `docs/PRD.md` privacy line | "no third-party advertising or analytics SDKs." | Keep (still true). Add a line about brand partner links on adult pages. |
| `docs/OPEN_QUESTIONS_AND_RISKS.md` D-5 | Business model unspecified; "no ads" in Kids Category | Record: creator brand deals on adult surfaces. Check Apple Kids Category rules before any iOS release. |
| Consent screen (in code, done in `responsive-web`) | "No ads, no chat between children..." | Now "No ads shown to children, ... Parents may see links from our brand partners in grown-up areas only." Needs legal review. |
| `docs/AUTH_SECURITY.md` section 6 and `docs/FIREBASE_SCHEMA.md` | Published content is "read-only for signed-in users" | `duaLibrary`, `surahLibrary`, `stories` and `appConfiguration/bedtime` are now public read (website guest mode). All other content and config stay signed-in only. Writes remain functions-only. Applied in `firestore.rules` with tests in `functions/test/rules/rules.test.ts`. |
| `docs/ISLAMIC_CONTENT_POLICY.md` | Only Approved content may be published | Note: during QE, pending-review content is publicly readable on the test site, with the "pending scholar review" banner and `noindex`. Must be Approved before public launch. || `docs/FIREBASE_SCHEMA.md` and `docs/AUTH_SECURITY.md` | No `sponsors` collection; no `progress` or `badges` child subcollections | Add `sponsors/{id}` (admin-written, signed-in read), `appConfiguration/sponsors` and `appConfiguration/badges`, `children/{id}/progress/summary` and `children/{id}/badges/{id}` (Cloud Functions only). Ledger entries now carry `category`. |
| `docs/CHILD_SAFETY.md` | No sponsors section | Sponsor banners: parent area only, static same-origin images, no tracking or identifiers, guarded by `responsive-web/test/sponsors.test.ts`. Printables: no data collected; child Home lists them without downloads. |
| `docs/REWARDS.md` | Milestones listed as future server items | Day streak (a day counts when a checklist item earned stars) and badges from `appConfiguration/badges`, awarded by `onStarAwarded`. Never removed. |
