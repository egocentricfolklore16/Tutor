export const ONBOARDING_SUBJECTS = [
  "Math",
  "Science",
  "Languages",
  "Computer science",
  "Business",
  "Arts",
  "Exam prep",
];

export const GENERAL_SUBJECTS = [
  "Math",
  "Mathematics",
  "Science",
  "English",
  "History",
  "Computer science",
  "Computer Science",
  "Languages",
  "Business",
  "Arts",
  "Exam prep",
];

export const SCHOOL_SUBJECTS = [
  "AP Biology",
  "AP Chemistry",
  "AP Physics",
  "AP Calculus",
  "Common Core Algebra II",
  "Geometry",
  "Statistics",
];

export function getSubjectOptions(studentLevel) {
  const level = typeof studentLevel === "string" ? studentLevel : "";
  const baseOptions = [...ONBOARDING_SUBJECTS, "English", "History"];
  if (level.includes("Grade") || level.toLowerCase().includes("high school")) {
    return Array.from(new Set([...baseOptions, ...SCHOOL_SUBJECTS]));
  }
  return Array.from(new Set(baseOptions));
}

export function getUserSubjectsFormatted(profile) {
  if (!profile || typeof profile !== "object") {
    return "your priority subjects";
  }

  let list = [];
  if (Array.isArray(profile.subjects) && profile.subjects.length > 0) {
    list = profile.subjects;
  } else if (typeof profile.settings_subject === "string" && profile.settings_subject.trim()) {
    list = [profile.settings_subject.trim()];
  } else if (typeof profile.subject === "string" && profile.subject.trim()) {
    list = [profile.subject.trim()];
  }

  const cleanList = list
    .filter((s) => s && typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());

  if (cleanList.length === 0) {
    return "your priority subjects";
  }

  return cleanList.join(", ");
}
