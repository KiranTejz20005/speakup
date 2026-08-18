export const DEFAULT_PREPARATION_SECONDS = 30;
export const preparationDurationOptions = [0, 15, 30, 45, 60] as const;
export const speakingDurationOptions = [30, 60, 90, 120] as const;

export type CaptureMode = "audio" | "video";

export function getCaptureUploadConfig(mode: CaptureMode, blobType: string) {
  if (mode === "video") return { contentType: "video/webm" as const, fileName: "jam-video-response.webm" };
  return {
    contentType: blobType.includes("ogg") ? "audio/ogg" as const : "audio/webm" as const,
    fileName: "jam-voice-response.webm",
  };
}

export function nextCountdownValue(value: number) {
  return Math.max(0, value - 1);
}

export function formatRemainingPlaybackTime(duration: number, currentTime: number) {
  const remaining = Math.max(0, duration - currentTime);
  return `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
}
