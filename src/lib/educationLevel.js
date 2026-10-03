export const EDUCATION_LEVEL_DESCRIPTIONS = {
  "High school": {
    badge: "High School",
    guidance: "Curriculum-aligned pace with structured practice for exams and coursework.",
  },
  "College / university": {
    badge: "College / University",
    guidance: "In-depth concept mastery with analytical focus for higher education.",
  },
  "Working professional": {
    badge: "Professional",
    guidance: "Efficient, targeted sessions designed around real-world skill application.",
  },
  "Independent learner": {
    badge: "Independent Learner",
    guidance: "Self-directed exploration with flexible pacing across your subjects.",
  },
};

export function getEducationLevelInfo(level) {
  if (level && EDUCATION_LEVEL_DESCRIPTIONS[level]) {
    return EDUCATION_LEVEL_DESCRIPTIONS[level];
  }
  return {
    badge: "General Studies",
    guidance: "Adaptable study sessions tailored to your goals and schedule.",
  };
}
