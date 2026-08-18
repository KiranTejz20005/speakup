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
});
