/**
 * DEV-ONLY PLACEHOLDER CONTENT for the QE prototype.
 * Every religious item here is marked isPlaceholder: true and says "sample, not reviewed".
 * No Quran text, Hadith or dua wording is included. Real content must go through the review
 * workflow in docs/ISLAMIC_CONTENT_POLICY.md. The publish gate must reject placeholders in
 * staging and production.
 */

export const devRewardsConfig = {
  configVersion: 1,
  rules: {
    habit_simple: { stars: 2, perSourcePerDay: 1 },
    manners: { stars: 3, perSourcePerDay: 1 },
    good_deed: { stars: 5, perSourcePerDay: 1 },
    dua_learning: { stars: 5, perSourcePerDay: 1 },
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
  frequency?: "daily" | "jummahOnly";
  /** "Do it together" deeds: designed for parent and child jointly. */
  together?: boolean;
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
];

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
      isReligiousContent: true,
      isPlaceholder: true,
      status: "approved", // dev only. Real content follows the review workflow.
      version: 1,
      sortOrder: i,
    },
  }));
}
