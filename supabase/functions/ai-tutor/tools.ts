import { ActionResponse } from "./types.ts";
import {
  validateCreateFlashcards,
  validateCreateStudyPlan,
  validateGenerateQuiz,
  validateScheduleStudySession,
} from "./validators.ts";

export interface ToolContext {
  supabaseUserClient: any;
  userId: string;
  currentSession: any;
  userTimezone: string;
}

export async function executeTool(
  name: string,
  args: any,
  context: ToolContext
): Promise<{ toolResultText: string; action: ActionResponse }> {
  const { supabaseUserClient, userId, currentSession, userTimezone } = context;

  if (name === "create_study_plan") {
    const val = validateCreateStudyPlan(args);
    if (!val.valid) {
      return {
        toolResultText: `Error validating create_study_plan arguments: ${val.error}`,
        action: {
          type: "study_plan",
          status: "error",
          summary: `Failed to create study plan: ${val.error}`,
          data: { error: val.error },
        },
      };
    }

    const topic = args.topic.trim();
    // 1. Insert plan
    const { data: planData, error: planErr } = await supabaseUserClient
      .from("study_plans")
      .insert({
        user_id: userId,
        session_id: currentSession?.id || null,
        topic,
      })
      .select("id")
      .single();

    if (planErr || !planData) {
      return {
        toolResultText: `Database error creating study plan: ${planErr?.message || "Unknown error"}`,
        action: {
          type: "study_plan",
          status: "error",
          summary: "Failed to save study plan to database.",
          data: { error: planErr?.message },
        },
      };
    }

    // 2. Insert milestones
    const milestoneRows = args.milestones.map((m: any, idx: number) => ({
      plan_id: planData.id,
      user_id: userId,
      position: idx + 1,
      title: m.title.trim(),
      description: m.description.trim(),
      estimated_minutes: m.estimated_minutes,
      target_date: m.target_date || null,
      done: false,
    }));

    const { error: msErr } = await supabaseUserClient
      .from("study_plan_milestones")
      .insert(milestoneRows);

    if (msErr) {
      // Compensate: rollback plan row
      await supabaseUserClient.from("study_plans").delete().eq("id", planData.id);
      return {
        toolResultText: `Database error saving plan milestones: ${msErr.message}`,
        action: {
          type: "study_plan",
          status: "error",
          summary: "Failed to save plan milestones to database.",
          data: { error: msErr.message },
        },
      };
    }

    return {
      toolResultText: `Successfully created study plan '${topic}' with ${args.milestones.length} milestones.`,
      action: {
        type: "study_plan",
        status: "success",
        summary: `Created study plan: ${topic} (${args.milestones.length} milestones)`,
        data: {
          plan_id: planData.id,
          topic,
          milestones: args.milestones,
        },
      },
    };
  }

  if (name === "schedule_study_session") {
    const val = validateScheduleStudySession(args, userTimezone);
    if (!val.valid) {
      return {
        toolResultText: `Error validating schedule_study_session arguments: ${val.error}`,
        action: {
          type: "scheduled_session",
          status: "error",
          summary: `Failed to schedule session: ${val.error}`,
          data: { error: val.error },
        },
      };
    }

    const { date, time, duration, focus } = args;
    const sessionTopic = (args.topic || currentSession?.Topic || "Study Session").trim();
    const sessionSubject = (currentSession?.Subject || "General").trim();
    const reminderMinutes = typeof args.reminder_minutes === "number" ? args.reminder_minutes : 15;

    // Check overlap with user's non-completed sessions on that date
    const { data: existingSessions, error: fetchErr } = await supabaseUserClient
      .from("Study")
      .select("id, Subject, Topic, Start, Duration")
      .eq("user_id", userId)
      .eq("Date", date)
      .eq("completed", false);

    if (fetchErr) {
      return {
        toolResultText: `Database error checking existing schedule: ${fetchErr.message}`,
        action: {
          type: "scheduled_session",
          status: "error",
          summary: "Failed to verify schedule availability.",
          data: { error: fetchErr.message },
        },
      };
    }

    const parseTimeToMin = (tStr: string) => {
      const [h, m] = tStr.split(":").map(Number);
      return h * 60 + m;
    };

    const newStart = parseTimeToMin(time);
    const newEnd = newStart + duration;

    if (Array.isArray(existingSessions)) {
      for (const existing of existingSessions) {
        if (!existing.Start || !existing.Duration) continue;
        const eStart = parseTimeToMin(existing.Start.slice(0, 5));
        const eEnd = eStart + Number(existing.Duration) * 60;

        if (Math.max(newStart, eStart) < Math.min(newEnd, eEnd)) {
          const confName = existing.Topic || existing.Subject || "Existing session";
          return {
            toolResultText: `Schedule conflict: overlaps with '${confName}' (${existing.Start.slice(0, 5)} for ${Number(existing.Duration) * 60} min).`,
            action: {
              type: "scheduled_session",
              status: "error",
              summary: `Time conflict with '${confName}'`,
              data: { error: `Overlaps with '${confName}' on ${date}` },
            },
          };
        }
      }
    }

    // Insert into "Study"
    const { data: createdSession, error: insertErr } = await supabaseUserClient
      .from("Study")
      .insert({
        user_id: userId,
        Subject: sessionSubject,
        Topic: sessionTopic,
        Status: "important",
        Date: date,
        Start: time,
        Duration: duration / 60,
        reminder_minutes: reminderMinutes,
        activity_type: "study",
        recurring: "none",
        repeat: false,
        muted: false,
        completed: false,
        session_status: "active",
      })
      .select("id")
      .single();

    if (insertErr || !createdSession) {
      return {
        toolResultText: `Database error inserting study session: ${insertErr?.message || "Unknown error"}`,
        action: {
          type: "scheduled_session",
          status: "error",
          summary: "Failed to save study session.",
          data: { error: insertErr?.message },
        },
      };
    }

    return {
      toolResultText: `Successfully scheduled session '${sessionTopic}' for ${date} at ${time} (${duration} mins, focus: ${focus}).`,
      action: {
        type: "scheduled_session",
        status: "success",
        summary: `Scheduled: ${sessionTopic} on ${date} at ${time} (${duration} min)`,
        data: {
          session_id: createdSession.id,
          subject: sessionSubject,
          topic: sessionTopic,
          date,
          time,
          duration,
          focus,
        },
      },
    };
  }

  if (name === "create_flashcards") {
    const val = validateCreateFlashcards(args);
    if (!val.valid || !val.cleanPairs) {
      return {
        toolResultText: `Error validating create_flashcards arguments: ${val.error}`,
        action: {
          type: "flashcards",
          status: "error",
          summary: `Failed to create flashcards: ${val.error}`,
          data: { error: val.error },
        },
      };
    }

    const cardRows = val.cleanPairs.map((p) => ({
      user_id: userId,
      session_id: currentSession?.id || null,
      question: p.front,
      answer: p.back,
    }));

    const { error: insertErr } = await supabaseUserClient
      .from("flashcards")
      .insert(cardRows);

    if (insertErr) {
      return {
        toolResultText: `Database error inserting flashcards: ${insertErr.message}`,
        action: {
          type: "flashcards",
          status: "error",
          summary: "Failed to save flashcards to database.",
          data: { error: insertErr.message },
        },
      };
    }

    return {
      toolResultText: `Successfully created ${val.cleanPairs.length} flashcards for topic '${args.topic}'.`,
      action: {
        type: "flashcards",
        status: "success",
        summary: `Created ${val.cleanPairs.length} flashcards on "${args.topic}"`,
        data: {
          topic: args.topic,
          card_count: val.cleanPairs.length,
          pairs: val.cleanPairs,
        },
      },
    };
  }

  if (name === "generate_quiz") {
    const val = validateGenerateQuiz(args);
    if (!val.valid) {
      return {
        toolResultText: `Error validating generate_quiz arguments: ${val.error}`,
        action: {
          type: "quiz",
          status: "error",
          summary: `Failed to request quiz: ${val.error}`,
          data: { error: val.error },
        },
      };
    }

    return {
      toolResultText: "Quiz request accepted; opening Quizicle.",
      action: {
        type: "quiz",
        status: "success",
        summary: `Quiz ready on "${args.topic}" (${args.question_count} questions, ${args.difficulty})`,
        data: {
          topic: args.topic.trim(),
          question_count: args.question_count,
          difficulty: args.difficulty,
          focus_areas: args.focus_areas || [],
        },
      },
    };
  }

  return {
    toolResultText: `Unknown tool name: ${name}`,
    action: {
      type: "quiz",
      status: "error",
      summary: `Unknown tool name: ${name}`,
      data: { error: `Unknown tool name: ${name}` },
    },
  };
}
