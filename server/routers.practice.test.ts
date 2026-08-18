import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("topics.random procedure", () => {
  it("exposes the duration-aware catalogue through the public practice API", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const topic = await caller.topics.random({ category: "Society", difficulty: "Easy", durationSeconds: 30 });
    expect(topic.category).toBe("Society");
    expect(topic.difficulty).toBe("Easy");
    expect(topic.durationSeconds).toBe(30);
    expect(topic.suitableDurations).toContain(30);
  });

  it("allows a guest caller to load an interviewer-style prompt without authentication", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const prompt = await caller.interviews.question({ category: "Product", index: 0 });
    expect(prompt.question).toContain("user problem");
    expect(prompt.total).toBeGreaterThanOrEqual(10);
  });
});
