import { createClient } from "npm:@supabase/supabase-js@^2.43.0";
import webpush from "npm:web-push@^3.6.7";

// Constant time string comparison to prevent timing attacks
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req: Request) => {
  // 1. Verify cron secret header
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";

  if (!cronSecret || !timingSafeEqualStr(cronSecret, headerSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Configure VAPID details for web-push
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@hypertutor.app";

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  // 2. Claim due notifications
  const { data: claimedRows, error: claimError } = await supabase.rpc("claim_due_notifications");
  if (claimError) {
    console.error("claim_due_notifications error:", claimError);
    return new Response(JSON.stringify({ error: claimError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const claimedCount = claimedRows?.length || 0;
  let sentCount = 0;
  let failedCount = 0;
  let noSubCount = 0;
  let removedSubCount = 0;

  if (!claimedRows || claimedRows.length === 0) {
    return new Response(
      JSON.stringify({
        claimed: 0,
        sent: 0,
        failed: 0,
        no_subscription: 0,
        removed_subscriptions: 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Bounded concurrency processor (10 at a time)
  const concurrencyLimit = 10;
  for (let i = 0; i < claimedRows.length; i += concurrencyLimit) {
    const chunk = claimedRows.slice(i, i + concurrencyLimit);

    await Promise.allSettled(
      chunk.map(async (claimed) => {
        const userId = claimed.user_id;
        const kind = claimed.kind;
        const payload = claimed.payload;

        // Fetch subscriptions for user
        const { data: subs, error: subsError } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, failure_count")
          .eq("user_id", userId);

        if (subsError || !subs || subs.length === 0) {
          noSubCount++;
          await supabase
            .from("notification_log")
            .update({ status: "no_subscription" })
            .eq("id", claimed.id);
          return;
        }

        const ttl = kind === "session_reminder" ? 600 : 3600;
        const urgency = kind === "session_reminder" ? "high" : "normal";

        let userSuccessCount = 0;

        for (const sub of subs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
              TTL: ttl,
              urgency: urgency as any,
            });

            userSuccessCount++;
            // Reset failure count & update last_seen_at
            await supabase
              .from("push_subscriptions")
              .update({ failure_count: 0, last_seen_at: new Date().toISOString() })
              .eq("id", sub.id);
          } catch (pushErr: any) {
            const statusCode = pushErr?.statusCode || pushErr?.status || 0;
            console.error(`Push failed for user ${userId}, HTTP status: ${statusCode}`);

            if (statusCode === 404 || statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              removedSubCount++;
            } else {
              const nextFailureCount = (sub.failure_count || 0) + 1;
              if (nextFailureCount >= 5) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                removedSubCount++;
              } else {
                await supabase
                  .from("push_subscriptions")
                  .update({ failure_count: nextFailureCount })
                  .eq("id", sub.id);
              }
            }
          }
        }

        if (userSuccessCount > 0) {
          sentCount++;
          await supabase
            .from("notification_log")
            .update({ status: "sent" })
            .eq("id", claimed.id);
        } else {
          failedCount++;
          await supabase
            .from("notification_log")
            .update({ status: "failed" })
            .eq("id", claimed.id);
        }
      })
    );
  }

  return new Response(
    JSON.stringify({
      claimed: claimedCount,
      sent: sentCount,
      failed: failedCount,
      no_subscription: noSubCount,
      removed_subscriptions: removedSubCount,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
