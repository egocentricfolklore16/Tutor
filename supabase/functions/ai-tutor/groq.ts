import { Message } from "./types.ts";
import { TOOL_SCHEMAS } from "./toolSchemas.ts";

export interface GroqOptions {
  apiKey: string;
  model: string;
  messages: Message[];
  toolChoice?: "auto" | "none";
}

export async function callGroq(options: GroqOptions): Promise<any> {
  const { apiKey, model, messages, toolChoice = "auto" } = options;

  const requestPayload: any = {
    model,
    messages,
    temperature: 0.4,
    max_tokens: 1024,
    stream: false,
  };

  if (toolChoice !== "none") {
    requestPayload.tools = TOOL_SCHEMAS;
    requestPayload.tool_choice = "auto";
    requestPayload.parallel_tool_calls = false;
  } else {
    requestPayload.tool_choice = "none";
  }

  const makeAttempt = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;
  try {
    response = await makeAttempt();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw { status: 502, message: "The AI tutor request timed out. Please try asking again." };
    }
    throw { status: 502, message: "Network error communicating with AI tutor service. Please retry." };
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw { status: 500, message: "AI service misconfigured" };
    }
    if (response.status === 429) {
      throw { status: 503, message: "The AI tutor is busy right now. Please try again shortly." };
    }
    if (response.status >= 500) {
      // Retry once on 5xx
      try {
        response = await makeAttempt();
      } catch (retryErr) {
        throw { status: 502, message: "The AI tutor service experienced a temporary error. Please try again." };
      }
      if (!response.ok) {
        throw { status: 502, message: "The AI tutor service experienced a temporary error. Please try again." };
      }
    } else {
      throw { status: 502, message: `AI tutor service error (${response.status})` };
    }
  }

  const data = await response.json();
  return data;
}
