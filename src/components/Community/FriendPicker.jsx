import React, { useState, useEffect } from "react";
import { Search, Users, Loader2, MessageSquare } from "lucide-react";
import supabase from "../../lib/supabase";
import Modal from "../common/ResponsiveSheet";

export default function FriendPicker({ isOpen, onClose, currentUserId, onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingChatId, setStartingChatId] = useState(null);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let mounted = true;
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from("friendships")
          .select("*")
          .eq("status", "accepted")
          .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

        if (error) throw error;

        const otherUserIds = (rows || []).map((f) =>
          f.requester_id === currentUserId ? f.addressee_id : f.requester_id
        );

        if (otherUserIds.length > 0) {
          const profsList = await Promise.all(
            otherUserIds.map(async (uid) => {
              const { data, error: pErr } = await supabase.rpc("get_public_profile", {
                p_user_id: uid,
              });
              if (pErr) return null;
              return { user_id: uid, ...data };
            })
          );
          if (mounted) setFriends(profsList.filter(Boolean));
        } else {
          if (mounted) setFriends([]);
        }
      } catch (err) {
        console.error("Error fetching friends for picker:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFriends();
    return () => {
      mounted = false;
    };
  }, [isOpen, currentUserId]);

  const handleStartChat = async (friendUserId) => {
    setStartingChatId(friendUserId);
    try {
      const { data: convId, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: friendUserId }
      );

      if (error) throw error;
      onClose();
      if (onSelectFriend) {
        onSelectFriend(convId);
      }
    } catch (err) {
      console.error("Error starting direct conversation:", err);
    } finally {
      setStartingChatId(null);
    }
  };

  if (!isOpen) return null;

  const filteredFriends = friends.filter(
    (f) =>
      (f.full_name || "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (f.username || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>New Chat</span>
        </div>
      }
      maxWidth="max-w-md"
      closeOnOverlayClick={true}
    >
      <div>
        {/* Search Input */}
        <div className="-mt-1 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="mt-2 text-xs text-slate-500">Loading friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {searchQuery ? "No friends found matching search." : "No friends added yet. Add friends from the Community hub!"}
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isStarting = startingChatId === friend.user_id;

              return (
                <div
                  key={friend.user_id}
                  onClick={() => !isStarting && handleStartChat(friend.user_id)}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-emerald-500 dark:border-slate-800/80 dark:bg-[#18211f] dark:hover:border-emerald-600"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {friend.user_img ? (
                      <img
                        src={friend.user_img}
                        alt={friend.username}
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                        {(friend.full_name || friend.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {friend.full_name || friend.username}
                      </p>
                      <p className="text-xs text-slate-500">@{friend.username}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isStarting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isStarting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    <span>Chat</span>
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
