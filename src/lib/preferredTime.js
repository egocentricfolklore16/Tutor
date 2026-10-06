/**
 * Maps onboarding preferred study time to human-readable recommendation notes.
 * @param {string|null|undefined} preferredTime
 * @returns {string}
 */
export function getPreferredTimeNote(preferredTime) {
  switch (preferredTime) {
    case "Morning":
      return "Since you focus best in the morning, schedule your key practice sessions early.";
    case "Afternoon":
      return "Since you focus best in the afternoon, plan your deep work after midday.";
    case "Evening":
      return "Since you focus best in the evening, save your main study sessions for tonight.";
    case "Flexible":
      return "With a flexible focus window, pick a consistent time block that fits your day.";
    default:
      return "Schedule your practice sessions when your energy and focus are highest.";
  }
}
