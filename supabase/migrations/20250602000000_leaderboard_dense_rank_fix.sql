-- Migration: 20250602000000_leaderboard_dense_rank_fix.sql
-- Description: Fixes get_leaderboard RPC function to use true dense ranking (same score = same rank) and excludes zero-activity entries from period-based leaderboards.

create or replace function public.get_leaderboard(
  p_scope text default 'global',
  p_period text default 'weekly',
  p_metric text default 'xp',
  p_group_id uuid default null,
  p_limit integer default 50
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_week_start timestamptz := date_trunc('week', now());
  v_prev_week_start timestamptz := date_trunc('week', now() - interval '1 week');
  v_month_start timestamptz := date_trunc('month', now());
  v_result json;
begin
  with target_users as (
    select distinct p.user_id
    from public.profiles p
    where
      case
        when p_scope = 'friends' and v_caller_id is not null then
          p.user_id = v_caller_id
          or p.user_id in (
            select case when requester_id = v_caller_id then addressee_id else requester_id end
            from public.friendships
            where (requester_id = v_caller_id or addressee_id = v_caller_id)
              and status = 'accepted'
          )
        when p_scope = 'group' and p_group_id is not null then
          p.user_id in (
            select user_id from public.study_group_members where group_id = p_group_id
          )
        else true -- 'global'
      end
  ),
  user_metrics as (
    select
      tu.user_id,
      p.username,
      p.full_name,
      p.user_img,
      coalesce(p.xp_points, 0) as total_xp,
      coalesce(us.current_streak, 0) as current_streak,
      p.created_at as profile_created_at,
      -- Primary value calculation based on metric & period
      case
        when p_metric = 'streak' then coalesce(us.current_streak, 0)
        when p_metric = 'hours' then (
          select coalesce(sum(sh.duration_minutes), 0) / 60.0
          from public.study_history sh
          where sh.user_id = tu.user_id
            and (
              p_period = 'all_time'
              or (p_period = 'weekly' and sh.completed_at >= v_week_start)
              or (p_period = 'monthly' and sh.completed_at >= v_month_start)
            )
        )
        else -- p_metric = 'xp'
          case
            when p_period = 'all_time' then coalesce(p.xp_points, 0)
            when p_period = 'weekly' then (
              select coalesce(sum(sh.xp_earned), 0)
              from public.study_history sh
              where sh.user_id = tu.user_id and sh.completed_at >= v_week_start
            )
            when p_period = 'monthly' then (
              select coalesce(sum(sh.xp_earned), 0)
              from public.study_history sh
              where sh.user_id = tu.user_id and sh.completed_at >= v_month_start
            )
            else coalesce(p.xp_points, 0)
          end
      end as metric_value,
      -- Previous period metric value for rank_change calculation
      case
        when p_metric = 'hours' and p_period = 'weekly' then (
          select coalesce(sum(sh.duration_minutes), 0) / 60.0
          from public.study_history sh
          where sh.user_id = tu.user_id
            and sh.completed_at >= v_prev_week_start
            and sh.completed_at < v_week_start
        )
        when p_metric = 'xp' and p_period = 'weekly' then (
          select coalesce(sum(sh.xp_earned), 0)
          from public.study_history sh
          where sh.user_id = tu.user_id
            and sh.completed_at >= v_prev_week_start
            and sh.completed_at < v_week_start
        )
        else null
      end as prev_metric_value
    from target_users tu
    join public.profiles p on p.user_id = tu.user_id
    left join public.users_streaks us on us.user_id = tu.user_id
  ),
  active_user_metrics as (
    select *
    from user_metrics
    where metric_value > 0
  ),
  ranked_current as (
    select
      aum.*,
      dense_rank() over (
        order by metric_value desc
      ) as current_rank
    from active_user_metrics aum
  ),
  ranked_prev as (
    select
      aum.user_id,
      dense_rank() over (
        order by prev_metric_value desc
      ) as prev_rank
    from active_user_metrics aum
    where prev_metric_value is not null and prev_metric_value > 0
  ),
  final_scores as (
    select
      rc.user_id,
      rc.username,
      rc.full_name,
      rc.user_img,
      rc.total_xp,
      rc.current_streak,
      rc.metric_value,
      rc.current_rank as rank,
      case
        when rp.prev_rank is not null then (rp.prev_rank - rc.current_rank)
        else 0
      end as rank_change,
      greatest(1, floor(rc.total_xp / 250) + 1) as level,
      (rc.user_id = v_caller_id) as is_me,
      rc.profile_created_at
    from ranked_current rc
    left join ranked_prev rp on rp.user_id = rc.user_id
  ),
  top_entries as (
    select *
    from final_scores
    order by rank asc, profile_created_at asc, user_id asc
    limit coalesce(p_limit, 50)
  ),
  me_entry as (
    select
      um.user_id,
      um.username,
      um.full_name,
      um.user_img,
      um.total_xp,
      um.current_streak,
      um.metric_value,
      fs.rank,
      coalesce(fs.rank_change, 0) as rank_change,
      greatest(1, floor(um.total_xp / 250) + 1) as level,
      true as is_me
    from user_metrics um
    left join final_scores fs on fs.user_id = um.user_id
    where um.user_id = v_caller_id
    limit 1
  )
  select json_build_object(
    'entries', coalesce((
      select json_agg(
        json_build_object(
          'user_id', e.user_id,
          'username', e.username,
          'full_name', e.full_name,
          'user_img', e.user_img,
          'xp_points', e.total_xp,
          'streak', e.current_streak,
          'value', round(e.metric_value::numeric, 1),
          'rank', e.rank,
          'rank_change', e.rank_change,
          'level', e.level,
          'is_me', e.is_me
        ) order by e.rank asc, e.profile_created_at asc, e.user_id asc
      ) from top_entries e
    ), '[]'::json),
    'me', (
      select json_build_object(
        'user_id', m.user_id,
        'username', m.username,
        'full_name', m.full_name,
        'user_img', m.user_img,
        'xp_points', m.total_xp,
        'streak', m.current_streak,
        'value', round(m.metric_value::numeric, 1),
        'rank', m.rank,
        'rank_change', m.rank_change,
        'level', m.level,
        'is_me', true
      ) from me_entry m
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_leaderboard(text, text, text, uuid, integer) to authenticated, anon;

-- Note: Migration has NOT been applied to production.
-- Rollback Instructions:
-- Re-apply migration 20250523000000_leaderboard.sql
