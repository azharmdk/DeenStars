# Current scope: responsive web only

The owner is building a responsive website, not the iOS app. Until the owner explicitly brings the app back into the conversation:

- Work only in `responsive-web/` (plus shared backend in `functions/`, `firestore.rules`, `firestore.indexes.json` when a web feature needs it).
- Do not touch `web/` (phone-width reference prototype) or any iOS work.
- Do not raise iOS build, SwiftUI or App Store concerns.

# Decisions recorded (website)

- Age groups stay in the data model and publish gate but are not shown in the UI. No age filters or age grouping. The site should feel suited to elementary-age children without saying so. Stories show the note: "If you are younger, ask your mother or father to help you read."
- The two dua texts the owner supplied (before eating, and if forgotten) are treated as reviewer-approved. Other Arabic or religious text must still come from verified content, never typed by AI.
- Analytics are first-party and aggregate only. No per-child navigation paths. Location no finer than country unless the owner and legal review say otherwise.
- Game ideas beyond "Find the Mosque" are architecture only, with gentle feedback (no deductions, no failure screens).
- Order of work: item 4 (Dua Corner) first. The rest in any order.
