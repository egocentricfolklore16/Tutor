export const COLLABORATION_DESCRIPTIONS = {
  "Keep me focused": {
    badge: "Focus Partner Mode",
    description: "Because you chose 'Keep me focused', you'll get quiet study rooms with distraction-free accountability partners.",
  },
  "Find study groups": {
    badge: "Study Group Matchmaking",
    description: "Because you chose 'Find study groups', we'll match you into small groups by subject and target level.",
  },
  "Peer support": {
    badge: "Peer Support Network",
    description: "Because you chose 'Peer support', you'll be connected to Q&A forums and peer mentoring channels.",
  },
  "Just me for now": {
    badge: "Solo Study Mode",
    description: "Because you chose 'Just me for now', all social features will remain optional and private until you opt in.",
  },
};

export function getCollaborationInfo(interest) {
  if (interest && COLLABORATION_DESCRIPTIONS[interest]) {
    return COLLABORATION_DESCRIPTIONS[interest];
  }
  return {
    badge: "Personalized Community Experience",
    description: "Tailored social learning features will adapt to your collaboration preference when Phase 2 launches.",
  };
}
