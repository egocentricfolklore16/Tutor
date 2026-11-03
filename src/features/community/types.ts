export type LeaderboardScope = 'global' | 'friends' | 'group';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';
export type LeaderboardMetric = 'xp' | 'hours' | 'streak';

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  full_name: string | null;
  user_img: string | null;
  rank: number;
  rank_change: number | null;
  value: number;
  level: number;
  is_me: boolean;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  friend_profile?: {
    user_id: string;
    username: string;
    full_name: string;
    user_img: string;
    level: number;
  };
}

export type ActivityEventType =
  | 'session_completed'
  | 'streak_milestone'
  | 'level_up'
  | 'group_joined'
  | 'achievement_unlocked';

export type ActivityVisibility = 'public' | 'friends' | 'group';

export interface ActivityEvent {
  id: string;
  actor_id: string;
  type: ActivityEventType;
  payload: Record<string, any>;
  visibility: ActivityVisibility;
  group_id?: string | null;
  created_at: string;
  actor_profile?: {
    user_id: string;
    username: string;
    full_name: string;
    user_img: string;
    level: number;
  };
}

export type FeedFilterScope = 'all' | 'friends' | 'groups' | 'milestones';
