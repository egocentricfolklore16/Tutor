import { createClient } from "npm:@supabase/supabase-js@^2.43.0";
import webpush from "npm:web-push@^3.6.7";

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Missing Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized user" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    let requestBody: { userId?: string; payload?: PushPayload } = {};
    try {
      requestBody = await req.json();
    } catch (_err) {
      // Empty body or optional parameters
    }

    // Security: Prevent IDOR / unauthorized push dispatching to arbitrary users
    if (requestBody.userId && requestBody.userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, message: "Forbidden: Cannot send push notification to another user" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const targetUserId = user.id;

    // Configure VAPID details
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@hypertutor.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ success: false, message: "VAPID credentials not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch user subscriptions
    const { data: subs, error: subsError } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (subsError || !subs || subs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          sent: 0,
          message: "No push subscriptions found for target user.",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const notificationPayload = JSON.stringify({
      title: requestBody.payload?.title || "Hyper Tutor",
      body: requestBody.payload?.body || "You have a new update in Hyper Tutor.",
      url: requestBody.payload?.url || "/Dashboard",
      tag: requestBody.payload?.tag || "general-push-" + Date.now(),
    });

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
          { TTL: 60, urgency: "high" }
        );
        sent++;
      } catch (err: any) {
        console.error(`Push send failed for sub ${sub.id}:`, err?.statusCode || err?.message || err);
        // Remove expired (410 Gone / 404 Not Found) subscriptions
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredSubIds.push(sub.id);
        }
      }
    }

    if (expiredSubIds.length > 0) {
      await adminClient.from("push_subscriptions").delete().in("id", expiredSubIds);
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
  } catch (error: any) {
    console.error("Error in send-push Edge Function:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
