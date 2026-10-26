import React, { useState, useEffect } from "react";
import {
  Lock,
  MessageSquare,
  Loader2,
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
} from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import GroupStudySessions from "../../../../components/Community/GroupStudySessions";
import MemberList from "./MemberList";
import InviteDialog from "./InviteDialog";
import Modal from "../../../../components/common/ResponsiveSheet";
import { inviteFriendToGroup } from "../../services/groupsService";

export default function GroupDetail({
  groupId,
  groupOverview,
  overviewLoading,
  currentUserId,
  friends = [],
  onClose,
  onOpenChat,
  onJoinSession,
  onRequestJoinClick,
  onDecideRequest,
  onSaveSettings,
  onDeleteGroup,
  groupActions,
  refetchOverview,
}) {
  const [modalSubTab, setModalSubTab] = useState("overview");
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  useEffect(() => {
    if (groupOverview?.group) {
      setEditName(groupOverview.group.name || "");
      setEditDesc(groupOverview.group.description || "");
      setEditPrivacy(groupOverview.group.privacy || "public");
    }
  }, [groupOverview]);

  if (!groupId) return null;

  return (
    <Modal
      isOpen={Boolean(groupId)}
      onClose={onClose}
      title={groupOverview?.group?.name || "Group Details"}
      maxWidth="max-w-2xl"
      closeOnOverlayClick={true}
    >
      {overviewLoading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : groupOverview?.is_member === false ? (
        /* TEASER VIEW FOR PRIVATE GROUP NON-MEMBERS */
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {groupOverview.group?.subject}
              </span>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                {groupOverview.group?.name}
                <Lock className="h-5 w-5 text-amber-500" />
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {groupOverview.group?.description}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 text-center shadow-surface dark:bg-[#18211f] space-y-3">
            <Lock className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Private Group Content Protected
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Join to see member list, rankings, scheduled study sessions, and live chat!
            </p>
            <button
              type="button"
              onClick={() => onRequestJoinClick?.(groupOverview.group)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
            >
              <Lock className="h-3.5 w-3.5" />
              Request to Join
            </button>
          </div>
        </div>
      ) : (
        /* FULL VIEW FOR MEMBERS */
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {groupOverview?.group?.subject}
              </span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {groupOverview?.group?.description}
              </p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview" },
              { id: "members", label: `Members (${groupOverview?.members?.length || 0})` },
              { id: "sessions", label: "Sessions" },
              ...(groupOverview?.my_role === "owner" || groupOverview?.my_role === "admin"
                ? [
                    {
                      id: "requests",
                      label: `Requests (${groupOverview?.pending_requests?.length || 0})`,
                      badge: groupOverview?.pending_requests?.length,
                    },
                    { id: "settings", label: "Settings" },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalSubTab(tab.id)}
                className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  modalSubTab === tab.id
                    ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Sub-tab */}
          {modalSubTab === "overview" && (
            <div className="space-y-5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {groupOverview?.conversation_id && (
                  <button
                    type="button"
                    onClick={() => onOpenChat?.(groupOverview.conversation_id)}
                    className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary transition"
                  >
                    <MessageSquare className="h-4 w-4" /> Open Group Chat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInviteDialog(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 py-2.5 px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition"
                >
                  <UserPlus className="h-4 w-4" /> Invite Friends
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Top Members ({groupOverview?.rankings?.length || 0})
                </h3>
                <div className="space-y-1.5">
                  {(groupOverview?.rankings || []).map((item, idx) => (
                    <div
                      key={item.user_id || idx}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-[#18211f] shadow-surface"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <Avatar src={item.user_img} name={item.full_name} username={item.username} size="xs" />
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.full_name || item.username}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {item.xp_points || 0} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Members Sub-tab */}
          {modalSubTab === "members" && (
            <div className="pt-2">
              <MemberList
                members={groupOverview?.members || []}
                currentUserId={currentUserId}
                myRole={groupOverview?.my_role}
                selectedGroupId={groupId}
                onSetRole={(grpId, targetId, role) =>
                  groupActions?.setRole(grpId, targetId, role).then(() => refetchOverview?.())
                }
                onRemoveMember={(grpId, targetId, ban) =>
                  groupActions?.removeMember(grpId, targetId, ban).then(() => refetchOverview?.())
                }
              />
            </div>
          )}

          {/* Sessions Sub-tab */}
          {modalSubTab === "sessions" && (
            <div className="pt-2">
              <GroupStudySessions
                groupId={groupId}
                currentUserId={currentUserId}
                onJoinSession={onJoinSession}
              />
            </div>
          )}

          {/* Requests Sub-tab */}
          {modalSubTab === "requests" && (
            <div className="space-y-3 pt-2">
              {(groupOverview?.pending_requests || []).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No pending join requests right now.
                </p>
              ) : (
                (groupOverview?.pending_requests || []).map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-[#18211f] shadow-surface"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={req.profile?.user_img}
                          name={req.profile?.full_name}
                          username={req.profile?.username}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {req.profile?.full_name || req.profile?.username}
                          </p>
                          <p className="text-[10px] text-slate-400">@{req.profile?.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDecideRequest?.(req.id, "accepted")}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onDecideRequest?.(req.id, "declined")}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <UserX className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    </div>

                    {req.message && (
                      <p className="rounded-lg bg-white p-2.5 text-xs text-slate-600 dark:bg-[#14171c] dark:text-slate-300 shadow-inset-field">
                        "{req.message}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings Sub-tab */}
          {modalSubTab === "settings" && groupOverview?.my_role === "owner" && (
            <div className="space-y-5 pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveSettings?.({ name: editName, description: editDesc, privacy: editPrivacy });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Name
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Privacy
                  </label>
                  <select
                    value={editPrivacy}
                    onChange={(e) => setEditPrivacy(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field dark:bg-[#18211f] dark:text-white"
                  >
                    <option value="public">Public (anyone can join)</option>
                    <option value="private">Private (requires owner approval)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
                  >
                    Save Group Settings
                  </button>
                </div>
              </form>

              <div className="border-t border-rose-200/50 pt-4 space-y-3 dark:border-rose-900/40">
                <p className="text-xs font-bold text-rose-600">Danger Zone: Delete Group</p>
                <p className="text-[11px] text-slate-500">
                  Type "<strong>{groupOverview.group?.name}</strong>" below to delete this group and all member data.
                </p>
                <input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Type group name to confirm..."
                  className="w-full rounded-xl bg-rose-50/50 p-2.5 text-xs text-slate-900 shadow-inset-field dark:bg-rose-950/20 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => onDeleteGroup?.(deleteConfirmName)}
                  disabled={deleteConfirmName !== groupOverview.group?.name}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white disabled:opacity-40 hover:bg-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Study Group
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Friends Dialog */}
      <InviteDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        groupName={groupOverview?.group?.name}
        friends={friends}
        members={groupOverview?.members || []}
        onSendInvite={async (friendUserId) => {
          await inviteFriendToGroup(groupId, currentUserId, friendUserId);
        }}
      />
    </Modal>
  );
}
