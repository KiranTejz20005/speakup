import { describe, expect, it } from "vitest";
import { createHeuristicFeedback } from "./feedback";

describe("createHeuristicFeedback", () => {
  it("returns all five required performance dimensions and identifies filler words", () => {
    const analysis = createHeuristicFeedback("Um, I think this is useful because, like, it helps students connect ideas.", 30);
    expect(Object.keys(analysis.scores)).toEqual(["Clarity", "Confidence", "Fluency", "Content", "Time Management"]);
    expect(analysis.fillerWords).toContain("um");
    expect(analysis.fillerWords).toContain("like");
    expect(analysis.suggestedStructure).toBe("Opening → Main Point → Example → Counterpoint → Conclusion");
  });

  it("keeps the overall score in the expected range", () => {
    const analysis = createHeuristicFeedback("I would open by defining the issue, offer an example, and close with a practical conclusion.", 45);
    expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    expect(analysis.overallScore).toBeLessThanOrEqual(100);
  });
});
