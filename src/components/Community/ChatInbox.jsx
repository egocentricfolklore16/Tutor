import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, Users, Loader2 } from "lucide-react";
import supabase from "../../lib/supabase";
import { formatRelativeTime, calculateUnreadCount } from "../../lib/communityChat";

export default function ChatInbox({ currentUserId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Realtime listener for message changes to update inbox previews
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`inbox_messages:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchInboxData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchInboxData]);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    c.latestMsg?.content?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Messages & Conversations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct chats with friends and active study group discussions
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
          />
        </div>
      </div>

      {/* Inbox List */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading inbox...</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
          <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No active conversations
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Start a chat with a friend from the Friends tab or join a Study Group!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-[#14171c] overflow-hidden">
          {filteredConversations.map((conv) => {
            const hasUnread = conv.unreadCount > 0;
            const previewText = conv.latestMsg?.content
              ? conv.latestMsg.content
              : conv.latestMsg?.resource_id
              ? "📎 Shared a resource"
              : "No messages yet";

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex cursor-pointer items-center justify-between p-4 transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                  hasUnread
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                  {conv.type === "direct" ? (
                    conv.avatarUrl ? (
                      <img
                        src={conv.avatarUrl}
                        alt={conv.name}
                        className="h-11 w-11 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                        {conv.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-200 font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                      <Users className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {conv.name}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium shrink-0">
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </div>

                    <p
                      className={`truncate text-xs mt-0.5 ${
                        hasUnread
                          ? "font-bold text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {previewText}
                    </p>
                  </div>
                </div>

                {hasUnread && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white shadow-xs">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
