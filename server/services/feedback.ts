import { invokeLLM } from "../_core/llm";
import type { PracticeAnalysis } from "@shared/practice";

const fillers = ["um", "uh", "like", "you know", "actually", "basically"];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createHeuristicFeedback(transcript: string, durationSeconds: number): PracticeAnalysis {
  const normalized = transcript.toLowerCase();
  const words = transcript.trim().match(/[A-Za-z']+/g) ?? [];
  const fillerWords = fillers.flatMap(filler => {
    const count = normalized.match(new RegExp(`\\b${filler}\\b`, "g"))?.length ?? 0;
    return Array(count).fill(filler);
  });
  const wordCount = words.length;
  const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
  const pauses = (transcript.match(/\.\.\.|—/g) ?? []).length;
  const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
  const lexicalVariety = wordCount ? uniqueWords / wordCount : 0;
  const paceScore = wordsPerMinute >= 105 && wordsPerMinute <= 165 ? 88 : wordsPerMinute ? 70 : 45;
  const fluency = clamp(92 - fillerWords.length * 5 - pauses * 4);
  const clarity = clamp(68 + lexicalVariety * 30 - fillerWords.length * 2);
  const confidence = clamp(74 + Math.min(10, wordCount / 12) - fillerWords.length * 3);
  const content = clamp(60 + Math.min(25, wordCount / 8) + (/[.?!]$/.test(transcript.trim()) ? 8 : 0));
  const scores = {
    Clarity: clarity,
    Confidence: confidence,
    Fluency: fluency,
    Content: content,
    "Time Management": paceScore,
  };
  const overallScore = clamp(Object.values(scores).reduce((sum, score) => sum + score, 0) / 5);

  return {
    overallScore,
    scores,
    strengths: [
      content >= 75 ? "You developed a clear core idea." : "You began building a relevant response.",
      wordsPerMinute >= 105 ? "Your speaking pace kept the response moving." : "You gave yourself space to think before speaking.",
      fillerWords.length <= 2 ? "You kept filler words under control." : "You stayed engaged through the response.",
    ],
    improvements: [
      fillerWords.length > 2 ? "Replace filler words with a brief, intentional pause." : "Add one concrete example to make your point memorable.",
      wordsPerMinute > 165 ? "Slow down slightly so key ideas land clearly." : wordsPerMinute < 105 ? "Develop each point more fully to use the time well." : "Use signposting phrases to make the structure easier to follow.",
      "Finish with a concise conclusion that reconnects to the topic.",
    ],
    suggestedStructure: "Opening → Main Point → Example → Counterpoint → Conclusion",
    fillerWords,
    repeatedWords: [],
    pauses,
    wordCount,
    wordsPerMinute,
  };
}

export async function generateAIFeedback(input: { transcript: string; topic: string; durationSeconds: number }) {
  const fallback = createHeuristicFeedback(input.transcript, input.durationSeconds);
  if (!input.transcript.trim()) return fallback;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a supportive public-speaking coach. Return only concise, constructive JSON for the schema provided. Never give a medical or mental-health diagnosis." },
        { role: "user", content: `Topic: ${input.topic}\nDuration: ${input.durationSeconds} seconds\nTranscript: ${input.transcript}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "speaking_feedback",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallScore: { type: "integer" },
              scores: {
                type: "object",
                properties: { Clarity: { type: "integer" }, Confidence: { type: "integer" }, Fluency: { type: "integer" }, Content: { type: "integer" }, "Time Management": { type: "integer" } },
                required: ["Clarity", "Confidence", "Fluency", "Content", "Time Management"],
                additionalProperties: false,
              },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } },
            },
            required: ["overallScore", "scores", "strengths", "improvements"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") return fallback;
    const coaching = JSON.parse(content) as Pick<PracticeAnalysis, "overallScore" | "scores" | "strengths" | "improvements">;
    return { ...fallback, ...coaching, overallScore: clamp(coaching.overallScore), scores: {
      Clarity: clamp(coaching.scores.Clarity), Confidence: clamp(coaching.scores.Confidence), Fluency: clamp(coaching.scores.Fluency), Content: clamp(coaching.scores.Content), "Time Management": clamp(coaching.scores["Time Management"]),
    } };
  } catch {
    return fallback;
  }
}
