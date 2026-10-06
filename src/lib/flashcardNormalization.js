const FLASHCARD_KEY_ALIASES = [
  "question",
  "answer",
  "front",
  "back",
  "prompt",
  "response",
  "text",
  "value",
  "content",
];

const stripLeadingKey = (text) => {
  if (!text || typeof text !== "string") return text;

  return text
    .replace(/^\s*\{\s*/, "")
    .replace(/^\s*["']?(?:question|answer|front|back|prompt|response|text|value|content)["']?\s*:\s*/i, "")
    .trim();
};

export function normalizeFlashcardValue(value, fallbackKey = "question") {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    const combined = value
      .map((entry) => normalizeFlashcardValue(entry, fallbackKey))
      .filter(Boolean)
      .join(", ");
    return combined;
  }

  if (typeof value === "object") {
    const directValue = value[fallbackKey] ?? value[fallbackKey === "question" ? "front" : "back"] ?? value.question ?? value.answer ?? value.front ?? value.back ?? value.prompt ?? value.response ?? value.text ?? value.value ?? value.content;

    if (directValue !== undefined && directValue !== null) {
      return normalizeFlashcardValue(directValue, fallbackKey);
    }

    for (const key of FLASHCARD_KEY_ALIASES) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const normalized = normalizeFlashcardValue(value[key], key);
        if (normalized) return normalized;
      }
    }

    const firstEntry = Object.values(value).find((entry) => entry !== null && entry !== undefined);
    if (firstEntry !== undefined) return normalizeFlashcardValue(firstEntry, fallbackKey);

    return "";
  }

  let text = typeof value === "string" ? value.trim() : String(value).trim();
  if (!text) return "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = JSON.parse(text);

      if (typeof parsed === "string") {
        text = parsed.trim();
        continue;
      }

      if (parsed && typeof parsed === "object") {
        const objectValue = parsed[fallbackKey] ?? parsed[fallbackKey === "question" ? "front" : "back"] ?? parsed.question ?? parsed.answer ?? parsed.front ?? parsed.back ?? parsed.prompt ?? parsed.response ?? parsed.text ?? parsed.value ?? parsed.content;
        if (objectValue !== undefined && objectValue !== null) {
          return normalizeFlashcardValue(objectValue, fallbackKey);
        }
      }
    } catch {
      // Fall through to string cleanup below.
    }

    break;
  }

  text = stripLeadingKey(text);
  text = text.replace(/^\s*[\[{]/, "").replace(/[\]}]\s*$/, "").trim();
  text = text.replace(/\r/g, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
  text = text.replace(/,\s*$/, "").trim();

  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    text = text.slice(1, -1).trim();
  }

  text = stripLeadingKey(text);
  text = text.replace(/\s*[:;]\s*$/, "").trim();

  return text;
}

export function normalizeFlashcard(card = {}) {
  if (!card || typeof card !== "object") {
    return { question: "", answer: "" };
  }

  return {
    ...card,
    question: normalizeFlashcardValue(card.question ?? card.front ?? card.prompt ?? "", "question"),
    answer: normalizeFlashcardValue(card.answer ?? card.back ?? card.response ?? card.content ?? "", "answer"),
  };
}
