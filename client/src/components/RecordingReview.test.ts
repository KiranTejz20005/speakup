import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { RecordingReview } from "./RecordingReview";

describe("RecordingReview video mode", () => {
  it("renders video playback and body-language review guidance for a saved video session", () => {
    const markup = renderToStaticMarkup(createElement(RecordingReview, {
      recordingUrl: "/manus-storage/session-video.webm",
      recordingKind: "video",
      analysis: null,
      transcript: "This is the saved transcript.",
      isWorking: false,
      onAnalyze: () => undefined,
      onTryAgain: () => undefined,
    }));
    expect(markup).toContain("<video");
    expect(markup).toContain("Body-language review cues");
    expect(markup).toContain("Playback speed");
    expect(markup).toContain("Loading timer…");
  });
});
