import { createClient } from "npm:@supabase/supabase-js@^2.43.0";
import webpush from "npm:web-push@^3.6.7";

interface SendPushRequest {
  notificationId?: string;
  userId?: string;
  payload?: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    type?: string;
    conversationId?: string;
    actorId?: string;
    groupId?: string;
  };
}

function isQuietHours(startStr: string | null, endStr: string | null): boolean {
  if (!startStr || !endStr) return false;
  try {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = startStr.split(":").map(Number);
    const [eH, eM] = endStr.split(":").map(Number);
    const startMins = sH * 60 + (sM || 0);
    const endMins = eH * 60 + (eM || 0);

    if (startMins < endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      return currentMins >= startMins || currentMins < endMins;
    }
  } catch (_e) {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@hypertutor.app";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, message: "Missing Supabase env vars" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let body: SendPushRequest = {};
    try {
      body = await req.json();
    } catch (_e) {
      // Body optional
    }

    let targetUserId = body.userId;
    let callingUser: { id: string } | null = null;

    if (token !== serviceRoleKey) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, message: "Unauthorized user" }),
          { status: 401, headers: corsHeaders }
        );
      }

      callingUser = user;

      if (body.userId && body.userId !== user.id) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Forbidden: Cannot send push notification to another user",
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      if (!targetUserId) {
        targetUserId = user.id;
      }
    }

    let notifRow: any = null;

    if (body.notificationId) {
      const { data: nData } = await adminClient
        .from("in_app_notifications")
        .select("*")
        .eq("id", body.notificationId)
        .single();

      if (nData) {
        if (callingUser && nData.user_id !== callingUser.id) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Forbidden: Cannot access another user's notification",
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        notifRow = nData;
        targetUserId = nData.user_id;

        if (nData.delivery_status === "sent" || nData.delivery_status === "skipped") {
          return new Response(
            JSON.stringify({ success: true, message: "Notification already processed", status: nData.delivery_status }),
            { status: 200, headers: corsHeaders }
          );
        }
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ success: false, message: "Target userId is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: pref } = await adminClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const notifType = notifRow?.type || body.payload?.type || "message";
    const actorId = notifRow?.actor_id || body.payload?.actorId;
    const convId = notifRow?.conversation_id || body.payload?.conversationId;
    const groupId = notifRow?.data?.group_id || body.payload?.groupId;

    if (actorId && actorId === targetUserId) {
      if (notifRow) {
        await adminClient
          .from("in_app_notifications")
          .update({ delivery_status: "skipped" })
          .eq("id", notifRow.id);
      }
      return new Response(JSON.stringify({ success: true, message: "Skipped: self-action" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (pref) {
      if (pref.push_enabled === false) {
        if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
        return new Response(JSON.stringify({ success: true, message: "Skipped: push disabled in preferences" }), { status: 200, headers: corsHeaders });
      }

      if (notifType === "message" && pref.push_messages === false) {
        if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
        return new Response(JSON.stringify({ success: true, message: "Skipped: push_messages disabled" }), { status: 200, headers: corsHeaders });
      }

      if (notifType === "friend_request" && pref.push_friend_requests === false) {
        if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
        return new Response(JSON.stringify({ success: true, message: "Skipped: push_friend_requests disabled" }), { status: 200, headers: corsHeaders });
      }

      if (notifType === "friend_accepted" && pref.push_friend_accepts === false) {
        if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
        return new Response(JSON.stringify({ success: true, message: "Skipped: push_friend_accepts disabled" }), { status: 200, headers: corsHeaders });
      }

      if (isQuietHours(pref.quiet_hours_start, pref.quiet_hours_end)) {
        if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
        return new Response(JSON.stringify({ success: true, message: "Skipped: quiet hours active" }), { status: 200, headers: corsHeaders });
      }
    }

    if (convId) {
      const { data: muteData } = await adminClient
        .from("conversation_mutes")
        .select("muted_until")
        .eq("user_id", targetUserId)
        .eq("conversation_id", convId)
        .maybeSingle();

      if (muteData) {
        const isMuted = !muteData.muted_until || new Date(muteData.muted_until).getTime() > Date.now();
        if (isMuted) {
          if (notifRow) await adminClient.from("in_app_notifications").update({ delivery_status: "skipped" }).eq("id", notifRow.id);
          return new Response(JSON.stringify({ success: true, message: "Skipped: conversation muted" }), { status: 200, headers: corsHeaders });
        }
      }
    }

    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (!subs || subs.length === 0) {
      if (notifRow) {
        await adminClient.from("in_app_notifications").update({ delivery_status: "failed" }).eq("id", notifRow.id);
      }
      return new Response(JSON.stringify({ success: false, message: "No push subscriptions registered" }), { status: 200, headers: corsHeaders });
    }

    let title = notifRow?.title || body.payload?.title || "Hyper Tutor";
    let messageBody = notifRow?.body || body.payload?.body || "You have a new update.";
    let url = body.payload?.url || "/community/groups";
    let tag = body.payload?.tag || `notif-${Date.now()}`;

    if (notifType === "message") {
      url = convId ? `/community/chat/${convId}` : "/community/chat";
      tag = convId ? `chat-${convId}` : `chat-general`;

      if (pref && pref.show_message_preview === false) {
        messageBody = "Sent you a message";
      } else if (messageBody && messageBody.length > 100) {
        messageBody = messageBody.substring(0, 97) + "...";
      }
    } else if (notifType === "friend_request" || notifType === "friend_accepted") {
      url = "/community/friends";
      tag = notifType;
    } else if (notifType === "group_join_request") {
      url = groupId ? `/community/groups?groupId=${groupId}&tab=requests` : "/community/groups";
      tag = groupId ? `group-req-${groupId}` : "group-requests";
    } else if (notifType === "group_request_accepted" || notifType === "group_request_declined") {
      url = groupId ? `/community/groups?groupId=${groupId}` : "/community/groups";
      tag = groupId ? `group-status-${groupId}` : "group-status";
    }

    let icon = "/icons/icon-192.png";
    if (actorId) {
      const { data: actorProf } = await adminClient
        .from("community_profiles")
        .select("user_img")
        .eq("user_id", actorId)
        .maybeSingle();

      if (actorProf?.user_img) {
        icon = actorProf.user_img;
      }
    }

    const notificationPayload = JSON.stringify({
      title,
      body: messageBody,
      url,
      tag,
      icon,
    });

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } else {
      return new Response(JSON.stringify({ success: false, message: "VAPID keys not configured on server" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    let sent = 0;
    const expiredSubIds: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload,
          { TTL: 3600, urgency: "high" }
        );
        sent++;
      } catch (pushErr: any) {
        console.error(`Push dispatch failed for sub ${sub.id}:`, pushErr?.statusCode || pushErr);
        if (pushErr?.statusCode === 404 || pushErr?.statusCode === 410) {
          expiredSubIds.push(sub.id);
        }
      }
    }

    if (expiredSubIds.length > 0) {
      await adminClient.from("push_subscriptions").delete().in("id", expiredSubIds);
    }

    if (notifRow) {
      await adminClient
        .from("in_app_notifications")
        .update({
          delivery_status: sent > 0 ? "sent" : "failed",
          pushed_at: sent > 0 ? new Date().toISOString() : null,
        })
        .eq("id", notifRow.id);
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        sent,
        removedExpired: expiredSubIds.length,
        message: sent > 0 ? "Push notification delivered successfully!" : "Failed to deliver push notification.",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Error in send-push Edge Function:", err);
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
