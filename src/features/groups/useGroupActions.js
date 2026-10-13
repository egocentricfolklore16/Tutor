import { useState } from "react";
import {
  requestToJoinGroup,
  cancelJoinRequest,
  decideJoinRequest,
  leaveGroup,
  removeGroupMember,
  setGroupMemberRole,
  transferGroupOwnership,
  updateGroupPrivacy,
} from "./groupsApi";

export function useGroupActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const executeAction = async (actionFn, ...args) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await actionFn(...args);
      return res;
    } catch (err) {
      console.error("Group action failed:", err);
      setError(err.message || "Action failed.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    error,
    requestJoin: (groupId, msg) => executeAction(requestToJoinGroup, groupId, msg),
    cancelRequest: (reqId) => executeAction(cancelJoinRequest, reqId),
    decideRequest: (reqId, decision) => executeAction(decideJoinRequest, reqId, decision),
    leave: (groupId) => executeAction(leaveGroup, groupId),
    removeMember: (groupId, targetId, ban) => executeAction(removeGroupMember, groupId, targetId, ban),
    setRole: (groupId, targetId, role) => executeAction(setGroupMemberRole, groupId, targetId, role),
    transferOwner: (groupId, newOwnerId) => executeAction(transferGroupOwnership, groupId, newOwnerId),
    updatePrivacy: (groupId, privacy) => executeAction(updateGroupPrivacy, groupId, privacy),
  };
}
