import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, Users, Loader2, Plus, UserPlus } from "lucide-react";
import supabase from "../../lib/supabase";
import { formatRelativeTime, calculateUnreadCount } from "../../lib/communityChat";
import FriendPicker from "./FriendPicker";

export default function ChatInbox({ currentUserId, onSelectConversation, onFindFriends, headerAction }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'friends' | 'groups'
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  const fetchInboxData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // 1. Fetch user's conversation participants
      const { data: partRows, error: partErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", currentUserId);

      if (partErr) throw partErr;

      if (!partRows || partRows.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = partRows.map((p) => p.conversation_id);
      const participantMap = {};
      partRows.forEach((p) => {
        participantMap[p.conversation_id] = p;
      });

      // 2. Fetch conversation records
      const { data: convRows, error: convErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds);

      if (convErr) throw convErr;

      // 3. For direct chats, fetch other participant user_ids
      const directConvIds = (convRows || [])
        .filter((c) => c.type === "direct")
        .map((c) => c.id);

      let directPeersMap = {};
      if (directConvIds.length > 0) {
        const { data: allParts } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", directConvIds);

        const peerUserIds = Array.from(
          new Set(
            (allParts || [])
              .filter((p) => p.user_id !== currentUserId)
              .map((p) => p.user_id)
          )
        );

        if (peerUserIds.length > 0) {
          const { data: profs } = await supabase
            .from("community_profiles")
            .select("*")
            .in("user_id", peerUserIds);

          const profMap = {};
          (profs || []).forEach((p) => {
            profMap[p.user_id] = p;
          });

          (allParts || []).forEach((p) => {
            if (p.user_id !== currentUserId) {
              directPeersMap[p.conversation_id] = profMap[p.user_id] || null;
            }
          });
        }
      }

      // 4. For group chats, fetch group details
      const groupIds = (convRows || [])
        .filter((c) => c.type === "group" && c.study_group_id)
        .map((c) => c.study_group_id);

      let groupMap = {};
      if (groupIds.length > 0) {
        const { data: grps } = await supabase
          .from("study_groups")
          .select("*")
          .in("id", groupIds);

        (grps || []).forEach((g) => {
          groupMap[g.id] = g;
        });
      }

      // 5. Fetch latest messages & calculate unread
      const convList = await Promise.all(
        (convRows || []).map(async (conv) => {
          const partInfo = participantMap[conv.id];

          const { data: msgs } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(20);

          const latestMsg = msgs && msgs.length > 0 ? msgs[0] : null;
          const unreadCount = calculateUnreadCount(
            msgs || [],
            partInfo?.last_read_at,
            currentUserId
          );

          let name = "Chat";
          let avatarUrl = null;
          let resourceTitle = null;

          if (latestMsg?.resource_id) {
            const { data: resData } = await supabase
              .from("session_resources")
              .select("title, file_name")
              .eq("id", latestMsg.resource_id)
              .maybeSingle();

            if (resData) {
              resourceTitle = resData.title || resData.file_name;
            }
          }

          if (conv.type === "direct") {
            const peer = directPeersMap[conv.id];
            name = peer?.full_name || peer?.username || "Direct Message";
            avatarUrl = peer?.user_img || null;
          } else if (conv.type === "group") {
            const grp = groupMap[conv.study_group_id];
            name = grp?.name || "Study Group";
          }

          return {
            ...conv,
            name,
            avatarUrl,
            latestMsg,
            resourceTitle,
            unreadCount,
            lastReadAt: partInfo?.last_read_at,
            updatedAt: latestMsg ? latestMsg.created_at : conv.created_at,
          };
        })
      );

      // Sort by latest message time
      convList.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setConversations(convList);
    } catch (err) {
      console.error("Error fetching inbox conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchInboxData();
  }, [fetchInboxData]);

  // Realtime listener for message changes
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `inbox_messages:${currentUserId}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      () => {
        fetchInboxData();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchInboxData]);

  const filteredConversations = conversations
    .filter((c) => {
      if (filterTab === "friends") return c.type === "direct";
      if (filterTab === "groups") return c.type === "group";
      return true;
    })
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        c.latestMsg?.content?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        c.resourceTitle?.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white dark:bg-[#14171c] overflow-hidden">
      {/* Slim, Clean Header */}
      <div className="shrink-0 p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">
              Messages
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFriendPicker(true)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1 text-[12px] font-medium text-white shadow-xs hover:bg-emerald-700 transition"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            {headerAction}
          </div>
        </div>

        {/* Slim Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full min-h-[36px] rounded-xl border border-slate-200/80 bg-slate-50 py-1 pl-8 pr-3 text-[13px] font-normal text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-[#18211f] dark:text-white"
          />
        </div>

        {/* Minimal Segmented Controls */}
        <div className="flex rounded-xl bg-slate-100/80 p-1 dark:bg-[#18211f]">
          {[
            { id: "all", label: "All" },
            { id: "friends", label: "Friends" },
            { id: "groups", label: "Groups" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`flex-1 min-h-[28px] rounded-lg text-[11px] font-medium transition ${
                filterTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs dark:bg-[#14171c] dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <FriendPicker
        isOpen={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
        currentUserId={currentUserId}
        onSelectFriend={(convId) => onSelectConversation(convId)}
      />

      {/* Inbox List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center h-64">
            <MessageSquare className="h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-[13px] font-medium text-slate-800 dark:text-slate-200">
              No conversations found
            </p>
            <p className="mt-1 text-[12px] font-normal text-slate-500 dark:text-slate-400 max-w-xs">
              Select a conversation or start a new chat to begin studying together!
            </p>
            <button
              type="button"
              onClick={onFindFriends || (() => setShowFriendPicker(true))}
              className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-xs hover:bg-emerald-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Find friends</span>
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const hasUnread = conv.unreadCount > 0;
            const previewText = conv.latestMsg?.content
              ? conv.latestMsg.content
              : conv.resourceTitle
              ? `Shared a file: ${conv.resourceTitle}`
              : conv.latestMsg?.resource_id
              ? "Shared a resource"
              : "No messages yet";

            const showFallback = !conv.avatarUrl || imgErrors[conv.id];

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex min-h-[52px] cursor-pointer items-center justify-between px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                  hasUnread ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="relative shrink-0">
                    {conv.type === "direct" ? (
                      !showFallback ? (
                        <img
                          src={conv.avatarUrl}
                          alt={conv.name}
                          onError={() => setImgErrors((prev) => ({ ...prev, [conv.id]: true }))}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-200 font-medium text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 text-xs">
                          {conv.name.charAt(0).toUpperCase()}
                        </div>
                      )
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-200 font-medium text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                        <Users className="h-4 w-4" />
                      </div>
                    )}
                    {conv.type === "direct" && (
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14171c]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-[13px] font-medium ${
                          hasUnread
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {conv.name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0">
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </div>

                    <p
                      className={`truncate text-[12px] font-normal mt-0.5 ${
                        hasUnread
                          ? "text-slate-900 dark:text-white font-medium"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {previewText}
                    </p>
                  </div>
                </div>

                {hasUnread && (
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-medium text-white shadow-xs">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
