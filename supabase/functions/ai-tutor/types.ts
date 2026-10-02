export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ClientState {
  focus_mode?: string;
  pomodoro_state?: "idle" | "focus" | "break" | "unknown";
  minutes_remaining?: number | null;
}

export interface RequestBody {
  session_id: number;
  messages: Message[];
  client_state?: ClientState;
}

export interface ActionResponse {
  type: "study_plan" | "scheduled_session" | "flashcards" | "quiz";
  status: "success" | "error";
  summary: string;
  data: any;
}

export interface ApiResponse {
  reply?: string;
  actions?: ActionResponse[];
  error?: {
    code: string;
    message: string;
  };
}
