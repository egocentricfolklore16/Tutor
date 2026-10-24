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
  RefreshCw,
  X,
  Smile,
  ChevronDown,
  Calendar,
  CheckCheck,
  MoreVertical,
  BellOff,
  Bell,
  Pin,
  Reply,
  Edit2,
  Search,
  PinOff,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { toTime } from "../../lib/dates";
import ResourcePicker from "./ResourcePicker";
import ResourceCard from "./ResourceCard";
import {
  groupMessagesByDateAndSender,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  parseLinksInText,
  sanitizeUrl,
  toggleMessageReaction,
  filterMessagesBySearchQuery,
  formatReplyReference,
  togglePinnedMessage,
} from "../../lib/communityChat";

const EMOJI_LIST = ["😀", "😂", "😍", "👍", "❤️", "🔥", "🎉", "📚", "💡", "👏", "💯", "🙏", "✨", "🙌", "🎓", "⭐"];

export default function ChatThread({
  conversationId,
  currentUserId,
  onBack,
  headerAction,
}) {
  const [conversation, setConversation] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState(null);
  const [senderProfiles, setSenderProfiles] = useState({});
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupMemberCount] = useState(0);
  const [groupMembers] = useState([]);
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

  // Mute State & Dropdown Menu
  const [isMuted, setIsMuted] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Reporting modal
  const [reportingMsgId, setReportingMsgId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Active action menu for touch/mobile or hover
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Pinned Messages state
  const [pinnedMsgIds, setPinnedMsgIds] = useState([]);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);

  // Reply & Quote state
  const [replyingToMsgId, setReplyingToMsgId] = useState(null);

  // Editing Message state
  const [editingMsgId, setEditingMsgId] = useState(null);

  // In-Chat Keyword Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile Touch Action Sheet state
  const [mobileActionMsg, setMobileActionMsg] = useState(null);

  // Avatar error fallback tracking
  const [imgErrors, setImgErrors] = useState({});

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

  // Check initial mute status
  const checkMuteStatus = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    try {
      const { data } = await supabase
        .from("conversation_mutes")
        .select("muted_until")
        .eq("user_id", currentUserId)
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (data) {
        const active = !data.muted_until || toTime(data.muted_until) > Date.now();
        setIsMuted(active);
      } else {
        setIsMuted(false);
      }
    } catch {
      // Ignore error
    }
  }, [conversationId, currentUserId]);

  const handleMuteConversation = async (durationHours) => {
    setShowHeaderMenu(false);
    setShowMuteMenu(false);
    let mutedUntil = null;

    if (durationHours > 0) {
      const date = new Date();
      date.setHours(date.getHours() + durationHours);
      mutedUntil = date.toISOString();
    }

    try {
      const { error } = await supabase.from("conversation_mutes").upsert(
        {
          user_id: currentUserId,
          conversation_id: conversationId,
          muted_until: mutedUntil,
        },
        { onConflict: "user_id,conversation_id" }
      );

      if (error) throw error;

      setIsMuted(true);
      showToast(
        durationHours > 0
          ? `Conversation muted for ${durationHours} hour${durationHours > 1 ? "s" : ""}.`
          : "Conversation muted indefinitely."
      );
    } catch (err) {
      console.error("Error muting conversation:", err);
      showToast("Unable to mute conversation.");
    }
  };

  const handleUnmuteConversation = async () => {
    setShowHeaderMenu(false);
    try {
      await supabase
        .from("conversation_mutes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("conversation_id", conversationId);

      setIsMuted(false);
      showToast("Conversation unmuted.");
    } catch (err) {
      console.error("Error unmuting conversation:", err);
      showToast("Unable to unmute conversation.");
    }
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
    checkMuteStatus();
  }, [conversationId, checkMuteStatus]);

  // Save draft on input change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputContent(text);
    saveChatDraft(conversationId, text);

    sendTypingBroadcast();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const presenceChannelRef = useRef(null);

  // Realtime Broadcast & Presence
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channelName = `chat_presence:${conversationId}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } },
    });
    presenceChannelRef.current = channel;

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
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
      clearTimeout(typingTimerRef.current);
    };
  }, [conversationId, currentUserId]);

  const sendTypingBroadcast = () => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.send({
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
          const { data: parts, error: partErr } = await supabase
            .from("conversation_participants")
            .select("user_id, last_read_at")
            .eq("conversation_id", conversationId);

          if (!partErr && parts) {
            const peerPart = parts.find((p) => p.user_id !== currentUserId);
            if (peerPart) {
              setPeerLastReadAt(peerPart.last_read_at);
              const { data: prof } = await supabase.rpc("get_public_profile", {
                p_user_id: peerPart.user_id,
              });

              if (isMounted) setPeerProfile(prof);
            }
          }
        } else if (conv.type === "group" && conv.study_group_id) {
          try {
            const { data: grp } = await supabase
              .from("study_groups")
              .select("*")
              .eq("id", conv.study_group_id)
              .maybeSingle();

            if (isMounted && grp) {
              setGroupDetails(grp);
            }
          } catch {
            // ignore if group table missing
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

  const fetchSenderProfiles = useCallback(async (senderIds) => {
    if (!senderIds || senderIds.length === 0) return;
    try {
      const profsList = await Promise.all(
        senderIds.map(async (uid) => {
          const { data, error } = await supabase.rpc("get_public_profile", {
            p_user_id: uid,
          });
          if (error) return null;
          return { user_id: uid, ...data };
        })
      );

      setSenderProfiles((prev) => {
        const next = { ...prev };
        profsList.forEach((p) => {
          if (p) next[p.user_id] = p;
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch sender profiles:", err);
    }
  }, []);

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

      const items = (data || []).reverse();
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

  // Realtime subscription for INSERTs & DELETEs
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channelName = `chat_messages:${conversationId}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel
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

            if (!isUserNearBottom.current) {
              setNewMessagesCount((c) => c + 1);
              setShowJumpToLatest(true);
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
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, fetchSenderProfiles, updateLastReadAt]);

  // Toggle Emoji Reaction
  const handleToggleReaction = async (msgId, emoji) => {
    setMobileActionMsg(null);
    setActiveMenuMsgId(null);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const updatedReactions = toggleMessageReaction(m.reactions || {}, currentUserId, emoji);
        return { ...m, reactions: updatedReactions };
      })
    );

    try {
      // Optional Supabase DB sync for message_reactions table
      await supabase.from("message_reactions").upsert(
        {
          message_id: msgId,
          user_id: currentUserId,
          emoji,
        },
        { onConflict: "message_id,user_id,emoji" }
      );
    } catch {
      // Ignore database mismatch gracefully
    }
  };

  // Toggle Pinned Message
  const handleTogglePin = async (msgId) => {
    setMobileActionMsg(null);
    setActiveMenuMsgId(null);

    const isPinned = pinnedMsgIds.includes(msgId);
    const updatedPins = togglePinnedMessage(pinnedMsgIds, msgId);
    setPinnedMsgIds(updatedPins);

    showToast(isPinned ? "Message unpinned." : "Message pinned to chat.");

    try {
      if (isPinned) {
        await supabase.from("pinned_messages").delete().eq("conversation_id", conversationId).eq("message_id", msgId);
      } else {
        await supabase.from("pinned_messages").insert({ conversation_id: conversationId, message_id: msgId, pinned_by: currentUserId });
      }
    } catch {
      // Ignore if table missing
    }
  };

  // Start Replying
  const handleStartReply = (msg) => {
    setEditingMsgId(null);
    setReplyingToMsgId(msg.id);
    setMobileActionMsg(null);
    setActiveMenuMsgId(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Start Editing
  const handleStartEdit = (msg) => {
    if (msg.sender_id !== currentUserId) return;
    setReplyingToMsgId(null);
    setEditingMsgId(msg.id);
    setInputContent(msg.content || "");
    setMobileActionMsg(null);
    setActiveMenuMsgId(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Cancel Edit or Reply
  const handleCancelComposerAction = () => {
    setEditingMsgId(null);
    setReplyingToMsgId(null);
    setInputContent("");
    clearChatDraft(conversationId);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Send or Update Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const content = inputContent.trim();
    const resourceId = selectedResource?.id || null;

    if (!content && !resourceId) return;

    if (editingMsgId) {
      // Handle Edit Mode
      const msgIdToUpdate = editingMsgId;
      setEditingMsgId(null);
      setInputContent("");
      clearChatDraft(conversationId);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgIdToUpdate ? { ...m, content, is_edited: true, updated_at: new Date().toISOString() } : m
        )
      );

      try {
        await supabase.from("messages").update({ content, is_edited: true }).eq("id", msgIdToUpdate);
        showToast("Message updated.");
      } catch (err) {
        console.error("Error editing message:", err);
      }
      return;
    }

    // Handle New Message
    const replyRefId = replyingToMsgId;
    setReplyingToMsgId(null);

    const tempId = `opt-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      resource_id: resourceId,
      reply_to_message_id: replyRefId,
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
          reply_to_message_id: replyRefId,
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
      showToast("Retry failed. Check network connection.");
    }
  };

  const handleCopyMessage = (content) => {
    if (!content) return;
    navigator.clipboard?.writeText(content).then(
      () => showToast("Message copied to clipboard!"),
      () => showToast("Failed to copy message.")
    );
    setActiveMenuMsgId(null);
  };

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

  const displayedMessages = filterMessagesBySearchQuery(messages, searchQuery);
  const dateGroups = groupMessagesByDateAndSender(displayedMessages);

  const titleName =
    conversation?.type === "direct"
      ? peerProfile?.full_name || peerProfile?.username || "Direct Chat"
      : groupDetails?.name || "Group Chat";

  const isPeerAvatarFallback = !peerProfile?.user_img || imgErrors["peer"];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#14171c] overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="shrink-0 bg-emerald-600 text-white text-[12px] font-medium px-3.5 py-1.5 flex items-center justify-between z-30 transition">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-[#18211f] flex items-center gap-2 z-20">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this chat..."
            className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Banner Drawer */}
      {showPinnedDrawer && pinnedMsgIds.length > 0 && (
        <div className="shrink-0 border-b border-amber-200/60 bg-amber-50/90 px-3 py-2 dark:border-amber-950/60 dark:bg-amber-950/30 z-20">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Pinned Study Notes & Messages</span>
            </span>
            <button type="button" onClick={() => setShowPinnedDrawer(false)} className="p-1 text-amber-700 hover:text-amber-950 dark:text-amber-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {pinnedMsgIds.map((pId) => {
              const pMsg = messages.find((m) => m.id === pId);
              if (!pMsg) return null;
              const pProf = senderProfiles[pMsg.sender_id];
              return (
                <div
                  key={pId}
                  onClick={() => {
                    const el = document.getElementById(`msg-bubble-${pId}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="flex items-center justify-between rounded-lg bg-white/80 p-2 text-[11px] font-normal text-slate-800 shadow-xs cursor-pointer hover:bg-white dark:bg-slate-900/80 dark:text-slate-200"
                >
                  <span className="truncate pr-2">
                    <strong className="font-semibold">{pProf?.full_name || pProf?.username || "Member"}:</strong>{" "}
                    {pMsg.content || "Shared attachment"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(pId);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:text-rose-600 p-1 shrink-0"
                    title="Unpin"
                  >
                    <PinOff className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slim Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#14171c] z-20">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition md:hidden"
              aria-label="Back to messages"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div
            className="flex items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => conversation?.type === "group" && setShowGroupMembersSheet(true)}
          >
            <div className="relative shrink-0">
              {conversation?.type === "direct" ? (
                !isPeerAvatarFallback ? (
                  <img
                    src={peerProfile.user_img}
                    alt={titleName}
                    onError={() => setImgErrors((prev) => ({ ...prev, peer: true }))}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 font-medium text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 text-xs">
                    {titleName.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-200 font-medium text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                  <Users className="h-3.5 w-3.5" />
                </div>
              )}
              {conversation?.type === "direct" && isPeerOnline && (
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14171c]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {titleName}
                </h3>
                {isMuted && <BellOff className="h-3 w-3 text-slate-400" title="Muted" />}
              </div>
              {conversation?.type === "group" && (
                <p className="text-[11px] text-slate-500 font-normal">
                  {groupMemberCount} members
                </p>
              )}
              {conversation?.type === "direct" && (
                <p className="text-[11px] text-slate-500 font-normal">
                  {isPeerTyping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">Typing...</span>
                  ) : isPeerOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                  ) : (
                    `@${peerProfile?.username || "user"}`
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowSearch((prev) => !prev);
              if (showSearch) setSearchQuery("");
            }}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            title="Search conversation"
            aria-label="Search conversation"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Pinned Messages Button */}
          {pinnedMsgIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPinnedDrawer((prev) => !prev)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200 transition"
              title="View pinned messages"
            >
              <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{pinnedMsgIds.length} Pinned</span>
            </button>
          )}

          {conversation?.type === "group" && (
            <a
              href="/Planner"
              className="hidden sm:inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-emerald-700 transition"
              title="Schedule session"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Schedule</span>
            </a>
          )}

          {headerAction}

          {/* Header Dropdown Menu (Mute) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHeaderMenu((prev) => !prev)}
              aria-label="Conversation options"
              title="Conversation options"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showHeaderMenu && (
              <div className="absolute right-0 mt-1 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#18211f]">
                {isMuted ? (
                  <button
                    type="button"
                    onClick={handleUnmuteConversation}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Bell className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Unmute Notifications</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMuteMenu((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <BellOff className="h-3.5 w-3.5 text-slate-500" />
                      <span>Mute Notifications</span>
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                )}

                {showMuteMenu && !isMuted && (
                  <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800 space-y-0.5">
                    {[
                      { label: "For 1 Hour", hours: 1 },
                      { label: "For 8 Hours", hours: 8 },
                      { label: "For 1 Week", hours: 168 },
                      { label: "Indefinitely", hours: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleMuteConversation(opt.hours)}
                        className="flex w-full items-center px-2.5 py-1 text-[11px] font-normal text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 rounded-md"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages List Area */}
      <div
        ref={threadContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3.5 space-y-3 bg-slate-50/50 dark:bg-[#18211f]/30"
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs font-normal text-slate-400">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-2">
              <Send className="h-4 w-4" />
            </div>
            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              Select a conversation or start a new chat
            </p>
            <p className="text-[11px] font-normal text-slate-500 max-w-xs mt-1">
              Send a message to kick off the study session!
            </p>
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-1.5">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              </div>
            )}

            {dateGroups.map((group) => (
              <div key={group.dateLabel} className="space-y-2">
                {/* Date Separator */}
                <div className="flex items-center justify-center my-1.5">
                  <span className="rounded-full bg-slate-200/60 px-2.5 py-0.5 text-[10px] font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Clusters */}
                {group.clusters.map((cluster, cIdx) => {
                  const isOwnCluster = cluster.senderId === currentUserId;
                  const senderProf = senderProfiles[cluster.senderId];
                  const senderName =
                    senderProf?.full_name || senderProf?.username || "Member";

                  return (
                    <div
                      key={`${cluster.senderId}-${cIdx}`}
                      className={`flex flex-col w-full ${
                        isOwnCluster ? "items-end" : "items-start"
                      }`}
                    >
                      {!isOwnCluster && conversation?.type === "group" && (
                        <span className="mb-0.5 ml-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {senderName}
                        </span>
                      )}

                      <div
                        className={`space-y-0.5 max-w-[85%] sm:max-w-[75%] min-w-0 flex flex-col ${
                          isOwnCluster ? "items-end" : "items-start"
                        }`}
                      >
                        {cluster.messages.map((msg, mIdx) => {
                          const isLastInCluster = mIdx === cluster.messages.length - 1;
                          const isPinned = pinnedMsgIds.includes(msg.id);
                          const replyRef = formatReplyReference(messages, msg.reply_to_message_id, senderProfiles);
                          const reactionsMap = msg.reactions || {};
                          const reactionEntries = Object.entries(reactionsMap).filter(([, uids]) => Array.isArray(uids) && uids.length > 0);

                          return (
                            <div key={msg.id} id={`msg-bubble-${msg.id}`} className="group relative flex flex-col max-w-full">
                              <div className="flex items-center gap-1 max-w-full">
                                {!msg.failed && (
                                  <div
                                    className={`flex items-center shrink-0 ${
                                      isOwnCluster ? "order-first" : "order-last"
                                    }`}
                                  >
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.innerWidth < 768) {
                                            setMobileActionMsg(msg);
                                          } else {
                                            setActiveMenuMsgId((prev) => (prev === msg.id ? null : msg.id));
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        title="Message options"
                                        aria-label="Message options"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>

                                      {activeMenuMsgId === msg.id && (
                                        <div
                                          className={`absolute bottom-full mb-1 z-30 flex flex-col rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#18211f] min-w-[130px] ${
                                            isOwnCluster ? "right-0" : "left-0"
                                          }`}
                                        >
                                          {/* Quick Emoji Bar */}
                                          <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 mb-1 dark:border-slate-800">
                                            {["👍", "❤️", "🔥", "💡", "🎓"].map((e) => (
                                              <button
                                                key={e}
                                                type="button"
                                                onClick={() => handleToggleReaction(msg.id, e)}
                                                className="p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                              >
                                                {e}
                                              </button>
                                            ))}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleStartReply(msg)}
                                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                          >
                                            <Reply className="h-3 w-3" /> Reply
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleTogglePin(msg.id)}
                                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
                                          >
                                            <Pin className="h-3 w-3" /> {isPinned ? "Unpin" : "Pin Note"}
                                          </button>

                                          {msg.content && (
                                            <button
                                              type="button"
                                              onClick={() => handleCopyMessage(msg.content)}
                                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                              <Copy className="h-3 w-3" /> Copy
                                            </button>
                                          )}

                                          {isOwnCluster ? (
                                            <>
                                              {msg.content && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartEdit(msg)}
                                                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                                                >
                                                  <Edit2 className="h-3 w-3" /> Edit
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                              >
                                                <Trash2 className="h-3 w-3" /> Delete
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuMsgId(null);
                                                setReportingMsgId(msg.id);
                                              }}
                                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-normal text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                            >
                                              <Flag className="h-3 w-3" /> Report
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Compact WhatsApp-style message bubble */}
                                <div
                                  className={`rounded-lg px-2.5 py-1.5 text-[13px] leading-[1.35] font-normal transition duration-150 max-w-full break-words [overflow-wrap:anywhere] relative ${
                                    isOwnCluster
                                      ? "bg-emerald-600 text-white rounded-br-xs"
                                      : "bg-white text-slate-800 border border-slate-200/80 dark:bg-[#14171c] dark:border-slate-800 dark:text-slate-100 rounded-bl-xs"
                                  } ${msg.failed ? "opacity-60 border-rose-500" : ""}`}
                                >
                                  {/* Pinned Badge Indicator */}
                                  {isPinned && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 dark:text-amber-400 mb-1">
                                      <Pin className="h-3 w-3" />
                                      <span>Pinned Note</span>
                                    </div>
                                  )}

                                  {/* Quoted Reply Reference */}
                                  {replyRef && (
                                    <div
                                      onClick={() => {
                                        const el = document.getElementById(`msg-bubble-${replyRef.id}`);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }}
                                      className={`mb-1.5 rounded-md p-1.5 text-[11px] cursor-pointer border-l-2 ${
                                        isOwnCluster
                                          ? "bg-emerald-700/60 border-emerald-300 text-emerald-100"
                                          : "bg-slate-100 border-emerald-600 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`}
                                    >
                                      <span className="font-semibold block">{replyRef.senderName}</span>
                                      <span className="truncate block opacity-90">{replyRef.snippet}</span>
                                    </div>
                                  )}

                                  {msg.content && (
                                    <p className="leading-[1.35] font-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                      {parseLinksInText(msg.content).map((part, pIdx) =>
                                        part.type === "link" ? (
                                          <a
                                            key={pIdx}
                                            href={sanitizeUrl(part.value)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline font-normal hover:opacity-80"
                                          >
                                            {part.value}
                                          </a>
                                        ) : (
                                          <React.Fragment key={pIdx}>{part.value}</React.Fragment>
                                        )
                                      )}
                                    </p>
                                  )}

                                  {msg.resource_id && (
                                    <ResourceCard
                                      resourceId={msg.resource_id}
                                      isOwn={isOwnCluster}
                                      isOptimistic={msg.isOptimistic}
                                      failed={msg.failed}
                                      onRetry={() => handleRetrySend(msg)}
                                    />
                                  )}

                                  {/* Timestamp, edited badge & read ticks */}
                                  {(isLastInCluster || msg.failed || msg.is_edited) && (
                                    <div
                                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] font-normal ${
                                        isOwnCluster ? "text-emerald-100" : "text-slate-400"
                                      }`}
                                    >
                                      {msg.is_edited && <span className="italic opacity-80">(edited)</span>}
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
                                          className="inline-flex items-center gap-0.5 text-rose-300 font-normal hover:underline"
                                        >
                                          <RefreshCw className="h-3 w-3" /> Retry
                                        </button>
                                      ) : isOwnCluster && conversation?.type === "direct" && peerLastReadAt && toTime(peerLastReadAt) >= toTime(msg.created_at) ? (
                                        <span className="inline-flex items-center text-emerald-200 font-normal ml-0.5">
                                          <CheckCheck className="h-3 w-3" />
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Emoji Reaction Pills */}
                              {reactionEntries.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isOwnCluster ? "justify-end" : "justify-start"}`}>
                                  {reactionEntries.map(([emoji, uids]) => {
                                    const hasUserReacted = uids.includes(currentUserId);
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition border ${
                                          hasUserReacted
                                            ? "bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-600 dark:text-emerald-200"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        <span>{uids.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Peer Typing Indicator */}
            {isPeerTyping && (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] py-1 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Jump to Latest Floating Button */}
      {showJumpToLatest && (
        <div className="absolute bottom-14 right-3 z-20">
          <button
            type="button"
            onClick={scrollToBottom}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-md hover:bg-emerald-700 transition"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            <span>
              {newMessagesCount > 0 ? `${newMessagesCount} new` : "Latest"}
            </span>
          </button>
        </div>
      )}

      {/* Replying Preview Bar */}
      {replyingToMsgId && (
        <div className="shrink-0 flex items-center justify-between border-t border-emerald-100 bg-emerald-50/90 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/40 z-10">
          <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 truncate min-w-0">
            <Reply className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">
              Replying to <strong>{formatReplyReference(messages, replyingToMsgId, senderProfiles)?.senderName}</strong>:{" "}
              {formatReplyReference(messages, replyingToMsgId, senderProfiles)?.snippet}
            </span>
          </div>
          <button type="button" onClick={handleCancelComposerAction} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editing Preview Bar */}
      {editingMsgId && (
        <div className="shrink-0 flex items-center justify-between border-t border-indigo-100 bg-indigo-50/90 px-3 py-1.5 dark:border-indigo-900/40 dark:bg-indigo-950/40 z-10">
          <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 truncate min-w-0">
            <Edit2 className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="truncate">Editing message...</span>
          </div>
          <button type="button" onClick={handleCancelComposerAction} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Selected Resource Preview Bar */}
      {selectedResource && (
        <div className="shrink-0 flex items-center justify-between border-t border-slate-100 bg-emerald-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-900 dark:text-emerald-200 truncate min-w-0">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">Attached: {selectedResource.title || selectedResource.file_name}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedResource(null)}
            className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-14 left-3 z-30 p-2 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#18211f] grid grid-cols-8 gap-1">
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
              className="p-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input */}
      <form
        onSubmit={handleSendMessage}
        className="shrink-0 flex items-end gap-1.5 border-t border-slate-100 bg-white p-2 sm:p-2.5 dark:border-slate-800 dark:bg-[#14171c] z-10 pb-safe min-w-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          aria-label="Emoji"
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowResourcePicker(true)}
          className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          aria-label="Share resource"
          title="Share resource"
        >
          <Paperclip className="h-4 w-4" />
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
          className="min-w-0 flex-1 max-h-[120px] resize-none rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-[13px] font-normal text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-[#18211f] dark:text-white"
        />

        <button
          type="submit"
          disabled={!inputContent.trim() && !selectedResource}
          className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Group Members Sheet */}
      {showGroupMembersSheet && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs" onClick={() => setShowGroupMembersSheet(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{groupDetails?.name || "Group Members"}</h3>
                <p className="text-xs text-slate-500">{groupMemberCount} active members</p>
              </div>
              <button type="button" onClick={() => setShowGroupMembersSheet(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-1.5">
              {groupMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-[#18211f]">
                  <div className="flex items-center gap-2.5">
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

      <ResourcePicker
        isOpen={showResourcePicker}
        onClose={() => setShowResourcePicker(false)}
        currentUserId={currentUserId}
        onSelectResource={(res) => setSelectedResource(res)}
      />

      {/* Mobile Touch Action Sheet */}
      {mobileActionMsg && (
        <div
          className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileActionMsg(null)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-[#14171c] space-y-3 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Message Actions</span>
              <button type="button" onClick={() => setMobileActionMsg(null)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Reactions Bar */}
            <div className="flex items-center justify-around py-1 bg-slate-50 dark:bg-slate-900 rounded-xl">
              {["👍", "❤️", "🔥", "💡", "🎓", "🎉"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleToggleReaction(mobileActionMsg.id, e)}
                  className="p-2 text-xl hover:scale-125 transition"
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStartReply(mobileActionMsg)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <Reply className="h-4 w-4" /> Reply
              </button>

              <button
                type="button"
                onClick={() => handleTogglePin(mobileActionMsg.id)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-50 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                <Pin className="h-4 w-4" /> {pinnedMsgIds.includes(mobileActionMsg.id) ? "Unpin" : "Pin Note"}
              </button>

              {mobileActionMsg.content && (
                <button
                  type="button"
                  onClick={() => handleCopyMessage(mobileActionMsg.content)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              )}

              {mobileActionMsg.sender_id === currentUserId ? (
                <>
                  {mobileActionMsg.content && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(mobileActionMsg)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const mId = mobileActionMsg.id;
                      setMobileActionMsg(null);
                      handleDeleteMessage(mId);
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const mId = mobileActionMsg.id;
                    setMobileActionMsg(null);
                    setReportingMsgId(mId);
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-50 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-200"
                >
                  <Flag className="h-4 w-4" /> Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {reportingMsgId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
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

            <p className="mt-1.5 text-xs text-slate-500">
              Please state your reason for reporting this message.
            </p>

            <textarea
              required
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate language, spam..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingMsgId(null)}
                className="rounded-xl bg-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportSubmitting || !reportReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
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
