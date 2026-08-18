import { describe, expect, it } from "vitest";
import { getInterviewQuestion } from "./interview";

describe("interview question bank", () => {
  it("provides a broad rotating set of interviewer-style prompts for each core category", () => {
    (["HR", "Behavioral", "Technical", "Product", "Leadership", "Situational"] as const).forEach(category => {
      const first = getInterviewQuestion(category, 0);
      const tenth = getInterviewQuestion(category, 9);
      expect(first.total).toBeGreaterThanOrEqual(10);
      expect(first.question).not.toBe(tenth.question);
    });
  });
});
