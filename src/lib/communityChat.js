import { toDate, toTime } from "./dates.js";

/**
 * Community Chat & Notifications Helper Utilities
 */

/**
 * Formats a timestamp into a human-readable relative time string.
 * e.g., "just now", "5m ago", "2h ago", "3d ago", or formatted date "MMM D"
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return "just now";

  const date = toDate(dateInput);
  if (!date) return "just now";

  const now = new Date();
  const diffInSeconds = Math.floor((toTime(now) - toTime(date)) / 1000);

  if (diffInSeconds < 30) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Formats a date into a section header label: "Today", "Yesterday", or "MMM D, YYYY"
 */
export function formatDateSectionLabel(dateInput, now = new Date()) {
  if (!dateInput) return "Today";
  const date = toDate(dateInput);
  if (!date) return "Today";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffInDays = Math.round((toTime(today) - toTime(target)) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Groups messages chronologically by day and clusters consecutive messages by sender.
 * Fast O(N) path when array is already sorted, string comparison sorting fallback,
 * and date label caching per call.
 * Returns array of date groups:
 * [
 *   {
 *     dateLabel: "Today",
 *     clusters: [
 *       { senderId: "user-1", messages: [...] },
 *       ...
 *     ]
 *   }
 * ]
 */
export function groupMessagesByDateAndSender(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  // Parse timestamps and check if array is already sorted chronologically in a single pass
  let isSorted = true;
  const items = new Array(messages.length);
  let prevTime = -Infinity;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const time = msg && msg.created_at ? toTime(msg.created_at) : 0;
    if (time < prevTime) {
      isSorted = false;
    }
    prevTime = time;
    items[i] = { msg, time };
  }

  if (!isSorted) {
    items.sort((a, b) => a.time - b.time);
  }

  const dateGroupsMap = new Map();
  const dateLabelCache = new Map();
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const { msg, time } = items[i];
    if (!msg) continue;

    const dateObj = new Date(time);
    // Use local calendar date string (e.g. "Mon May 15 2023") as accurate local timezone cache key
    const localDayKey = dateObj.toDateString();

    let label = dateLabelCache.get(localDayKey);
    if (!label) {
      label = formatDateSectionLabel(dateObj, now);
      dateLabelCache.set(localDayKey, label);
    }

    let clusters = dateGroupsMap.get(label);
    if (!clusters) {
      clusters = [];
      dateGroupsMap.set(label, clusters);
    }

    const lastCluster = clusters[clusters.length - 1];

    if (lastCluster && lastCluster.senderId === msg.sender_id) {
      lastCluster.messages.push(msg);
    } else {
      clusters.push({
        senderId: msg.sender_id,
        messages: [msg],
      });
    }
  }

  const result = [];
  for (const [dateLabel, clusters] of dateGroupsMap.entries()) {
    result.push({ dateLabel, clusters });
  }

  return result;
}

/**
 * Calculates unread messages count for a conversation based on user's last_read_at
 */
export function calculateUnreadCount(messages = [], lastReadAt = null, currentUserId = null) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  if (!lastReadAt) {
    // If user has no last_read_at record, count all messages sent by others
    return messages.filter((m) => m.sender_id !== currentUserId).length;
  }

  const lastReadTime = toTime(lastReadAt);

  return messages.filter(
    (m) =>
      m.sender_id !== currentUserId &&
      toTime(m.created_at) > lastReadTime
  ).length;
}

/**
 * Gets signed URL for a file in private 'resources' Supabase storage bucket
 */
export async function getResourceSignedUrl(supabase, filePath, expiresIn = 3600) {
  if (!filePath || !supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.error("Failed to create signed URL:", err);
    return null;
  }
}

/**
 * Saves un-sent chat text draft to localStorage per conversation
 */
export function saveChatDraft(conversationId, text) {
  if (!conversationId) return;
  try {
    if (!text || !text.trim()) {
      localStorage.removeItem(`hyper-tutor-chat-draft:${conversationId}`);
    } else {
      localStorage.setItem(`hyper-tutor-chat-draft:${conversationId}`, text);
    }
  } catch (e) {
    console.error("Error saving chat draft:", e);
  }
}

/**
 * Retrieves un-sent chat draft from localStorage per conversation
 */
export function getChatDraft(conversationId) {
  if (!conversationId) return "";
  try {
    return localStorage.getItem(`hyper-tutor-chat-draft:${conversationId}`) || "";
  } catch (e) {
    console.error("Error loading chat draft:", e);
    return "";
  }
}

/**
 * Clears un-sent chat draft from localStorage
 */
export function clearChatDraft(conversationId) {
  if (!conversationId) return;
  try {
    localStorage.removeItem(`hyper-tutor-chat-draft:${conversationId}`);
  } catch (e) {
    console.error("Error clearing chat draft:", e);
  }
}

/**
 * Sanitizes a URL string to prevent XSS attacks (e.g. javascript:, data:, vbscript: protocols).
 * Returns the sanitized URL string or '#' if unsafe.
 */
export function sanitizeUrl(urlInput) {
  if (!urlInput || typeof urlInput !== "string") return "#";
  // Strip ASCII control characters and whitespace
  // eslint-disable-next-line no-control-regex
  const clean = urlInput.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!clean) return "#";

  // Allow safe absolute and relative URL protocols (http, https, mailto, tel, relative path / or #)
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(clean)) {
    return clean;
  }

  // Fallback to safe anchor for dangerous protocols (javascript:, data:, vbscript:, etc.)
  return "#";
}

/**
 * Parses text and returns an array of string parts and clickable URL links safely
 */
export function parseLinksInText(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.substring(lastIndex, match.index) });
    }
    const rawUrl = match[0];
    parts.push({ type: "link", value: sanitizeUrl(rawUrl), raw: rawUrl });
    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.substring(lastIndex) });
  }

  return parts;
}

/**
 * Toggles an emoji reaction for a message by a user.
 * Reactions parameter format: Map or Object of { [emoji]: [userIds...] }
 * Returns updated reactions object: { [emoji]: [userIds...] }
 */
export function toggleMessageReaction(reactions = {}, userId, emoji) {
  if (!emoji || !userId) return reactions || {};
  const currentReactions = { ...(reactions || {}) };
  const existingUsers = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];

  const userIndex = existingUsers.indexOf(userId);
  if (userIndex >= 0) {
    existingUsers.splice(userIndex, 1);
  } else {
    existingUsers.push(userId);
  }

  if (existingUsers.length > 0) {
    currentReactions[emoji] = existingUsers;
  } else {
    delete currentReactions[emoji];
  }

  return currentReactions;
}

/**
 * Filters a messages array by a keyword search string (case-insensitive search in content).
 */
export function filterMessagesBySearchQuery(messages = [], query = "") {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) return messages;

  return messages.filter((m) => {
    if (!m) return false;
    const textMatch = typeof m.content === "string" && m.content.toLowerCase().includes(trimmed);
    const resourceMatch = typeof m.resourceTitle === "string" && m.resourceTitle.toLowerCase().includes(trimmed);
    return textMatch || resourceMatch;
  });
}

/**
 * Resolves sender name and content snippet for a reply target message ID.
 */
export function formatReplyReference(messages = [], replyToId, profilesMap = {}) {
  if (!replyToId || !Array.isArray(messages)) return null;
  const targetMsg = messages.find((m) => m && m.id === replyToId);
  if (!targetMsg) return null;

  const senderProf = profilesMap[targetMsg.sender_id];
  const senderName = senderProf?.full_name || senderProf?.username || "Member";
  const snippet = targetMsg.content
    ? targetMsg.content.length > 60
      ? `${targetMsg.content.slice(0, 60)}...`
      : targetMsg.content
    : targetMsg.resource_id
    ? "Shared attachment"
    : "Message";

  return {
    id: targetMsg.id,
    senderId: targetMsg.sender_id,
    senderName,
    snippet,
  };
}

/**
 * Toggles a message ID in a pinned messages array.
 */
export function togglePinnedMessage(pinnedIds = [], messageId) {
  if (!messageId) return Array.isArray(pinnedIds) ? pinnedIds : [];
  const currentList = Array.isArray(pinnedIds) ? [...pinnedIds] : [];
  const idx = currentList.indexOf(messageId);

  if (idx >= 0) {
    currentList.splice(idx, 1);
  } else {
    currentList.push(messageId);
  }

  return currentList;
}
