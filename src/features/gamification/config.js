/**
 * Gamification Economy Configuration
 * PROPOSED defaults for XP sources, level curves, gem earning/spending, and caps.
 */
export const GAMIFICATION_CONFIG = {
  xpSources: {
    focusSession25Min: 20,
    pomodoroCycleBonus: 10,
    flashcardReviewSet: 10,
    quizCompleted: 15,
    quizAceBonus: 10, // score >= 80%
    noteCreated: 5,
    dailyGoalReached: 25,
    streakMilestone7d: 50,
    streakMilestone30d: 200,
  },
  dailyXpCap: 500, // Diminishing returns soft cap
  gemsEarned: {
    dailyGoalReached: 5,
    questCompleted: 5,
    streakMilestones: {
      "7d": 20,
      "30d": 100,
      "100d": 500,
    },
    levelUp: 10,
    badgeUnlocked: 15,
    weeklyChallenge: 30,
  },
  gemsSpent: {
    streakFreeze: 50, // max 2 held
    streakRepair: 100, // limited per month
    cosmeticTheme: 150,
  },
  streak: {
    cutoffHour: 3, // 3am local cutoff
    minSessionDurationMinutes: 10, // Minimum duration to qualify for streak day
    maxFreezesHeld: 2,
  },
  features: {
    dailyQuests: false, // honest state until backend exists
    rewardsShop: false, // honest state until backend exists
  },
};
