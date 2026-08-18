import type { InterviewCategory } from "@shared/practice";

const questions: Record<InterviewCategory, string[]> = {
  HR: ["Tell me about yourself.", "Why should we hire you?", "What are your strengths?", "What are your weaknesses?", "Where do you see yourself in five years?"],
  Behavioral: ["Tell me about a failure and what it taught you.", "Describe a difficult team situation.", "Tell me about a leadership experience."],
  Technical: ["Explain a web-development project you are proud of.", "How would you approach an AI/ML problem with incomplete data?", "Describe a database design decision you have made.", "What programming practice improves code reliability?", "How would you debug a computer-network issue?"],
};

export function getInterviewQuestion(category: InterviewCategory, index: number) {
  const list = questions[category];
  return { question: list[index % list.length]!, total: list.length, index: index % list.length };
}
