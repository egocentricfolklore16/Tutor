import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Paperclip,
  Trash2,
  Flag,
  Copy,
  ArrowLeft,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Smile,
  ChevronDown,
  Calendar,
  CheckCheck,
  MoreVertical,
} from "lucide-react";
import supabase from "../../lib/supabase";
import ResourcePicker from "./ResourcePicker";
import ResourceCard from "./ResourceCard";
import {
  groupMessagesByDateAndSender,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  parseLinksInText,
} from "../../lib/communityChat";

const EMOJI_LIST = ["😀", "😂", "😍", "👍", "❤️", "🔥", "🎉", "📚", "💡", "👏", "💯", "🙏", "✨", "🙌", "🎓", "⭐"];

export default function ChatThread({
  conversationId,
  currentUserId,
  onBack,
  onOpenGroupInfo,
}) {
  const [conversation, setConversation] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState(null);
  const [senderProfiles, setSenderProfiles] = useState({});
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupMembersSheet, setShowGroupMembersSheet] = useState(false);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const [inputContent, setInputContent] = useState(() => getChatDraft(conversationId));
  const [selectedResource, setSelectedResource] = useState(null);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Typing & Presence state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const typingTimerRef = useRef(null);

  // Scroll & Unread Jump State
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [firstUnreadMsgId, setFirstUnreadMsgId] = useState(null);

  // Reporting modal
  const [reportingMsgId, setReportingMsgId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Active action menu for touch/mobile or hover
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Friendly toast notifications
  const [toastMessage, setToastMessage] = useState(null);

  const threadContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isUserNearBottom = useRef(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Update last_read_at helper
  const updateLastReadAt = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    try {
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);
    } catch (err) {
      console.error("Failed to update last_read_at:", err);
    }
  }, [conversationId, currentUserId]);

  // Load draft on conversation change
  useEffect(() => {
    setInputContent(getChatDraft(conversationId));
  }, [conversationId]);

  // Save draft on input change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputContent(text);
    saveChatDraft(conversationId, text);

    // Broadcast typing state
    sendTypingBroadcast();

    // Auto-grow textarea up to 5 lines
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Realtime Broadcast & Presence for typing and online status
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`chat_presence:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const peerIds = Object.keys(state).filter((id) => id !== currentUserId);
        setIsPeerOnline(peerIds.length > 0);
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId !== currentUserId) {
          setIsPeerTyping(Boolean(payload.payload?.isTyping));
          clearTimeout(typingTimerRef.current);
          if (payload.payload?.isTyping) {
            typingTimerRef.current = setTimeout(() => {
              setIsPeerTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(typingTimerRef.current);
    };
  }, [conversationId, currentUserId]);

  const sendTypingBroadcast = () => {
    const channel = supabase.channel(`chat_presence:${conversationId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, isTyping: true },
    });
  };

  // Fetch conversation info
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let isMounted = true;
    const fetchConvInfo = async () => {
      setLoading(true);
      try {
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (convErr) throw convErr;
        if (!isMounted) return;
        setConversation(conv);

        if (conv.type === "direct") {
          // Fetch participant other than current user
          const { data: parts, error: partErr } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conversationId);

          if (!partErr && parts) {
            const peerId = parts.find((p) => p.user_id !== currentUserId)?.user_id;
            if (peerId) {
              const { data: prof } = await supabase
                .from("community_profiles")
                .select("*")
                .eq("user_id", peerId)
                .maybeSingle();

              if (isMounted) setPeerProfile(prof);
            }
          }
        } else if (conv.type === "group" && conv.study_group_id) {
          // Fetch group details and member count
          const [{ data: grp }, { count: mCount }] = await Promise.all([
            supabase
              .from("study_groups")
              .select("*")
              .eq("id", conv.study_group_id)
              .maybeSingle(),
            supabase
              .from("study_group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", conv.study_group_id),
          ]);

          if (isMounted) {
            setGroupDetails(grp);
            setGroupMemberCount(mCount || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching conversation details:", err);
        showToast("Unable to load chat details.");
      }
    };

    fetchConvInfo();
    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId]);

  // Fetch sender profiles for group messages
  const fetchSenderProfiles = useCallback(async (senderIds) => {
    if (!senderIds || senderIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("community_profiles")
        .select("*")
        .in("user_id", senderIds);

      if (error) return;

      setSenderProfiles((prev) => {
        const next = { ...prev };
        (data || []).forEach((p) => {
          next[p.user_id] = p;
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch sender profiles:", err);
    }
  }, []);

  // Fetch initial paginated messages (latest 30)
  const fetchInitialMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const items = (data || []).reverse(); // Oldest first for rendering
      setMessages(items);
      setHasMoreOlder(data?.length === 30);

      const senderIds = Array.from(new Set(items.map((m) => m.sender_id)));
      if (senderIds.length > 0) {
        await fetchSenderProfiles(senderIds);
      }

      await updateLastReadAt();
    } catch (err) {
      console.error("Error fetching initial messages:", err);
      showToast("Could not load recent messages.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchSenderProfiles, updateLastReadAt]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  // Scroll to bottom on initial load or smart scroll when new message arrives
  useEffect(() => {
    if (!loading && threadContainerRef.current) {
      if (isUserNearBottom.current) {
        threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
        setShowJumpToLatest(false);
        setNewMessagesCount(0);
      } else {
        setShowJumpToLatest(true);
      }
    }
  }, [loading, messages.length]);

  const scrollToBottom = () => {
    if (threadContainerRef.current) {
      threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
      setShowJumpToLatest(false);
      setNewMessagesCount(0);
    }
  };

  // Load older messages on scroll up without jumping scroll position
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0 || !threadContainerRef.current) return;
    setLoadingOlder(true);
    const container = threadContainerRef.current;
    const oldScrollHeight = container.scrollHeight;

    try {
      const oldestTimestamp = messages[0].created_at;
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldestTimestamp)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!data || data.length === 0) {
        setHasMoreOlder(false);
      } else {
        const olderItems = [...data].reverse();
        setMessages((prev) => [...olderItems, ...prev]);
        setHasMoreOlder(data.length === 30);

        const senderIds = Array.from(new Set(olderItems.map((m) => m.sender_id)));
        if (senderIds.length > 0) {
          await fetchSenderProfiles(senderIds);
        }

        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - oldScrollHeight;
          }
        });
      }
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    isUserNearBottom.current = isAtBottom;

    if (isAtBottom) {
      setShowJumpToLatest(false);
      setNewMessagesCount(0);
    }

    if (container.scrollTop === 0 && !loadingOlder && hasMoreOlder) {
      loadOlderMessages();
    }
  };

  // Realtime subscription for INSERTs on messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat_messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new;

          setMessages((prev) => {
            // Check if replacing an optimistic message or adding new
            const exists = prev.some(
              (m) => m.id === newMsg.id || (m.isOptimistic && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
            );

            if (exists) {
              return prev.map((m) =>
                m.isOptimistic && m.sender_id === newMsg.sender_id && m.content === newMsg.content
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });

          if (newMsg.sender_id) {
            await fetchSenderProfiles([newMsg.sender_id]);
          }

          await updateLastReadAt();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchSenderProfiles, updateLastReadAt]);

  // Send message (optimistic send with retry & draft clear)
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const content = inputContent.trim();
    const resourceId = selectedResource?.id || null;

    if (!content && !resourceId) return;

    const tempId = `opt-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      resource_id: resourceId,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      failed: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputContent("");
    setSelectedResource(null);
    clearChatDraft(conversationId);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
          resource_id: resourceId,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      await updateLastReadAt();
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
      showToast("Failed to send message. Click to retry.");
    }
  };

  const handleRetrySend = async (failedMsg) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, failed: false } : m))
    );

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: failedMsg.content,
          resource_id: failedMsg.resource_id,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? data : m))
      );
    } catch (err) {
      console.error("Retry send failed:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, failed: true } : m))
      );
      showToast("Retry failed. Check your network connection.");
    }
  };

  // Copy message text
  const handleCopyMessage = (content) => {
    if (!content) return;
    navigator.clipboard?.writeText(content).then(
      () => showToast("Message copied to clipboard!"),
      () => showToast("Failed to copy message.")
    );
    setActiveMenuMsgId(null);
  };

  // Delete own message
  const handleDeleteMessage = async (msgId) => {
    setActiveMenuMsgId(null);
    try {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", msgId)
        .eq("sender_id", currentUserId);

      if (error) throw error;
      showToast("Message deleted.");
    } catch (err) {
      console.error("Error deleting message:", err);
      showToast("Unable to delete message.");
      fetchInitialMessages();
    }
  };

  // Submit Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingMsgId || !reportReason.trim()) return;

    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("message_reports").insert({
        message_id: reportingMsgId,
        reporter_id: currentUserId,
        reason: reportReason.trim(),
      });

      if (error) throw error;

      setReportingMsgId(null);
      setReportReason("");
      showToast("Report submitted. Thank you for keeping Community safe!");
    } catch (err) {
      console.error("Error submitting report:", err);
      showToast("Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const dateGroups = groupMessagesByDateAndSender(messages);

  const titleName =
    conversation?.type === "direct"
      ? peerProfile?.full_name || peerProfile?.username || "Direct Chat"
      : groupDetails?.name || "Group Chat";

  return (
    <div className="flex h-[100dvh] md:h-full flex-col bg-white dark:bg-[#14171c] overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-between animate-in fade-in z-30">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#14171c]/95 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div
            className="flex items-center gap-3 min-w-0 cursor-pointer"
            onClick={() => conversation?.type === "group" && setShowGroupMembersSheet(true)}
          >
            <div className="relative shrink-0">
              {conversation?.type === "direct" ? (
                peerProfile?.user_img ? (
                  <img
                    src={peerProfile.user_img}
                    alt={titleName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 text-sm">
                    {titleName.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-200 font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                  <Users className="h-5 w-5" />
                </div>
              )}
              {conversation?.type === "direct" && isPeerOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14171c]" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {titleName}
              </h3>
              {conversation?.type === "group" && (
                <p className="text-[11px] text-slate-500 font-medium">
                  {groupMemberCount} members · {groupDetails?.subject || "Study Group"}
                </p>
              )}
              {conversation?.type === "direct" && (
                <p className="text-[11px] text-slate-500 font-medium">
                  {isPeerTyping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">Typing...</span>
                  ) : isPeerOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
                  ) : (
                    `@${peerProfile?.username || "user"}`
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {conversation?.type === "group" && (
          <div className="flex items-center gap-2">
            <a
              href="/Planner"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              title="Schedule study session"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Schedule Session</span>
            </a>
            <button
              type="button"
              onClick={() => setShowGroupMembersSheet(true)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-300"
            >
              Members
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={threadContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#18211f]/40"
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs text-slate-500">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-3">
              <Send className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              No messages yet
            </p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Send a message or share a resource to kick off the discussion!
            </p>
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              </div>
            )}

            {dateGroups.map((group) => (
              <div key={group.dateLabel} className="space-y-4">
                {/* Unread Divider */}
                {firstUnreadMsgId && group.clusters.some((c) => c.messages.some((m) => m.id === firstUnreadMsgId)) && (
                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-rose-500/50" />
                    <span className="mx-3 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      New Messages
                    </span>
                    <div className="flex-1 border-t border-rose-500/50" />
                  </div>
                )}
                {/* Calendar Day Divider */}
                <div className="flex items-center justify-center my-2">
                  <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Sender Clusters */}
                {group.clusters.map((cluster, cIdx) => {
                  const isOwnCluster = cluster.senderId === currentUserId;
                  const senderProf = senderProfiles[cluster.senderId];
                  const senderName =
                    senderProf?.full_name || senderProf?.username || "Member";

                  return (
                    <div
                      key={`${cluster.senderId}-${cIdx}`}
                      className={`flex flex-col ${
                        isOwnCluster ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Show sender name for group chats in peer clusters */}
                      {!isOwnCluster && conversation?.type === "group" && (
                        <span className="mb-1 ml-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {senderName}
                        </span>
                      )}

                      <div
                        className={`space-y-1.5 max-w-[85%] sm:max-w-[70%] ${
                          isOwnCluster ? "items-end" : "items-start"
                        }`}
                      >
                        {cluster.messages.map((msg) => (
                          <div key={msg.id} className="group relative flex items-center gap-1.5">
                            {/* Actions popup for non-failed messages */}
                            {!msg.failed && (
                              <div
                                className={`flex items-center gap-1 shrink-0 ${
                                  isOwnCluster ? "order-first" : "order-last"
                                }`}
                              >
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveMenuMsgId((prev) => (prev === msg.id ? null : msg.id))
                                    }
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                    title="Message options"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>

                                  {activeMenuMsgId === msg.id && (
                                    <div
                                      className={`absolute bottom-full mb-1 z-30 flex flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#18211f] min-w-[110px] ${
                                        isOwnCluster ? "right-0" : "left-0"
                                      }`}
                                    >
                                      {msg.content && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyMessage(msg.content)}
                                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                          <Copy className="h-3.5 w-3.5" /> Copy
                                        </button>
                                      )}
                                      {isOwnCluster ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuMsgId(null);
                                            setReportingMsgId(msg.id);
                                          }}
                                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                        >
                                          <Flag className="h-3.5 w-3.5" /> Report
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs transition ${
                                isOwnCluster
                                  ? "bg-emerald-600 text-white rounded-br-xs"
                                  : "bg-white text-slate-900 border border-slate-200 dark:bg-[#14171c] dark:border-slate-800 dark:text-white rounded-bl-xs"
                              } ${msg.failed ? "opacity-60 border-rose-500" : ""}`}
                            >
                              {msg.content && (
                                <p className="leading-relaxed whitespace-pre-wrap break-words">
                                  {parseLinksInText(msg.content).map((part, pIdx) =>
                                    part.type === "link" ? (
                                      <a
                                        key={pIdx}
                                        href={part.value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:opacity-80 font-semibold"
                                      >
                                        {part.value}
                                      </a>
                                    ) : (
                                      <React.Fragment key={pIdx}>{part.value}</React.Fragment>
                                    )
                                  )}
                                </p>
                              )}

                              {/* Shared Resource Card */}
                              {msg.resource_id && (
                                <ResourceCard resourceId={msg.resource_id} />
                              )}

                              {/* Footer timestamp & status */}
                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                  isOwnCluster
                                    ? "text-emerald-100"
                                    : "text-slate-400"
                                }`}
                              >
                                <span>
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>

                                {msg.failed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRetrySend(msg)}
                                    className="inline-flex items-center gap-0.5 text-rose-300 hover:underline font-bold"
                                  >
                                    <RefreshCw className="h-3 w-3" /> Retry
                                  </button>
                                ) : isOwnCluster && conversation?.type === "direct" && peerLastReadAt && new Date(peerLastReadAt).getTime() >= new Date(msg.created_at).getTime() ? (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-200 font-bold ml-1">
                                    <CheckCheck className="h-3 w-3" /> Seen
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Jump to Latest Floating Button */}
      {showJumpToLatest && (
        <div className="absolute bottom-16 right-4 z-20">
          <button
            type="button"
            onClick={scrollToBottom}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition animate-bounce"
          >
            <ChevronDown className="h-4 w-4" />
            <span>Latest messages</span>
          </button>
        </div>
      )}

      {/* Selected Resource Preview Bar */}
      {selectedResource && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-emerald-50/80 px-4 py-2 dark:border-slate-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
            <Paperclip className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">Attached: {selectedResource.title || selectedResource.file_name}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedResource(null)}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-30 p-2 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#18211f] grid grid-cols-8 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                const text = inputContent + emoji;
                setInputContent(text);
                saveChatDraft(conversationId, text);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Action Composer */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#14171c] z-10"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition"
          aria-label="Add emoji"
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowResourcePicker(true)}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition"
          aria-label="Attach a study resource"
          title="Share resource"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={inputContent}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder="Write a message..."
          className="min-w-0 flex-1 max-h-[120px] resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
        />

        <button
          type="submit"
          disabled={!inputContent.trim() && !selectedResource}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Group Members Sheet */}
      {showGroupMembersSheet && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs" onClick={() => setShowGroupMembersSheet(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{groupDetails?.name || "Group Members"}</h3>
                <p className="text-xs text-slate-500">{groupMembers.length} active members</p>
              </div>
              <button type="button" onClick={() => setShowGroupMembersSheet(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2">
              {groupMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-[#18211f]">
                  <div className="flex items-center gap-3">
                    {m.profile?.user_img ? (
                      <img src={m.profile.user_img} alt={m.profile.username} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                        {(m.profile?.full_name || m.profile?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{m.profile?.full_name || m.profile?.username || "Member"}</p>
                      <p className="text-[10px] text-slate-500">@{m.profile?.username || "user"}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{m.role || "member"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resource Picker Modal */}
      <ResourcePicker
        isOpen={showResourcePicker}
        onClose={() => setShowResourcePicker(false)}
        currentUserId={currentUserId}
        onSelectResource={(res) => setSelectedResource(res)}
      />

      {/* Report Modal */}
      {reportingMsgId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Report Message
              </h3>
              <button
                type="button"
                onClick={() => setReportingMsgId(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Please explain why this message violates community guidelines.
            </p>

            <textarea
              required
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate language, spam, or harassment..."
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingMsgId(null)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportSubmitting || !reportReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {reportSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
