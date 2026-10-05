export function isPreferredStudyDay(dayInput, studyDays) {
  if (!dayInput || !Array.isArray(studyDays) || studyDays.length === 0) {
    return false;
  }
  const target = String(dayInput).trim().toLowerCase();
  return studyDays.some((day) => String(day).trim().toLowerCase() === target);
}

export function getStudyDaysSummary(studyDays) {
  if (!Array.isArray(studyDays) || studyDays.length === 0) {
    return "No target study days selected";
  }
  if (studyDays.length === 7) {
    return "Daily study schedule";
  }
  return `${studyDays.length} target study day${studyDays.length === 1 ? "" : "s"} (${studyDays.join(", ")})`;
}
