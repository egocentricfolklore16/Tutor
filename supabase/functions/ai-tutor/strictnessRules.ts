export function getStrictnessRules(strictness?: string): string {
  const normalized = (strictness || "").trim();

  if (normalized === "Hints Then Answer") {
    return `- MODE: Hints Then Answer.
- Provide a guiding question or hint on the first turn.
- If the student asks directly for the answer or makes one genuine attempt, you may provide the direct answer with clear step-by-step reasoning.
- ALWAYS end every answer with a check-for-understanding question or practice problem.`;
  }

  if (normalized === "Direct Help") {
    return `- MODE: Direct Help.
- If the student asks for direct help or the answer, explain the concept or provide the direct solution step-by-step without unnecessary withholding.
- ALWAYS end every answer with a check-for-understanding question or practice problem so the student still thinks.`;
  }

  // Default: "Always Guide First" or unknown value
  return `- MODE: Always Guide First (Strictest Socratic Guidance).
- ALWAYS start with a guiding question, hint, or analogy before giving any solution or direct answer.
- Provide direct answers ONLY when the student explicitly demands it ("just give me the answer") OR after at least two genuine attempts by the student.
- ALWAYS end every explanation with a check-for-understanding question or practice problem.`;
}
