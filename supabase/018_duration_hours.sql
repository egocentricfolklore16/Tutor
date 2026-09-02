-- Duration is now stored as hours instead of minutes.
-- Run once after deploying the hour-based planner update.
update public."Study"
set "Duration" = "Duration" / 60.0
where "Duration" >= 15;

notify pgrst, 'reload schema';
