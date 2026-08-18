import type { Difficulty, Topic, TopicCategory } from "@shared/practice";

export const topicCatalogue: Topic[] = [
  { id: "edu-ai-teachers", text: "Should AI replace teachers?", category: "Education", difficulty: "Medium", suitableDurations: [60, 90] },
  { id: "edu-part-time", text: "Should college students work part-time?", category: "Education", difficulty: "Easy", suitableDurations: [30, 60] },
  { id: "edu-online", text: "Is online education better than traditional classrooms?", category: "Education", difficulty: "Medium", suitableDurations: [60, 90] },
  { id: "tech-social", text: "Is technology making us less social?", category: "Technology", difficulty: "Easy", suitableDurations: [30, 60] },
  { id: "tech-jobs", text: "Should AI replace human jobs?", category: "Technology", difficulty: "Hard", suitableDurations: [60, 90] },
  { id: "tech-privacy", text: "Should personal data be treated as private property?", category: "Technology", difficulty: "Hard", suitableDurations: [90] },
  { id: "soc-social-media", text: "Is social media making students more productive?", category: "Society", difficulty: "Medium", suitableDurations: [60, 90] },
  { id: "soc-money", text: "Does money buy happiness?", category: "Society", difficulty: "Easy", suitableDurations: [30, 60] },
  { id: "soc-failure", text: "Failure is the stepping stone to success.", category: "Society", difficulty: "Easy", suitableDurations: [30, 60] },
  { id: "career-skills", text: "Skills versus a college degree: what matters more?", category: "Career", difficulty: "Medium", suitableDurations: [60, 90] },
  { id: "career-remote", text: "Should companies allow unlimited work-from-home?", category: "Career", difficulty: "Hard", suitableDurations: [90] },
  { id: "current-city", text: "Should cities prioritise public transport over road expansion?", category: "Current Affairs", difficulty: "Hard", suitableDurations: [90] },
  { id: "abstract-change", text: "Change is the only constant.", category: "Abstract", difficulty: "Medium", suitableDurations: [60, 90] },
  { id: "business-fourday", text: "Would a four-day workweek make businesses stronger?", category: "Business", difficulty: "Hard", suitableDurations: [90] },
];

export function getRandomTopic(category: TopicCategory = "Random", difficulty?: Difficulty, durationSeconds = 60): Topic {
  const eligible = topicCatalogue.filter(topic => {
    const matchesCategory = category === "Random" || topic.category === category;
    const matchesDifficulty = !difficulty || topic.difficulty === difficulty;
    const matchesDuration = topic.suitableDurations.includes(durationSeconds as 30 | 60 | 90);
    return matchesCategory && matchesDifficulty && matchesDuration;
  });
  const source = eligible.length ? eligible : topicCatalogue;
  return { ...source[Math.floor(Math.random() * source.length)]!, durationSeconds };
}
