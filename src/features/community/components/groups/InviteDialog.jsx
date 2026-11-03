import React, { useState } from "react";
import { Search, UserPlus, Check, Loader2, Users } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import Modal from "../../../../components/common/ResponsiveSheet";

export default function InviteDialog({
  isOpen,
  onClose,
  group,
  friends = [],
  existingMemberUserIds = [],
  currentUserId,
  onSendInvite,
}) {
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState(null);
  const [invitedIds, setInvitedIds] = useState(new Set());

  if (!isOpen) return null;

  const memberSet = new Set(existingMemberUserIds);

  const getFriendInfo = (f) => {
    const isRequester = f.requester_id === currentUserId;
    const friendUser = isRequester ? f.addressee : (f.requester || f.profile);
    const friendId = friendUser?.user_id || (isRequester ? f.addressee_id : f.requester_id);
    return { friendUser, friendId };
  };

  const filteredFriends = friends.filter((f) => {
    const { friendUser } = getFriendInfo(f);
    const name = friendUser?.full_name || friendUser?.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleInvite = async (friendUserId) => {
    setInvitingId(friendUserId);
    try {
      await onSendInvite?.(group.id, friendUserId);
      setInvitedIds((prev) => new Set([...prev, friendUserId]));
    } catch (err) {
      console.error("Failed to send invite:", err);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Friends to ${group?.name || "Group"}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends to invite..."
            className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
              {search ? "No matching friends found." : "No friends available to invite."}
            </div>
          ) : (
            filteredFriends.map((f) => {
              const { friendUser, friendId } = getFriendInfo(f);

              const isMember = memberSet.has(friendId);
              const isInvited = invitedIds.has(friendId);
              const isPending = invitingId === friendId;

              return (
                <div
                  key={f.id || friendId}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 shadow-surface dark:bg-[#18211f]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={friendUser?.user_img}
                      name={friendUser?.full_name}
                      username={friendUser?.username}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {friendUser?.full_name || friendUser?.username || "Friend"}
                      </p>
                      <p className="text-[10px] text-slate-400">@{friendUser?.username || "user"}</p>
                    </div>
                  </div>

                  {isMember ? (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Member
                    </span>
                  ) : isInvited ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check className="h-3 w-3" /> Invited
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleInvite(friendId)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary disabled:opacity-50 transition"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" /> Invite
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
