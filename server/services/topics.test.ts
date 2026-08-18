import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { getCurrentTrendTopic, getRandomTopic, resetTrendCacheForTests, topicCatalogue } from "./topics";

describe("getRandomTopic", () => {
  it("returns a topic that satisfies category, difficulty, and duration suitability", () => {
    const topic = getRandomTopic("Technology", "Hard", 90);
    expect(topic.category).toBe("Technology");
    expect(topic.difficulty).toBe("Hard");
    expect(topic.suitableDurations).toContain(90);
    expect(topic.durationSeconds).toBe(90);
  });

  it("keeps every catalogue topic eligible only for declared duration choices", () => {
    expect(topicCatalogue.every(topic => topic.suitableDurations.length > 0)).toBe(true);
    expect(topicCatalogue.every(topic => topic.suitableDurations.every(duration => [30, 60, 90].includes(duration)))).toBe(true);
  });

  it("provides a substantially diverse curated catalogue across every practice category", () => {
    expect(topicCatalogue.length).toBeGreaterThanOrEqual(40);
    expect(new Set(topicCatalogue.map(topic => topic.category))).toEqual(new Set(["Education", "Technology", "Society", "Career", "Current Affairs", "Culture", "Sustainability", "Abstract", "Business"]));
    expect(topicCatalogue.every(topic => topic.source === "curated" && topic.sourceLabel)).toBe(true);
  });

  it("converts a safe live headline into a labelled current-trend prompt", async () => {
    resetTrendCacheForTests();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "<rss><channel><item><title>New technology programme supports small business innovation</title><pubDate>Tue, 18 Aug 2026 10:00:00 GMT</pubDate></item></channel></rss>" }));
    const topic = await getCurrentTrendTopic(60);
    expect(topic.source).toBe("current");
    expect(topic.sourceLabel).toContain("Current trend");
    expect(topic.text).toContain("What opportunity, risk, or trade-off");
    expect(topic.durationSeconds).toBe(60);
  });

  it("uses a labelled curated fallback when the live trend feed cannot be reached", async () => {
    resetTrendCacheForTests();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const topic = await getCurrentTrendTopic(60);
    expect(topic.sourceLabel).toContain("fallback");
    expect(topic.source).toBe("curated");
  });
});
