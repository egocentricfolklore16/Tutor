import * as groupsApi from "../../groups/groupsApi";
import supabase from "../../../lib/supabase";

export async function fetchExploreGroups(options) {
  return groupsApi.fetchExploreGroups(options);
}

export async function fetchMyGroups(userId) {
  return groupsApi.fetchMyGroups(userId);
}

export async function fetchGroupOverview(groupId) {
  return groupsApi.fetchGroupOverview(groupId);
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
  return groupsApi.requestToJoinGroup(groupId, message);
}

export async function cancelJoinRequest(requestId) {
  return groupsApi.cancelJoinRequest(requestId);
}

export async function decideJoinRequest(requestId, decision) {
  return groupsApi.decideJoinRequest(requestId, decision);
}

export async function leaveGroup(groupId) {
  return groupsApi.leaveGroup(groupId);
}

export async function removeGroupMember(groupId, targetUserId, ban = false) {
  return groupsApi.removeGroupMember(groupId, targetUserId, ban);
}

export async function setGroupMemberRole(groupId, targetUserId, newRole) {
  return groupsApi.setGroupMemberRole(groupId, targetUserId, newRole);
}

export async function transferGroupOwnership(groupId, newOwnerId) {
  return groupsApi.transferGroupOwnership(groupId, newOwnerId);
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
