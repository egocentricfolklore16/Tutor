import { LeaderboardMetric, LeaderboardPeriod, LeaderboardScope } from "./types";

export const LEADERBOARD_SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: 'global', label: 'Global' },
  { id: 'friends', label: 'Friends' },
  { id: 'group', label: 'Group' },
];

export const LEADERBOARD_PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all_time', label: 'All Time' },
];

export const LEADERBOARD_METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'xp', label: 'XP' },
  { id: 'hours', label: 'Hours' },
  { id: 'streak', label: 'Streak' },
];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_LEADERBOARD_ENTRIES = 100;
