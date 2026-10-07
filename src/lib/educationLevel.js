export const EDUCATION_LEVEL_INFO = {
  "High school": {
    badge: "High School",
    note: "Paced for foundational concepts, exam preparation, and guided homework support.",
  },
  "College / university": {
    badge: "College / University",
    note: "Structured for in-depth course concepts, academic rigor, and exam preparation.",
  },
  "Working professional": {
    badge: "Working Professional",
    note: "Optimized for bite-sized sessions, career skill advancement, and flexible learning schedules.",
  },
  "Independent learner": {
    badge: "Independent Learner",
    note: "Tailored for self-directed exploration, practical applications, and flexible goal tracking.",
  },
};

export function getEducationLevelInfo(level) {
  if (level && EDUCATION_LEVEL_INFO[level]) {
    return EDUCATION_LEVEL_INFO[level];
  }
  return {
    badge: "General Learner",
    note: "Balanced study guidance tailored to your learning goals and schedule.",
  };
}
