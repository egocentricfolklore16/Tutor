import React, { useState, useMemo } from "react";
import { UserPlus, Check, Search, Loader2 } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import Modal from "../../../../components/common/ResponsiveSheet";

export default function InviteDialog({
  isOpen,
  onClose,
  groupName = "Study Group",
  friends = [],
  members = [],
  onSendInvite,
}) {
  const [search, setSearch] = useState("");
  const [invitingIds, setInvitingIds] = useState(new Set());
  const [sentIds, setSentIds] = useState(new Set());

  // Filter friends who are not already in members
  const memberUserIds = useMemo(
    () => new Set((members || []).map((m) => m.user_id)),
    [members]
  );

  const eligibleFriends = useMemo(() => {
    return (friends || []).filter((f) => {
      const friendProfile = f.friend_profile;
      if (!friendProfile) return false;
      if (memberUserIds.has(friendProfile.user_id)) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        (friendProfile.full_name && friendProfile.full_name.toLowerCase().includes(q)) ||
        (friendProfile.username && friendProfile.username.toLowerCase().includes(q))
      );
    });
  }, [friends, memberUserIds, search]);

  const handleInvite = async (friendUserId) => {
    if (invitingIds.has(friendUserId) || sentIds.has(friendUserId)) return;

    setInvitingIds((prev) => new Set(prev).add(friendUserId));
    try {
      await onSendInvite?.(friendUserId);
      setSentIds((prev) => new Set(prev).add(friendUserId));
    } catch (err) {
      console.error("Error sending invite:", err);
    } finally {
      setInvitingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendUserId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Friends to ${groupName}`}
      maxWidth="max-w-md"
      closeOnOverlayClick={true}
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full rounded-2xl bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
        </div>

        {/* Friends List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
          {eligibleFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {search.trim()
                ? "No friends match search"
                : "All your friends are already in this study group!"}
            </div>
          ) : (
            eligibleFriends.map((f) => {
              const profile = f.friend_profile;
              const isInviting = invitingIds.has(profile.user_id);
              const isSent = sentIds.has(profile.user_id);

              return (
                <div
                  key={profile.user_id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={profile.user_img}
                      name={profile.full_name}
                      username={profile.username}
                      size="sm"
                      level={profile.level}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {profile.full_name || profile.username}
                      </p>
                      <p className="text-[10px] text-slate-400">@{profile.username}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isInviting || isSent}
                    onClick={() => handleInvite(profile.user_id)}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition focus-visible:outline-none ${
                      isSent
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-emerald-600 text-white shadow-button-primary hover:bg-emerald-700 disabled:opacity-50"
                    }`}
                  >
                    {isInviting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSent ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Invited
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Invite
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
