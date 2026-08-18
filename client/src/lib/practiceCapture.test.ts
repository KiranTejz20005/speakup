import { describe, expect, it } from "vitest";
import { DEFAULT_PREPARATION_SECONDS, formatRemainingPlaybackTime, getCaptureUploadConfig, nextCountdownValue, preparationDurationOptions, speakingDurationOptions } from "./practiceCapture";

describe("practice capture settings", () => {
  it("uses a 30-second preparation phase by default and exposes adjustable timing choices", () => {
    expect(DEFAULT_PREPARATION_SECONDS).toBe(30);
    expect(preparationDurationOptions).toContain(30);
    expect(speakingDurationOptions).toEqual([30, 60, 90, 120]);
  });

  it("uses a video WebM upload when camera mode is selected while preserving audio-only uploads", () => {
    expect(getCaptureUploadConfig("video", "video/webm;codecs=vp8,opus")).toEqual({ contentType: "video/webm", fileName: "jam-video-response.webm" });
    expect(getCaptureUploadConfig("audio", "audio/ogg;codecs=opus")).toEqual({ contentType: "audio/ogg", fileName: "jam-voice-response.webm" });
  });

  it("progresses a countdown without going negative and produces a seek-safe remaining video time label", () => {
    expect(nextCountdownValue(60)).toBe(59);
    expect(nextCountdownValue(1)).toBe(0);
    expect(nextCountdownValue(0)).toBe(0);
    expect(formatRemainingPlaybackTime(61.8, 15.2)).toBe("0:46");
    expect(formatRemainingPlaybackTime(61.8, 61.8)).toBe("0:00");
    expect(formatRemainingPlaybackTime(61.8, 80)).toBe("0:00");
  });
});
