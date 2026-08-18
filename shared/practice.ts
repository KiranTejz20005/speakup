export const topicCategories = [
  "Random",
  "Education",
  "Technology",
  "Society",
  "Career",
  "Current Affairs",
  "Abstract",
  "Business",
] as const;

export const difficulties = ["Easy", "Medium", "Hard"] as const;
export const performanceDimensions = [
  "Clarity",
  "Confidence",
  "Fluency",
  "Content",
  "Time Management",
] as const;
export const gdPersonalities = [
  "Logical",
  "Aggressive",
  "Balanced",
  "Data-driven",
  "Contrarian",
] as const;
export const interviewCategories = ["HR", "Behavioral", "Technical"] as const;

export type TopicCategory = (typeof topicCategories)[number];
export type Difficulty = (typeof difficulties)[number];
export type PerformanceDimension = (typeof performanceDimensions)[number];
export type GDPersonality = (typeof gdPersonalities)[number];
export type InterviewCategory = (typeof interviewCategories)[number];

export type Topic = {
  id: string;
  text: string;
  category: Exclude<TopicCategory, "Random">;
  difficulty: Difficulty;
  suitableDurations: (30 | 60 | 90)[];
  durationSeconds?: number;
};

export type PracticeAnalysis = {
  overallScore: number;
  scores: Record<PerformanceDimension, number>;
  strengths: string[];
  improvements: string[];
  suggestedStructure: string;
  fillerWords: string[];
  repeatedWords: string[];
  pauses: number;
  wordCount: number;
  wordsPerMinute: number;
};
