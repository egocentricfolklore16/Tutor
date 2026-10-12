import { createClient } from "npm:@supabase/supabase-js@^2.43.0";

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
      return new Response(
        JSON.stringify({ success: false, message: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
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

    let requestBody: { userId?: string; payload?: any } = {};
    try {
      requestBody = await req.json();
    } catch (_err) {
      // Empty body
    }

    if (requestBody.userId && requestBody.userId !== user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Forbidden: Cannot send test notification to another user",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs, error: subsError } = await adminClient
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id);

    if (subsError || !subs || subs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No push subscriptions found for your account. Please enable push notifications first.",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Invoke send-push function
    const sendPushUrl = `${supabaseUrl}/functions/v1/send-push`;
    const pushRes = await fetch(sendPushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        userId: user.id,
        payload: {
          title: requestBody.payload?.title || "Hyper Tutor Test",
          body: requestBody.payload?.body || "This is a test push notification from Hyper Tutor!",
          url: requestBody.payload?.url || "/community/chat",
          tag: "test-notification",
        },
      }),
    });

    const pushResult = await pushRes.json();

    return new Response(JSON.stringify(pushResult), {
      status: pushRes.status,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error("Error in send-test-notification Edge Function:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
