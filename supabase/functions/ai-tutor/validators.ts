export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") return "";
  // Strip control characters except newline and tab
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Strip double braces {{ or }}
  clean = clean.replace(/\{\{|\}\}/g, "");
  // Limit length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean.trim();
}

export function wrapStudentData(input: string): string {
  const escaped = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<student_data>${escaped}</student_data>`;
}

export function validateRequestBody(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  if (typeof body.session_id !== "number") {
    return { valid: false, error: "session_id must be a number" };
  }
  if (!Array.isArray(body.messages)) {
    return { valid: false, error: "messages must be an array" };
  }
  if (body.messages.length > 20) {
    return { valid: false, error: "messages array exceeds maximum allowed length of 20" };
  }
  for (const msg of body.messages) {
    if (!msg || typeof msg !== "object") {
      return { valid: false, error: "Each message must be an object" };
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      return { valid: false, error: "Message role must be 'user' or 'assistant'" };
    }
    if (typeof msg.content !== "string") {
      return { valid: false, error: "Message content must be a string" };
    }
    if (msg.content.length > 4000) {
      return { valid: false, error: "Message content exceeds maximum allowed length of 4000 characters" };
    }
  }
  return { valid: true };
}

export function validateCreateStudyPlan(args: any): { valid: boolean; error?: string } {
  if (!args || typeof args !== "object") {
    return { valid: false, error: "Arguments must be an object" };
  }
  const topic = sanitizeString(args.topic, 120);
  if (!topic) {
    return { valid: false, error: "topic is required (1-120 characters)" };
  }
  if (!Array.isArray(args.milestones) || args.milestones.length === 0 || args.milestones.length > 12) {
    return { valid: false, error: "milestones must be an array of 1 to 12 items" };
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < args.milestones.length; i++) {
    const m = args.milestones[i];
    if (!m || typeof m !== "object") {
      return { valid: false, error: `Milestone at index ${i} must be an object` };
    }
    const title = sanitizeString(m.title, 120);
    if (!title) {
      return { valid: false, error: `Milestone ${i + 1} title is required (max 120 characters)` };
    }
    const description = sanitizeString(m.description, 500);
    if (!description) {
      return { valid: false, error: `Milestone ${i + 1} description is required (max 500 characters)` };
    }
    if (typeof m.estimated_minutes !== "number" || !Number.isInteger(m.estimated_minutes) || m.estimated_minutes < 5 || m.estimated_minutes > 600) {
      return { valid: false, error: `Milestone ${i + 1} estimated_minutes must be an integer between 5 and 600` };
    }
    if (m.target_date !== undefined && m.target_date !== null && m.target_date !== "") {
      if (typeof m.target_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.target_date)) {
        return { valid: false, error: `Milestone ${i + 1} target_date must be in YYYY-MM-DD format` };
      }
      if (m.target_date < todayStr) {
        return { valid: false, error: `Milestone ${i + 1} target_date cannot be in the past` };
      }
    }
  }
  return { valid: true };
}

export function validateScheduleStudySession(args: any, userTimezone: string = "UTC"): { valid: boolean; error?: string } {
  if (!args || typeof args !== "object") {
    return { valid: false, error: "Arguments must be an object" };
  }
  if (typeof args.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    return { valid: false, error: "date must be in YYYY-MM-DD format" };
  }
  if (typeof args.time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(args.time)) {
    return { valid: false, error: "time must be in 24-hour HH:MM format (e.g., 18:00)" };
  }
  if (typeof args.duration !== "number" || !Number.isInteger(args.duration) || args.duration < 5 || args.duration > 480) {
    return { valid: false, error: "duration must be an integer between 5 and 480 minutes" };
  }
  if (typeof args.focus !== "string" || !args.focus.trim()) {
    return { valid: false, error: "focus mode is required" };
  }

  // Validate date/time in past evaluated in student's timezone
  try {
    const [year, month, day] = args.date.split("-").map(Number);
    const [hour, minute] = args.time.split(":").map(Number);

    // Get current time formatted in userTimezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") partMap[p.type] = p.value;
    }

    const curYear = Number(partMap.year);
    const curMonth = Number(partMap.month);
    const curDay = Number(partMap.day);
    const curHour = Number(partMap.hour === "24" ? 0 : partMap.hour);
    const curMinute = Number(partMap.minute);

    const scheduledComp = year * 100000000 + month * 1000000 + day * 10000 + hour * 100 + minute;
    const currentComp = curYear * 100000000 + curMonth * 1000000 + curDay * 10000 + curHour * 100 + curMinute;

    if (scheduledComp < currentComp) {
      return { valid: false, error: `Cannot schedule a session in the past. Current date/time in ${userTimezone} is ${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}` };
    }
  } catch (tzError) {
    // If timezone parsing fails, check against UTC as fallback
    const nowIso = new Date().toISOString();
    const schedIso = `${args.date}T${args.time}:00Z`;
    if (schedIso < nowIso) {
      return { valid: false, error: "Cannot schedule a session in the past" };
    }
  }

  if (args.reminder_minutes !== undefined && args.reminder_minutes !== null) {
    if (typeof args.reminder_minutes !== "number" || !Number.isInteger(args.reminder_minutes) || args.reminder_minutes < 0 || args.reminder_minutes > 1440) {
      return { valid: false, error: "reminder_minutes must be an integer between 0 and 1440" };
    }
  }

  return { valid: true };
}

export function validateCreateFlashcards(args: any): { valid: boolean; error?: string; cleanPairs?: { front: string; back: string }[] } {
  if (!args || typeof args !== "object") {
    return { valid: false, error: "Arguments must be an object" };
  }
  const topic = sanitizeString(args.topic, 120);
  if (!topic) {
    return { valid: false, error: "topic is required" };
  }
  if (!Array.isArray(args.card_pairs)) {
    return { valid: false, error: "card_pairs must be an array" };
  }

  const cleanPairs: { front: string; back: string }[] = [];
  const seenFronts = new Set<string>();

  for (let i = 0; i < args.card_pairs.length; i++) {
    const pair = args.card_pairs[i];
    if (!pair || typeof pair !== "object") continue;
    const front = sanitizeString(pair.front, 300);
    const back = sanitizeString(pair.back, 600);
    if (!front || !back) continue;
    const frontLower = front.toLowerCase();
    if (seenFronts.has(frontLower)) continue;
    seenFronts.add(frontLower);
    cleanPairs.push({ front, back });
  }

  if (cleanPairs.length < 3 || cleanPairs.length > 30) {
    return { valid: false, error: `card_pairs must contain between 3 and 30 valid non-duplicate front/back pairs (got ${cleanPairs.length})` };
  }

  return { valid: true, cleanPairs };
}

export function validateGenerateQuiz(args: any): { valid: boolean; error?: string } {
  if (!args || typeof args !== "object") {
    return { valid: false, error: "Arguments must be an object" };
  }
  const topic = sanitizeString(args.topic, 120);
  if (!topic) {
    return { valid: false, error: "topic is required" };
  }
  if (typeof args.question_count !== "number" || !Number.isInteger(args.question_count) || args.question_count < 1 || args.question_count > 20) {
    return { valid: false, error: "question_count must be an integer between 1 and 20" };
  }
  if (args.difficulty !== "easy" && args.difficulty !== "medium" && args.difficulty !== "hard") {
    return { valid: false, error: "difficulty must be 'easy', 'medium', or 'hard'" };
  }
  return { valid: true };
}
