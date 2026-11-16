# DeenStars – Child Privacy and Safety

Status: DRAFT for approval. Version 0.1. This document is an engineering plan, not legal advice. A qualified privacy lawyer must review it before launch (D-2, D-6).

## 1. Applicable regimes to review before launch

- **COPPA (US)**: children under 13. Verifiable parental consent, notice, data minimisation, deletion rights, limits on retention.
- **Apple App Store**: Kids Category rules (Guideline 1.3), privacy rules (5.1.4), privacy nutrition labels, Sign in with Apple, parental gates for links, purchases and permissions. Third-party analytics and advertising are heavily restricted in Kids Category apps.
- **GDPR and GDPR-K (EU)**, **UK GDPR and the UK Age Appropriate Design Code**: lawful basis, parental consent for under-age users (age threshold varies by country), DPIA recommended, data subject rights.
- Other: Canada PIPEDA, Australia Privacy Act. Decide launch countries first (D-6).
- Prize draws and competitions: local rules on contests for minors (D-10).

## 2. Data inventory (minimal)

| Data | Subject | Purpose | Stored where | Retention |
|---|---|---|---|---|
| Email, auth ID | Parent | Account | Firebase Auth | Until account deletion |
| Consent record | Parent | Prove consent | `parents/{uid}.consent` | Life of account + legally required period |
| Child nickname | Child | Display to parent and child | `children` | Until profile deletion |
| Birth month and year | Child | Age group | `children` | Until profile deletion |
| Avatar ID, age group, difficulty | Child | Experience | `children` | Until profile deletion |
| Time zone | Child | Day boundaries | `children` | Until profile deletion |
| Progress, stars, quiz and game results | Child | Function | child subcollections | Until profile deletion (or 24 months of inactivity, see §6) |
| Push token | Parent device | Parent notifications | `parents/{uid}/devices` | Until logout or 60 days stale |
| Prize delivery details | Parent | Fulfil prize | `prizeFulfilment` | Delete within 30 days of shipping |

Not collected: real names of children, photos, voice recordings, location, contacts, advertising ID, device fingerprinting, free-text from children, any user-generated content from children.

## 3. Hard rules

1. Parent owns and manages every child profile.
2. No child email, password or login.
3. No direct messaging, comments, friends or social features between children.
4. No location collection or use.
5. No behavioural advertising, no advertising SDKs, no attribution SDKs.
6. No third-party analytics SDK. Firebase Analytics is **off** (not linked) until reviewed. If later enabled for diagnostics, it is configured with no advertising ID, no personalisation and no child identifiers, and the privacy label is updated. Prefer first-party aggregate metrics.
7. No public personal profiles. Leaderboards show a system-generated nickname and avatar only.
8. No tracking, no `AppTrackingTransparency` prompt needed (and none should be added).
9. No external links, purchases or app-leaving flows from child mode without a parental gate.
10. Notifications go to the parent only.
11. No dark patterns: no manipulative countdowns, no streak loss, no guilt, no "come back" pressure to the child, no random paid rewards.
12. Permissions requested: notifications (parent only, asked in parent mode). No camera, microphone, photos or location.

## 4. Parental consent

- Consent is collected from the account owner before any child profile is created or child features enabled (see `USER_FLOWS.md`, step 4).
- Plain-language notice: what is collected, why, who can access, retention, deletion, contact, and that children's data is never sold or used for advertising.
- Verifiable parental consent method: needs a legal decision (D-2). Options under COPPA include a small card transaction, a signed form, knowledge-based checks or another FTC-approved method. Because DeenStars collects limited data and does not share data externally, the "email plus" method may apply only if data is used internally and is not disclosed. Legal review decides. The architecture stores `consent: {version, method, acceptedAt}` so the method can change.
- Consent is versioned. A new notice version requires re-consent before continued use.
- Separate consent items: (1) child profiles and progress, (2) optional leaderboard participation, (3) optional prize eligibility with physical prizes.
- A parent may withdraw consent at any time. Withdrawal leads to profile deletion or restriction.

## 5. Safety in the app

- Parent area protection: parental gate plus server-verified PIN (`AUTH_SECURITY.md`).
- Nickname rules: children's nicknames are private to the family. They are never shown on leaderboards. Leaderboard names come from a curated server list (adjective and noun), checked against a block list.
- Content safety: only approved content is served. No web views. No embedded third-party content.
- Screen-time: optional daily play limit set by parent, gentle "all done for today" screen, no rewards pressure to extend sessions, rewards daily caps for games and quizzes.
- Report content issue button (gated) for parents.
- Sensitive moments: no content on death, fear, punishment.

## 6. Retention and deletion

- **Child deletion** (parent request): `deleteChildProfile` marks `deletion.requestedAt`, starts a task, recursively deletes `children/{childId}` and subcollections, removes the leaderboard entry, removes the child from pending monthly candidate lists, and deletes any prize fulfilment details tied to that child. Completed within 7 days (target: minutes). A deletion receipt is notified to the parent.
- **Account deletion**: all children as above, then `parents/{uid}`, Firebase Auth user, Apple token revocation, push tokens, notifications.
- **Inactivity**: accounts without activity for 24 months get an email warning, then deletion of child data after 30 days with no response. Confirm with lawyer.
- **Backups**: deleted data ages out of backups within 30 days. This is stated in the privacy notice.
- **Audit and fraud records**: store only opaque IDs, keep for 12 months.
- **Data export**: parent can request a JSON export of child data.

## 7. Leaderboard and prizes safety

- Opt-in per child with its own consent text. Off by default. Opt-out is immediate.
- Anonymous only. No real names, photos, emails, addresses, schools or locations.
- Prize winners are contacted through the **parent email** on the account. Admin sees an internal reference, not the child's nickname linked to a name in public.
- Physical prize shipping address is collected only after a parent consents, kept separately and deleted after fulfilment.
- Published eligibility rules include: opt-in, age groups, how winners are chosen, tie-breaking, country eligibility, how to decline, and that participation without winning is celebrated.
- Local contest and sweepstakes law checks before the first monthly prize (D-10).

## 8. Children's data in logs and tools

- Logs use opaque IDs only. No nicknames or emails in logs.
- Admin staff see child-level data only through a role (`rewardsManager`) and only for monthly reviews. Access is audited.
- Emulator and test data are synthetic. No production data in dev or staging.

## 9. Incident response

A short runbook: detect, contain, assess, notify (parents, regulators within legal time limits), fix, review. Owner named before launch.

## 10. Pre-launch checklist

- [ ] Legal review of consent method, privacy notice, terms.
- [ ] Apple privacy nutrition label complete and accurate.
- [ ] Kids Category requirements checklist (age rating, no third-party tracking, parental gates).
- [ ] Data inventory reviewed against the final build (SDK audit, network traffic audit with a proxy).
- [ ] Deletion tested end-to-end.
- [ ] Leaderboard anonymity tested (no field in any response links to a child).
- [ ] DPIA (if EU or UK launch).
- [ ] Incident response owner named.
