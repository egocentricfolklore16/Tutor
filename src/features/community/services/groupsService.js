import supabase from "../../../lib/supabase.js";

export async function fetchExploreGroups({ search = "", subject = "all", privacy = "all", limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("get_explore_groups", {
    p_search: search,
    p_subject: subject,
    p_privacy_filter: privacy,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return data || [];
}

export async function fetchMyGroups(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("study_group_members")
    .select("*, group:study_groups(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function fetchGroupOverview(groupId) {
  if (!groupId) return null;
  const { data, error } = await supabase.rpc("get_group_overview", {
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function createGroup({ userId, name, description, subject, privacy = "public" }) {
  if (!userId || !name?.trim() || !subject?.trim()) {
    throw new Error("Group name and subject are required.");
  }

  const { data: newGrp, error } = await supabase
    .from("study_groups")
    .insert({
      name: name.trim(),
      description: (description || "").trim(),
      subject: subject.trim(),
      privacy,
      owner_id: userId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  if (newGrp) {
    await supabase.from("study_group_members").insert({
      group_id: newGrp.id,
      user_id: userId,
      role: "owner",
    });

    await supabase.from("conversations").insert({
      type: "group",
      study_group_id: newGrp.id,
      created_by: userId,
    });
  }

  return newGrp;
}

export async function requestToJoinGroup(groupId, message = "") {
  const { data, error } = await supabase.rpc("request_to_join_group", {
    p_group_id: groupId,
    p_message: message,
  });

  if (error) throw error;
  return data;
}

export async function cancelJoinRequest(requestId) {
  const { data, error } = await supabase.rpc("cancel_join_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
}

export async function decideJoinRequest(requestId, decision) {
  const { data, error } = await supabase.rpc("decide_join_request", {
    p_request_id: requestId,
    p_decision: decision,
  });

  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId) {
  const { data, error } = await supabase.rpc("leave_group", {
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function removeGroupMember(groupId, targetUserId, ban = false) {
  const { data, error } = await supabase.rpc("remove_group_member", {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
    p_ban: ban,
  });

  if (error) throw error;
  return data;
}

export async function setGroupMemberRole(groupId, targetUserId, newRole) {
  const { data, error } = await supabase.rpc("set_group_member_role", {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
    p_new_role: newRole,
  });

  if (error) throw error;
  return data;
}

export async function transferGroupOwnership(groupId, newOwnerId) {
  const { data, error } = await supabase.rpc("transfer_group_ownership", {
    p_group_id: groupId,
    p_new_owner_id: newOwnerId,
  });

  if (error) throw error;
  return data;
}

export async function updateGroupPrivacy(groupId, newPrivacy) {
  const { data, error } = await supabase.rpc("update_group_privacy", {
    p_group_id: groupId,
    p_new_privacy: newPrivacy,
  });

  if (error) throw error;
  return data;
}

export async function updateGroupDetails(groupId, { name, description, privacy }) {
  const { data, error } = await supabase
    .from("study_groups")
    .update({
      name: name.trim(),
      description: (description || "").trim(),
      privacy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
  if (error) throw error;
  return true;
}
