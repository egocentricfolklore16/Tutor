export type OwlEyePixels = {
  x: number;
  y: number;
  r: number;
};

export type OwlPoseConfig = {
  id: string;
  webp: string;
  pngFallback: string;
  naturalWidth: number;
  naturalHeight: number;
  tags: string[];
  visibleBestFraction: number;
  eyes: "baked" | {
    leftEye: OwlEyePixels;
    rightEye: OwlEyePixels;
  };
};

export const POSE_CONFIG: Record<string, OwlPoseConfig> = {
  "reading-book": {
    id: "reading-book", webp: "/owl/logo2.webp", pngFallback: "/logo2.png",
    naturalWidth: 381, naturalHeight: 355, tags: ["reading", "encouraging"], visibleBestFraction: 0.55,
    eyes: "baked",
  },
  pointing: {
    id: "pointing", webp: "/owl/logo3.webp", pngFallback: "/logo3.png",
    naturalWidth: 409, naturalHeight: 352, tags: ["pointing", "encouraging"], visibleBestFraction: 0.58,
    eyes: "baked",
  },
  thoughtful: {
    id: "thoughtful", webp: "/owl/logo4-removebg-preview.webp", pngFallback: "/logo4-removebg-preview.png",
    naturalWidth: 542, naturalHeight: 460, tags: ["thinking", "sad", "encouraging"], visibleBestFraction: 0.48,
    eyes: "baked",
  },
  thinking: {
    id: "thinking", webp: "/owl/logo5-removebg-preview.webp", pngFallback: "/logo5-removebg-preview.png",
    naturalWidth: 544, naturalHeight: 458, tags: ["thinking", "encouraging"], visibleBestFraction: 0.52,
    eyes: {
      leftEye: { x: 212, y: 147, r: 32 },
      rightEye: { x: 303, y: 122, r: 27 },
    },
  },
  annoyed: {
    id: "annoyed", webp: "/owl/logo6-removebg-preview.webp", pngFallback: "/logo6-removebg-preview.png",
    naturalWidth: 546, naturalHeight: 457, tags: ["encouraging", "focus"], visibleBestFraction: 0.52,
    eyes: "baked",
  },
  reading: {
    id: "reading", webp: "/owl/logo7-removebg-preview.webp", pngFallback: "/logo7-removebg-preview.png",
    naturalWidth: 542, naturalHeight: 461, tags: ["reading", "thinking"], visibleBestFraction: 0.58,
    eyes: "baked",
  },
  "wings-up": {
    id: "wings-up", webp: "/owl/logo8-removebg-preview.webp", pngFallback: "/logo8-removebg-preview.png",
    naturalWidth: 546, naturalHeight: 457, tags: ["happy", "celebrating"], visibleBestFraction: 0.6,
    eyes: {
      leftEye: { x: 242, y: 150, r: 31 },
      rightEye: { x: 332, y: 147, r: 28 },
    },
  },
  happy: {
    id: "happy", webp: "/owl/logo8-removebg-preview.webp", pngFallback: "/logo8-removebg-preview.png",
    naturalWidth: 546, naturalHeight: 457, tags: ["happy", "celebrating"], visibleBestFraction: 0.6,
    eyes: {
      leftEye: { x: 242, y: 150, r: 31 },
      rightEye: { x: 332, y: 147, r: 28 },
    },
  },
};

export const OWL_POSES = POSE_CONFIG;

export function getOwlPose(id: string): OwlPoseConfig {
  return POSE_CONFIG[id] || POSE_CONFIG.thinking;
}
