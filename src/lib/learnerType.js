export const LEARNER_TYPE_SUGGESTIONS = {
  "Academic achiever": {
    badge: "Academic Achiever",
    recommendation: "To maintain your top performance, challenge yourself with advanced practice questions and timed flashcard drills.",
  },
  "Struggling learner": {
    badge: "Guided Support",
    recommendation: "Take things step-by-step with smaller study intervals and frequent AI tutor check-ins to build confidence.",
  },
  "Lifelong learner": {
    badge: "Flexible Curiosity",
    recommendation: "Explore core concepts at your own comfortable pace with practical analogies and real-world application examples.",
  },
};

export function getLearnerTypeSuggestion(learnerType) {
  if (learnerType && LEARNER_TYPE_SUGGESTIONS[learnerType]) {
    return LEARNER_TYPE_SUGGESTIONS[learnerType];
  }
  return {
    badge: "Personalized Strategy",
    recommendation: "A balanced study routine with active recall and practice questions will help keep your progress steady.",
  };
}
