/**
 * Community Chat & Notifications Helper Utilities
 */

/**
 * Formats a timestamp into a human-readable relative time string.
 * e.g., "just now", "5m ago", "2h ago", "3d ago", or formatted date "MMM D"
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return "just now";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "just now";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
export function formatDateSectionLabel(dateInput) {
  if (!dateInput) return "Today";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Today";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffInDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

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

  // Sort messages chronologically (oldest first)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const dateGroupsMap = new Map();

  for (const message of sorted) {
    const label = formatDateSectionLabel(message.created_at);
    if (!dateGroupsMap.has(label)) {
      dateGroupsMap.set(label, []);
    }

    const clusters = dateGroupsMap.get(label);
    const lastCluster = clusters[clusters.length - 1];

    if (lastCluster && lastCluster.senderId === message.sender_id) {
      lastCluster.messages.push(message);
    } else {
      clusters.push({
        senderId: message.sender_id,
        messages: [message],
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

  const lastReadTime = new Date(lastReadAt).getTime();
  if (Number.isNaN(lastReadTime)) return 0;

  return messages.filter(
    (m) =>
      m.sender_id !== currentUserId &&
      new Date(m.created_at).getTime() > lastReadTime
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
