export const EDUCATION_LEVEL_SUGGESTIONS = {
  "High school": {
    label: "High School Student",
    badge: "High School",
    contextNote: "tailored for high school coursework and exam prep",
  },
  "College / university": {
    label: "College Student",
    badge: "College / University",
    contextNote: "focused on higher education and deep subject mastery",
  },
  "Working professional": {
    label: "Working Professional",
    badge: "Professional",
    contextNote: "structured for flexible career advancement and skill building",
  },
  "Independent learner": {
    label: "Independent Learner",
    badge: "Independent",
    contextNote: "paced for self-directed study and active exploration",
  },
};

export function getEducationLevelSuggestion(educationLevel) {
  if (!educationLevel || typeof educationLevel !== "string" || !educationLevel.trim()) {
    return {
      label: "Learner",
      badge: "Learner",
      contextNote: "tailored for your academic goals",
    };
  }

  const trimmed = educationLevel.trim();

  for (const [key, value] of Object.entries(EDUCATION_LEVEL_SUGGESTIONS)) {
    if (key.toLowerCase() === trimmed.toLowerCase()) {
      return value;
    }
  }

  if (/grade|high school|k-12/i.test(trimmed)) {
    return EDUCATION_LEVEL_SUGGESTIONS["High school"];
  }
  if (/college|university|undergrad|postgrad/i.test(trimmed)) {
    return EDUCATION_LEVEL_SUGGESTIONS["College / university"];
  }
  if (/professional|career|working/i.test(trimmed)) {
    return EDUCATION_LEVEL_SUGGESTIONS["Working professional"];
  }
  if (/independent|self/i.test(trimmed)) {
    return EDUCATION_LEVEL_SUGGESTIONS["Independent learner"];
  }

  return {
    label: trimmed,
    badge: trimmed,
    contextNote: "tailored for your academic goals",
  };
}
