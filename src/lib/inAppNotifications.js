/**
 * Helper to compute notification text and route for deep linking
 */
export function getNotificationDetails(item, actorName = "Someone") {
  if (!item) return { text: "New notification", route: "/notifications" };
  const payload = item.payload || {};
  const type = item.type;

  switch (type) {
    case "friend_request":
      return {
        text: `${actorName} sent you a friend request.`,
        route: `/community/u/${item.actor_id || ""}`,
      };

    case "friend_request_accepted":
      return {
        text: `${actorName} accepted your friend request.`,
        route: `/community/u/${item.actor_id || ""}`,
      };

    case "new_message": {
      const isGroup = payload.conversation_type === "group";
      const groupName = payload.group_name || "group";
      const countSuffix = payload.count && payload.count > 1 ? ` · ${payload.count} new messages` : "";
      const preview = payload.preview || "Sent a message";
      const prefix = isGroup ? `${actorName} in ${groupName}` : actorName;
      return {
        text: `${prefix}: ${preview}${countSuffix}`,
        route: payload.conversation_id ? `/community/chat/${payload.conversation_id}` : "/Community",
      };
    }

    case "group_study_session_scheduled": {
      const title = payload.title || "Study Session";
      const groupName = payload.group_name ? ` in ${payload.group_name}` : "";
      let dateStr = "";
      if (payload.scheduled_start) {
        try {
          dateStr = ` · ${new Date(payload.scheduled_start).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`;
        } catch (e) {
          dateStr = "";
        }
      }
      return {
        text: `${actorName} scheduled ${title}${groupName}${dateStr}`,
        route: "/Community",
      };
    }

    case "group_study_session_live": {
      const title = payload.title || "Study Session";
      return {
        text: `${title} is live now`,
        route: "/Community",
      };
    }

    case "group_study_session_cancelled": {
      const title = payload.title || "Study Session";
      return {
        text: `${title} was cancelled`,
        route: "/Community",
      };
    }

    case "group_join_request": {
      const groupName = payload.group_name ? ` ${payload.group_name}` : "";
      return {
        text: `${actorName} requested to join${groupName}`,
        route: "/Community",
      };
    }

    case "group_join_approved": {
      const groupName = payload.group_name || "the study group";
      return {
        text: `You're now in ${groupName}`,
        route: "/Community",
      };
    }

    case "group_member_joined": {
      const groupName = payload.group_name || "the study group";
      return {
        text: `${actorName} joined ${groupName}`,
        route: "/Community",
      };
    }

    default:
      return {
        text: payload.message || payload.preview || item.body || "New activity update.",
        route: "/Community",
      };
  }
}

/**
 * Groups notification items into Today, Yesterday, and Earlier.
 */
export function groupNotificationsByDate(notifications = []) {
  const today = [];
  const yesterday = [];
  const earlier = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  notifications.forEach((item) => {
    const itemTime = new Date(item.created_at || Date.now()).getTime();
    if (itemTime >= startOfToday) {
      today.push(item);
    } else if (itemTime >= startOfYesterday) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  });

  return { today, yesterday, earlier };
}
