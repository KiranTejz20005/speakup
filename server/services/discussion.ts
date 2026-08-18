import { invokeLLM } from "../_core/llm";
import type { GDPersonality } from "@shared/practice";

const personalityInstructions: Record<GDPersonality, string> = {
  Logical: "Build a calm argument from cause and effect.",
  Aggressive: "Challenge weak assumptions directly while staying respectful.",
  Balanced: "Recognise trade-offs before advancing a measured position.",
  "Data-driven": "Ask for evidence and refer to measurable outcomes.",
  Contrarian: "Offer a credible alternative framing that tests consensus.",
};

export async function createDiscussionReply(input: { personality: GDPersonality; topic: string; userArgument: string }) {
  const fallback = `${input.personality} perspective: I see your point, but we should test it against the practical trade-offs before agreeing.`;
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are a simulated group-discussion participant. ${personalityInstructions[input.personality]} Reply in two concise spoken sentences, without insults or unsafe advice.` },
        { role: "user", content: `Topic: ${input.topic}\nStudent's argument: ${input.userArgument}` },
      ],
    });
    const content = response.choices[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : fallback;
  } catch {
    return fallback;
  }
}
