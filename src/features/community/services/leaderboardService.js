import supabase from "../../../lib/supabase.js";

/**
 * Fetch leaderboard entries via single source of truth RPC
 */
export async function fetchLeaderboardData({
  scope = "global",
  period = "weekly",
  metric = "xp",
  groupId = null,
  limit = 50,
}) {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_scope: scope,
    p_period: period,
    p_metric: metric,
    p_group_id: scope === "group" ? groupId : null,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message || "Failed to load leaderboard");
  }

  const entries = (data?.entries || []).map((e) => ({
    user_id: e.user_id,
    username: e.username || "Learner",
    full_name: e.full_name || e.username || "Learner",
    user_img: e.user_img || null,
    rank: e.rank,
    rank_change: e.rank_change ?? 0,
    value: Number(e.value) || 0,
    level: Number(e.level) || 1,
    is_me: Boolean(e.is_me),
  }));

  const me = data?.my_rank
    ? {
        user_id: data.my_rank.user_id,
        username: data.my_rank.username || "You",
        full_name: data.my_rank.full_name || data.my_rank.username || "You",
        user_img: data.my_rank.user_img || null,
        rank: data.my_rank.rank,
        rank_change: data.my_rank.rank_change ?? 0,
        value: Number(data.my_rank.value) || 0,
        level: Number(data.my_rank.level) || 1,
        is_me: true,
      }
    : null;

  return { entries, me };
}
