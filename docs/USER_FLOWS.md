# DeenStars – Navigation and User Flows

Status: DRAFT for approval. Version 0.1. Wireframes are in `WIREFRAMES.md`.

## 1. App state machine

```
Launch
  ├─ no session ───────────────► Welcome ► Sign in / Register
  ├─ signed in, email unverified ► Verify email
  ├─ signed in, no consent ─────► Privacy & Consent ► Parent PIN ► Create first child
  ├─ signed in, no child ───────► Create first child
  └─ ready ─────────────────────► Profile picker ("Who is learning today?")
                                   ├─ choose child ► CHILD MODE (5 tabs)
                                   └─ Grown-ups ► Parental gate ► PIN ► PARENT MODE
```

Child mode → parent mode always passes the parental gate and the PIN. Parent mode returns to the profile picker.

## 2. Onboarding (parent, first launch)

1. **Welcome**: mascot, tagline, "Get started". "I already have an account".
2. **Create account**: Sign in with Apple, or email and password. Link to privacy notice.
3. **Verify email** (email path only).
4. **Privacy and consent**: plain-language summary of what is collected, why, who sees it (only the parent), what is never done (ads, messaging, location, public profiles). Parent confirms they are the parent or legal guardian. Consent method per D-2 (verifiable parental consent). Stores `consent.version`.
5. **Set parent PIN** (and optional Face ID).
6. **Create child profile**: nickname, birth month and year, avatar, age group (suggested from age, editable), difficulty (Gentle, Standard, Challenge), time zone (auto). No real name needed.
7. **Parent tips**: "Sit with your 3–4 year old", how approvals work, how to turn on the optional leaderboard (off by default).
8. **Hand to child**: "Pass the phone to <nickname>" → Child Home with a mascot welcome.

Child onboarding is a short mascot tour of five tabs, with audio. It can be skipped by a parent.

## 3. Child mode

Tabs (large icons, one word each): **Home · Checklist · Play · Stars · Me**.

### 3.1 Home
- Mascot greeting by time of day, with audio.
- Today's star jar (animated), "Good Deed of the Day" card, "Today's checklist" progress ring, Friday banner on Fridays, current weekly challenge, "Learn a dua" shortcut.
- A gentle "All done for today" state shows when the child reaches the parent's daily play limit. No guilt copy.

### 3.2 Checklist
- Category tiles (Habits, Salah, Quran, Duas, Manners, Good Deeds). Fridays show Jummah first.
- Tap item → detail sheet: picture, short audio, "I did it!" button.
- Self-reported: star burst animation, stars added (after the server confirms, with an optimistic "saving" glow).
- Parent-approved: button text "Ask Mommy or Daddy", item shows a "Waiting for a grown-up" badge. On approval the child sees a celebration the next time the app opens.
- Declined: "Let's do it together" and the item returns to todo.
- Age 3–4: parent-assist banner, fewer items, audio-first.

### 3.3 Play & Learn
- Grid of game cards and a Quizzes entry. Filtered by age group and difficulty.
- Game host: intro audio → play → gentle feedback → celebration → "Play again" or "Back".
- Quiz host: question card, answer options, immediate feedback, explanation, progress dots, finish screen.

### 3.4 Achievements ("Stars")
- Star jar totals (today, week, month, all time) shown as a picture, not a score table.
- Milestones grid by category, locked items show a soft silhouette and a hint, never "you failed".
- Badges shelf, weekly Jummah Hero.
- If leaderboard is enabled: "Weekly Stars Friends" board (anonymous). Otherwise only personal progress.

### 3.5 Me (child profile)
- Avatar, nickname, My Duas (progress), My Surahs, favourite games. Sound and haptics toggle. No settings that need adult control are shown here.
- "Grown-ups" button (small, bottom corner) → parental gate.

## 4. Key child journeys

### J1: Complete a self-reported task
Checklist → tap "Say Bismillah before eating" → listen → "I did it!" → `completeActivity` → stars +2 → animation → item turns to check.
Offline: item shows "saved on this phone", sync later. Server result replaces the optimistic state.

### J2: Complete a parent-approved task
Checklist → "Help a friend" → "Ask Mommy or Daddy" → `completeActivity` → pending → parent gets a notification (if enabled) → parent approves → stars awarded → child sees star celebration on next open.

### J3: Learn a dua
Me or Home → Dua Corner → pick dua → listen line by line → "I'm learning this" (state Learning) → practise with the repeat-after-me mode (Practising) → parent can confirm "Learned" from the parent dashboard.

### J4: Quiz
Play → Quizzes → category → 5 questions (3–4 for ages 3–4) → feedback and explanation each → finish → participation stars (capped) → "Try another" or "Done".

### J5: Friday
Home shows the Friday banner → Jummah screen: progress path with lanterns, activities flagged "Learning activity" or "With family" → Jummah Hero badge on completion of the required subset set by configuration.

## 5. Parent mode

Reached through gate and PIN. Bottom tabs: **Overview · Approvals · Children · Reports · Settings**.

- **Overview**: today across children, pending approvals count, stars, quick links.
- **Approvals**: grouped by child. Each row shows the task and when. Approve, decline, "approve all for <child>". Decline offers an optional encouraging message from a short list.
- **Children**: add, edit, delete child. Age group, difficulty, checklist customisation (hide or add own tasks), leaderboard opt-in, dua and surah confirmation.
- **Reports**: weekly and monthly. Stars by category, dua and Surah progress, quiz and game summary, active days. Phrased positively and with a "time spent" figure shown only if the parent enables it.
- **Settings**: notifications (approvals, weekly report, Friday reminder), privacy (consent history, data export, deletion), PIN, account (email, logout, delete account), daily play limit, support, legal.

## 6. Leaderboard opt-in flow
Children → child → Leaderboard → explanation screen (what is shown, what is not) → PIN session → confirm → system picks anonymous nickname and avatar → child sees the board next time. Opt-out removes the entry immediately and at the next ranking build.

## 7. Account and data flows
- **Delete child**: Children → child → Delete → type child nickname to confirm → PIN session → `deleteChildProfile` → progress screen → confirmation notice.
- **Delete account**: Settings → Delete account → re-authenticate → confirm → `deleteAccount` job → Apple token revocation → sign out.
- **Export data**: Settings → Privacy → Export → email link or file share.

## 8. Error and empty states (child-safe)
- No red error screens in child mode. Use a friendly mascot and "Let's try again in a moment".
- No content yet: "New stars are coming soon".
- Offline: quiet cloud icon. Features that need data not cached show a gentle message.

## 9. Notifications (parent only)
Approval requests (batched, not per tap), weekly report, optional Friday reminder, monthly results. Quiet hours default 20:00–07:00. No notifications are sent to a child-facing context. Each type is individually switchable.
