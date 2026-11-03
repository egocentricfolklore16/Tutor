import supabase from "../../../lib/supabase.js";

/**
 * Submit a community safety / moderation report
 * @param {Object} params
 * @param {string} params.reporterId
 * @param {'user'|'group'|'activity'|'forum_post'|'forum_comment'} params.targetType
 * @param {string} params.targetId
 * @param {string} params.reason
 * @param {string} [params.details]
 */
export async function submitCommunityReport({
  reporterId,
  targetType,
  targetId,
  reason,
  details = "",
}) {
  if (!reporterId || !targetType || !targetId || !reason) {
    throw new Error("Missing required parameters for reporting.");
  }

  const { data, error } = await supabase
    .from("community_reports")
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: String(targetId),
      reason: reason.trim(),
      details: details.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to submit report.");
  }

  return data;
}
