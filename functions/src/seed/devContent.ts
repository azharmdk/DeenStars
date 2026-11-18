/**
 * DEV-ONLY PLACEHOLDER CONTENT for the QE prototype.
 * Every religious item here is marked isPlaceholder: true and says "sample, not reviewed".
 * No Quran text, Hadith or dua wording is included. Real content must go through the review
 * workflow in docs/ISLAMIC_CONTENT_POLICY.md. The publish gate must reject placeholders in
 * staging and production.
 */

export const devRewardsConfig = {
  configVersion: 2,
  rules: {
    habit_simple: { stars: 2, perSourcePerDay: 1 },
    manners: { stars: 3, perSourcePerDay: 1 },
    good_deed: { stars: 5, perSourcePerDay: 1 },
    dua_learning: { stars: 5, perSourcePerDay: 1 },
    surah_learning: { stars: 5, perSourcePerDay: 1 },
    jummah_challenge: { stars: 10, perSourcePerDay: 1 },
    quiz_completion: { stars: 3, perSourcePerDay: 1, dailyCap: 9 },
    game_completion: { stars: 2, perSourcePerDay: 1, dailyCap: 8 },
  },
  leaderboard: { weeklyGameQuizCap: 20, parentCustomLeaderboardEligible: false },
};

type Category = "dailyHabit" | "salah" | "quran" | "dua" | "manners" | "goodDeed" | "jummah";

interface Seed {
  id: string;
  title: string;
  category: Category;
  ruleKey: string;
  verification: "self" | "parent";
  ages: ("3-4" | "5" | "6")[];
  frequency?: "daily" | "jummahOnly" | "ramadanOnly" | "eidOnly";
  /** "Do it together" deeds: designed for parent and child jointly. */
  together?: boolean;
  /** Weekly theme this deed belongs to (shown on the theme card). */
  themeId?: string;
}

const ALL: Seed["ages"] = ["3-4", "5", "6"];
const OLDER: Seed["ages"] = ["5", "6"];

const seeds: Seed[] = [
  { id: "act_habit_bismillah_eat", title: "Say Bismillah before eating", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL },
  { id: "act_habit_alhamdulillah_eat", title: "Say Alhamdulillah after eating", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL },
  { id: "act_habit_salam", title: "Say Assalamu Alaikum", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL },
  { id: "act_habit_remember_allah", title: "Remember Allah during the day", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: OLDER },
  { id: "act_salah_names", title: "Learn the names of the five daily prayers", category: "salah", ruleKey: "habit_simple", verification: "parent", ages: OLDER },
  { id: "act_salah_family", title: "Join family prayer routine", category: "salah", ruleKey: "habit_simple", verification: "parent", ages: ALL, together: true },
  // Wording to be confirmed by the content reviewer: learning framing for young children, not obligation.
  { id: "act_salah_fajr_family", title: "Pray Fajr with family", category: "salah", ruleKey: "habit_simple", verification: "parent", ages: OLDER, together: true },
  { id: "act_quran_listen", title: "Listen to a short Quran recitation", category: "quran", ruleKey: "habit_simple", verification: "parent", ages: ALL },
  { id: "act_quran_practise", title: "Practise a familiar Surah", category: "quran", ruleKey: "habit_simple", verification: "parent", ages: ["6"] },
  { id: "act_manners_listen", title: "Listen to parents", category: "manners", ruleKey: "manners", verification: "parent", ages: ALL },
  { id: "act_manners_kind_words", title: "Speak kindly", category: "manners", ruleKey: "manners", verification: "self", ages: ALL },
  { id: "act_manners_please_thanks", title: "Say please and thank you", category: "manners", ruleKey: "manners", verification: "self", ages: ALL },
  { id: "act_manners_share_toys", title: "Share toys", category: "manners", ruleKey: "manners", verification: "parent", ages: ALL },
  { id: "act_deed_help_parents", title: "Help Mommy or Daddy", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL },
  { id: "act_deed_set_table", title: "Help set the table", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true },
  { id: "act_deed_toys_away", title: "Put toys away", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL },
  { id: "act_deed_make_smile", title: "Make someone smile", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL },
  { id: "act_deed_charity", title: "Give charity with parents", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: OLDER, together: true },
  { id: "act_jummah_ready", title: "Get ready for Jummah", category: "jummah", ruleKey: "habit_simple", verification: "self", ages: ALL, frequency: "jummahOnly" },
  { id: "act_jummah_clean_clothes", title: "Wear clean clothes", category: "jummah", ruleKey: "habit_simple", verification: "self", ages: ALL, frequency: "jummahOnly" },
  { id: "act_jummah_reminder", title: "Listen to a short Islamic reminder", category: "jummah", ruleKey: "habit_simple", verification: "parent", ages: ALL, frequency: "jummahOnly" },
  { id: "act_jummah_family", title: "Go to Jummah with family (grown-ups decide)", category: "jummah", ruleKey: "habit_simple", verification: "parent", ages: ALL, frequency: "jummahOnly" },

  // Weekly theme deeds (daily items that also belong to a theme)
  { id: "act_theme_gratitude_three", title: "Say Alhamdulillah for three good things", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL, themeId: "gratitude" },
  { id: "act_theme_gratitude_thank", title: "Say thank you to someone who helped you", category: "manners", ruleKey: "manners", verification: "self", ages: ALL, themeId: "gratitude" },
  { id: "act_theme_honesty_truth", title: "Tell the truth, even when it is hard", category: "manners", ruleKey: "manners", verification: "parent", ages: ALL, themeId: "honesty" },
  { id: "act_theme_honesty_return", title: "Give back something that is not yours", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, themeId: "honesty" },
  { id: "act_theme_sharing_snack", title: "Share a snack with someone", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true, themeId: "sharing" },
  { id: "act_theme_patience_turn", title: "Wait for your turn kindly", category: "manners", ruleKey: "manners", verification: "parent", ages: ALL, themeId: "patience" },
  { id: "act_theme_patience_calm", title: "Stay calm when something goes wrong", category: "manners", ruleKey: "manners", verification: "self", ages: ALL, themeId: "patience" },
  { id: "act_theme_clean_hands", title: "Wash your hands before eating", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL, themeId: "cleanliness" },
  { id: "act_theme_clean_room", title: "Tidy your room", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, themeId: "cleanliness" },

  // Ramadan (shown only during Ramadan in the family's region)
  { id: "act_ramadan_iftar_help", title: "Help get iftar ready", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true, frequency: "ramadanOnly" },
  { id: "act_ramadan_join_iftar", title: "Join the family for iftar", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL, together: true, frequency: "ramadanOnly" },
  { id: "act_ramadan_quran", title: "Listen to Quran with family", category: "quran", ruleKey: "habit_simple", verification: "parent", ages: ALL, together: true, frequency: "ramadanOnly" },
  { id: "act_ramadan_charity", title: "Give charity with parents", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true, frequency: "ramadanOnly" },
  { id: "act_ramadan_dua", title: "Make a dua before iftar", category: "dua", ruleKey: "habit_simple", verification: "self", ages: ALL, frequency: "ramadanOnly" },
  { id: "act_ramadan_kind", title: "Be extra kind today", category: "manners", ruleKey: "manners", verification: "self", ages: ALL, frequency: "ramadanOnly" },
  { id: "act_ramadan_suhoor", title: "Join suhoor with family (grown-ups decide)", category: "dailyHabit", ruleKey: "habit_simple", verification: "parent", ages: OLDER, together: true, frequency: "ramadanOnly" },
  { id: "act_ramadan_decorate", title: "Decorate the home for Ramadan", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true, frequency: "ramadanOnly" },

  // Eid (Eid al-Fitr and Eid al-Adha)
  { id: "act_eid_best_clothes", title: "Wear your best clothes for Eid", category: "dailyHabit", ruleKey: "habit_simple", verification: "self", ages: ALL, frequency: "eidOnly" },
  { id: "act_eid_greet", title: "Say Eid Mubarak to your family", category: "manners", ruleKey: "manners", verification: "self", ages: ALL, frequency: "eidOnly" },
  { id: "act_eid_share", title: "Share sweets or a gift", category: "goodDeed", ruleKey: "good_deed", verification: "parent", ages: ALL, together: true, frequency: "eidOnly" },
  { id: "act_eid_prayer", title: "Go to Eid prayer with family (grown-ups decide)", category: "salah", ruleKey: "habit_simple", verification: "parent", ages: ALL, together: true, frequency: "eidOnly" },
];

export const devThemes = [
  { themeId: "kindness", title: "Kindness Week", description: "Small kind acts make people happy.", icon: "heart", activityIds: ["act_manners_kind_words", "act_deed_make_smile"] },
  { themeId: "gratitude", title: "Gratitude Week", description: "We thank Allah and the people who help us.", icon: "sun", activityIds: ["act_theme_gratitude_three", "act_theme_gratitude_thank"] },
  { themeId: "honesty", title: "Honesty Week", description: "We tell the truth and keep our promises.", icon: "shield", activityIds: ["act_theme_honesty_truth", "act_theme_honesty_return"] },
  { themeId: "sharing", title: "Sharing Week", description: "Sharing is caring.", icon: "gift", activityIds: ["act_manners_share_toys", "act_theme_sharing_snack"] },
  { themeId: "patience", title: "Patience Week", description: "We wait kindly and stay calm.", icon: "hourglass", activityIds: ["act_theme_patience_turn", "act_theme_patience_calm"] },
  { themeId: "cleanliness", title: "Cleanliness Week", description: "We keep ourselves and our home clean.", icon: "sparkles", activityIds: ["act_theme_clean_hands", "act_theme_clean_room"] },
];

/** Admin-set regional moon-sighting defaults (days relative to Umm al-Qura). Adjust each season. */
export const devHijriConfig = {
  configVersion: 1,
  calendar: "islamic-umalqura",
  defaultAdjust: 0,
  adjustByCountry: { IN: -1, PK: -1, BD: -1, LK: -1, NP: -1 },
  note: "Sample defaults for testing. Set from the announced moon sighting before each Ramadan and Eid.",
};

export const devRamadanConfig = {
  // One featured deed per Ramadan day, rotating through this list.
  dailyActivityIds: [
    "act_ramadan_join_iftar",
    "act_ramadan_dua",
    "act_ramadan_iftar_help",
    "act_ramadan_kind",
    "act_ramadan_quran",
    "act_ramadan_charity",
    "act_ramadan_decorate",
    "act_ramadan_suhoor",
  ],
  starBadgeDays: 20,
};

export function buildDevActivities() {
  return seeds.map((s, i) => ({
    id: s.id,
    data: {
      activityId: s.id,
      title: { en: `${s.title} (sample)` },
      description: { en: "Sample activity for testing. Not reviewed content." },
      educationalExplanation: { en: "Sample explanation. Pending reviewer approval." },
      category: s.category,
      ageEligibility: { min: 3, max: 6, ageGroups: s.ages },
      difficultyLevels: ["gentle", "standard", "challenge"],
      starRuleKey: s.ruleKey,
      verification: s.verification,
      frequency: s.frequency ?? "daily",
      together: s.together ?? false,
      themeId: s.themeId ?? null,
      isReligiousContent: true,
      isPlaceholder: true,
      status: "approved", // dev only. Real content follows the review workflow.
      version: 1,
      sortOrder: i,
    },
  }));
}

/**
 * Badge rules (Fix 3.2). Server reads these to award badges; the app reads them to show earned and
 * upcoming badges. Positive only: badges are never taken away.
 */
export const devBadgesConfig = {
  configVersion: 1,
  badges: [
    { id: "stars_10", type: "totalStars", threshold: 10, title: "First 10 stars", description: "You earned 10 stars", art: "star", sortOrder: 1 },
    { id: "streak_3", type: "dayStreak", days: 3, title: "3 days in a row", description: "A good deed 3 days in a row", art: "calendar", sortOrder: 2 },
    { id: "stars_50", type: "totalStars", threshold: 50, title: "First 50 stars", description: "You earned 50 stars", art: "medal", sortOrder: 3 },
    { id: "streak_7", type: "dayStreak", days: 7, title: "A whole week", description: "A good deed every day for 7 days", art: "rainbow", sortOrder: 4 },
    { id: "kindness_week", type: "categoryRun", category: "goodDeed", days: 7, title: "Kindness Week", description: "A good deed every day for 7 days", art: "sparkling-heart", sortOrder: 5 },
    { id: "stars_100", type: "totalStars", threshold: 100, title: "First 100 stars", description: "You earned 100 stars", art: "trophy", sortOrder: 6 },
  ],
};
/**
 * Sponsor banners (Enhancement 5). Banners themselves are documents in `sponsors/{id}`, added by an
 * admin after review. This config only switches the feature and sets the disclosure text.
 */
export const devSponsorsConfig = {
  enabled: true,
  maxBanners: 2,
  disclosure: "Sponsored banners are paid placements from companies we choose. They appear only in the grown-ups area, never to children. Sponsors never get your or your child's details.",
};