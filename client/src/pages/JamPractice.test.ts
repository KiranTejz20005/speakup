import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/hooks/useAudioRecorder", () => ({ useAudioRecorder: () => ({ status: "idle", recordingUrl: null, recordingBlob: null, previewStream: null, levels: Array(28).fill(.1), error: null, start: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), reset: vi.fn() }) }));
vi.mock("@/components/SpeakUpShell", () => ({ SpeakUpShell: ({ children }: { children: React.ReactNode }) => createElement("div", null, children) }));
vi.mock("@/components/LiveWaveform", () => ({ LiveWaveform: () => createElement("div") }));
vi.mock("@/components/RecordingReview", () => ({ RecordingReview: () => createElement("div") }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => createElement("button", props, children) }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: { children: React.ReactNode; href: string }) => createElement("a", props, children) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    topics: { random: { useQuery: () => ({ data: { id: "topic", text: "Should AI replace teachers?", category: "Education", difficulty: "Medium", suitableDurations: [60], durationSeconds: 60 }, refetch: vi.fn() }) } },
    sessions: { create: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) }, complete: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
    recordings: { upload: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) }, transcribe: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
    feedback: { generate: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
  },
}));

import JamPractice from "./JamPractice";

describe("JAM practice capture controls", () => {
  it("renders the 30-second default preparation choice, adjustable timing choices, and camera mode", () => {
    const markup = renderToStaticMarkup(createElement(JamPractice));
    expect(markup).toContain("Preparation time");
    expect(markup).toContain("30 sec");
    expect(markup).toContain("Speaking time");
    expect(markup).toContain("120 sec");
    expect(markup).toContain("Camera + voice");
    expect(markup).toContain("Your camera stays off unless you choose Camera + voice");
  });
});
