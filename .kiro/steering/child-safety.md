---
inclusion: always
---

# Child privacy and safety rules

Full doc: `docs/CHILD_SAFETY.md`. Engineering plan only, legal review required before launch.

- Collect the minimum: nickname, birth month and year, avatar, age group, difficulty, time zone, progress. No real names, photos, voice, location, contacts, advertising ID or free-text from children.
- Parents own children's profiles. Children have no email, password or login.
- No messaging, comments, friends or user-generated content between children.
- No advertising, no behavioural tracking, no third-party analytics or attribution SDKs. Firebase Analytics stays off until reviewed.
- Leaderboards use system-generated names and avatars only, and never include child IDs or personal data in any response.
- Notifications go to the parent only.
- Links, purchases and leaving the app need a parental gate.
- Child data deletion must be complete (recursive) and tested.
- Logs, test data and admin views must not expose children's personal data. Use synthetic data outside production.
- Ask before adding any data field, permission, SDK or network host not already in `docs/CHILD_SAFETY.md`.
