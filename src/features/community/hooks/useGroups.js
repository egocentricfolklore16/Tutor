import { useState, useEffect, useCallback } from "react";
import {
  fetchExploreGroups,
  fetchMyGroups,
  fetchGroupOverview,
  fetchMyGroupInvites,
  requestToJoinGroup,
  cancelJoinRequest,
  decideJoinRequest,
  leaveGroup,
  removeGroupMember,
  setGroupMemberRole,
  transferGroupOwnership,
  updateGroupPrivacy,
  inviteFriendToGroup,
  respondToGroupInvite,
} from "../services/groupsService.js";

export function useExploreGroups({ search = "", subject = "all", privacy = "all" } = {}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExploreGroups({ search, subject, privacy });
      setGroups(data);
    } catch (err) {
      console.error("Error fetching explore groups:", err);
      setError(err.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [search, subject, privacy]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return { groups, loading, error, refetch: loadGroups, setGroups };
}

export function useMyGroups(userId) {
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyGroups = useCallback(async () => {
    if (!userId) {
      setMyGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyGroups(userId);
      setMyGroups(data);
    } catch (err) {
      console.error("Error fetching my groups:", err);
      setError(err.message || "Failed to load my groups.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMyGroups();
  }, [loadMyGroups]);

  return { myGroups, loading, error, refetch: loadMyGroups, setMyGroups };
}

export function useMyGroupInvites(userId) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));

  const loadInvites = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyGroupInvites(userId);
      setInvites(data);
    } catch (err) {
      console.error("Error fetching my group invites:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  return { invites, loading, refetch: loadInvites };
}

export function useGroupOverview(groupId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState(null);

  const loadOverview = useCallback(async () => {
    if (!groupId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGroupOverview(groupId);
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.error || "Failed to load group details.");
      }
    } catch (err) {
      console.error("Error fetching group overview:", err);
      setError(err.message || "Unable to load group details.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return { overview: data, loading, error, refetch: loadOverview, setData };
}

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
    inviteFriend: (groupId, inviteeId) => executeAction(inviteFriendToGroup, groupId, inviteeId),
    respondToInvite: (inviteId, status) => executeAction(respondToGroupInvite, inviteId, status),
  };
}

export function useGroups(userId, options = {}) {
  const explore = useExploreGroups(options);
  const my = useMyGroups(userId);
  const myInvites = useMyGroupInvites(userId);
  const overview = useGroupOverview(options.selectedGroupId);
  const actions = useGroupActions();

  return {
    exploreGroups: explore.groups,
    exploreLoading: explore.loading,
    exploreError: explore.error,
    refetchExplore: explore.refetch,

    myGroups: my.myGroups,
    myGroupsLoading: my.loading,
    refetchMyGroups: my.refetch,

    myGroupInvites: myInvites.invites,
    myGroupInvitesLoading: myInvites.loading,
    refetchMyGroupInvites: myInvites.refetch,

    groupOverview: overview.overview,
    overviewLoading: overview.loading,
    refetchOverview: overview.refetch,

    groupActions: actions,
  };
}
