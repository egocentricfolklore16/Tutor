import { createClient } from "npm:@supabase/supabase-js@^2.43.0";
import webpush from "npm:web-push@^3.6.7";

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

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Configure VAPID details
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@hypertutor.app";

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  const { data: subs, error: subsError } = await adminClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (subsError || !subs || subs.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        sent: 0,
        message: "No push subscription found for this device/user. Please enable notifications first.",
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  const testPayload = {
    title: "Test Notification",
    body: "Notifications are working! You'll receive study reminders and streak alerts.",
    url: "/Settings",
    tag: "test-notification-" + Date.now(),
  };

  let sent = 0;
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
        JSON.stringify(testPayload),
        { TTL: 60, urgency: "high" }
      );
      sent++;
    } catch (err: any) {
      console.error(`Test push failed for user ${user.id}:`, err?.message || err);
    }
  }

  return new Response(
    JSON.stringify({
      success: sent > 0,
      sent,
      message: sent > 0 ? "Test notification sent successfully!" : "Failed to deliver test notification.",
    }),
    { status: 200, headers: corsHeaders }
  );
  } catch (error: any) {
    console.error("Error in send-test-notification Edge Function:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
