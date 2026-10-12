import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration env variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch pending unsent planner_reminders where remind_at <= NOW()
    const { data: pendingReminders, error: fetchError } = await supabase
      .from("planner_reminders")
      .select(`
        id,
        user_id,
        activity_id,
        occurrence_start_at,
        remind_at,
        planner_activities (
          title,
          type,
          start_at
        )
      `)
      .is("sent_at", null)
      .lte("remind_at", new Date().toISOString())
      .limit(100);

    if (fetchError) {
      console.error("Error fetching pending planner reminders:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending reminders due." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;

    for (const reminder of pendingReminders) {
      const activity = reminder.planner_activities;
      const title = activity?.title ? `Reminder: ${activity.title}` : "Planner Reminder";
      const startTimeFormatted = new Date(reminder.occurrence_start_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const body = `Your activity starts at ${startTimeFormatted}.`;

      // 2. Insert into in_app_notifications
      const { error: notifError } = await supabase
        .from("in_app_notifications")
        .insert({
          user_id: reminder.user_id,
          title,
          body,
          type: "study_reminder",
          category: "planner",
          metadata: {
            activity_id: reminder.activity_id,
            occurrence_start_at: reminder.occurrence_start_at,
          },
        });

      if (notifError) {
        console.error(`Failed to insert in_app_notification for reminder ${reminder.id}:`, notifError);
      }

      // 3. Mark reminder as sent
      const { error: updateError } = await supabase
        .from("planner_reminders")
        .update({ sent_at: new Date().toISOString(), status: "sent" })
        .eq("id", reminder.id);

      if (updateError) {
        console.error(`Failed to update planner_reminder ${reminder.id}:`, updateError);
      } else {
        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({ processed: processedCount, total: pendingReminders.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in planner-reminders function:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
