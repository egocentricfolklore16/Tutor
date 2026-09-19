export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "create_study_plan",
      description: "Create a structured study plan for the student. Only call after the student asks for or agrees to a plan.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic or goal the plan covers." },
          milestones: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            description: "Ordered milestones, prerequisites first.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string", description: "Concrete actions to take." },
                estimated_minutes: { type: "integer", minimum: 5 },
                target_date: { type: "string", description: "YYYY-MM-DD. Only if the student gave a deadline." }
              },
              required: ["title", "description", "estimated_minutes"]
            }
          }
        },
        required: ["topic", "milestones"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_study_session",
      description: "Schedule a study session. Only call once date, time and duration are all known and confirmed by the student.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD in the student's timezone. Must not be in the past." },
          time: { type: "string", description: "24-hour HH:MM in the student's timezone." },
          duration: { type: "integer", minimum: 5, maximum: 480, description: "Length in minutes." },
          focus: { type: "string", description: "Focus mode, for example 'Deep work'." },
          topic: { type: "string", description: "Optional. Topic of the session." },
          reminder_minutes: { type: "integer", minimum: 0, maximum: 1440, description: "Optional. Minutes before start to remind." }
        },
        required: ["date", "time", "duration", "focus"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_quiz",
      description: "Generate a practice quiz in Quizicle for the student. Only call after the student asks to be tested or agrees.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          question_count: { type: "integer", minimum: 1, maximum: 20 },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          focus_areas: { type: "array", items: { type: "string" }, description: "Optional. Sub-topics to emphasise." }
        },
        required: ["topic", "question_count", "difficulty"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_flashcards",
      description: "Create a flashcard set. Content must come from injected resource text or well-established facts.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          card_pairs: {
            type: "array",
            minItems: 3,
            maxItems: 30,
            items: {
              type: "object",
              properties: {
                front: { type: "string", description: "A question or cue." },
                back: { type: "string", description: "One or two sentences." }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["topic", "card_pairs"]
      }
    }
  }
];
