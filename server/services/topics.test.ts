import { describe, expect, it } from "vitest";
import { getRandomTopic, topicCatalogue } from "./topics";

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
});
