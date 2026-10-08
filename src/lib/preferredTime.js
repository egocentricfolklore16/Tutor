export const PREFERRED_TIME_NOTES = {
  Morning: "Morning focus window active—tackle your hardest concepts early.",
  Afternoon: "Afternoon energy peak active—plan structured mid-day study blocks.",
  Evening: "Evening study rhythm active—wrap up your day with quiet review sessions.",
  Flexible: "Flexible study rhythm active—keep momentum with steady study check-ins.",
};

export function getPreferredTimeNote(preferredTime) {
  if (preferredTime && PREFERRED_TIME_NOTES[preferredTime]) {
    return PREFERRED_TIME_NOTES[preferredTime];
  }
  return "Schedule sessions when your energy is highest to stay consistent.";
}
