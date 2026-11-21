export type OwlEyeConfig =
  | "baked"
  | {
      leftEye: { cx: number; cy: number; r: number; maxTravel: number };
      rightEye: { cx: number; cy: number; r: number; maxTravel: number };
    };

export type OwlPose = {
  id: string;
  src: string;
  webp: string;
  pngFallback: string;
  width: number;
  height: number;
  tags: string[];
  eyes: OwlEyeConfig;
  visibleBestFraction: number;
};

export const OWL_POSES: Record<string, OwlPose> = {
  "reading-book": {
    id: "reading-book", src: "/owl/logo2.webp", webp: "/owl/logo2.webp", pngFallback: "/logo2.png",
    width: 381, height: 355, tags: ["reading", "encouraging"], visibleBestFraction: 0.55,
    eyes: { leftEye: { cx: 36.5, cy: 36, r: 7.5, maxTravel: 18 }, rightEye: { cx: 58.5, cy: 36, r: 7.5, maxTravel: 18 } },
  },
  pointing: {
    id: "pointing", src: "/owl/logo3.webp", webp: "/owl/logo3.webp", pngFallback: "/logo3.png",
    width: 409, height: 352, tags: ["pointing", "encouraging"], visibleBestFraction: 0.58,
    eyes: { leftEye: { cx: 39, cy: 34, r: 8, maxTravel: 18 }, rightEye: { cx: 55, cy: 34, r: 8, maxTravel: 18 } },
  },
  thoughtful: {
    id: "thoughtful", src: "/owl/logo4-removebg-preview.webp", webp: "/owl/logo4-removebg-preview.webp", pngFallback: "/logo4-removebg-preview.png",
    width: 542, height: 460, tags: ["thinking", "sad", "encouraging"], visibleBestFraction: 0.48,
    eyes: "baked",
  },
  thinking: {
    id: "thinking", src: "/owl/logo5-removebg-preview.webp", webp: "/owl/logo5-removebg-preview.webp", pngFallback: "/logo5-removebg-preview.png",
    width: 544, height: 458, tags: ["thinking", "encouraging"], visibleBestFraction: 0.52,
    eyes: { leftEye: { cx: 41, cy: 36, r: 8, maxTravel: 16 }, rightEye: { cx: 57, cy: 36, r: 8, maxTravel: 16 } },
  },
  annoyed: {
    id: "annoyed", src: "/owl/logo6-removebg-preview.webp", webp: "/owl/logo6-removebg-preview.webp", pngFallback: "/logo6-removebg-preview.png",
    width: 546, height: 457, tags: ["encouraging", "focus"], visibleBestFraction: 0.52,
    eyes: "baked",
  },
  reading: {
    id: "reading", src: "/owl/logo7-removebg-preview.webp", webp: "/owl/logo7-removebg-preview.webp", pngFallback: "/logo7-removebg-preview.png",
    width: 542, height: 461, tags: ["reading", "thinking"], visibleBestFraction: 0.58,
    eyes: "baked",
  },
  happy: {
    id: "happy", src: "/owl/logo8-removebg-preview.webp", webp: "/owl/logo8-removebg-preview.webp", pngFallback: "/logo8-removebg-preview.png",
    width: 546, height: 457, tags: ["happy", "celebrating"], visibleBestFraction: 0.6,
    eyes: { leftEye: { cx: 32, cy: 31, r: 8, maxTravel: 18 }, rightEye: { cx: 61, cy: 31, r: 8, maxTravel: 18 } },
  },
};

export function getOwlPose(id: string): OwlPose {
  return OWL_POSES[id] || OWL_POSES.thinking;
}
