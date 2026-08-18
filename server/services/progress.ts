import type { PracticeSession } from "../../drizzle/schema";
import type { PracticeAnalysis } from "@shared/practice";

function readAnalysis(value: string | null): PracticeAnalysis | null {
  if (!value) return null;
  try { return JSON.parse(value) as PracticeAnalysis; } catch { return null; }
}

export function buildProgressSnapshot(sessions: PracticeSession[]) {
  const completed = sessions.filter(session => session.status === "complete");
  const scored = completed.filter(session => typeof session.overallScore === "number");
  const totalDurationSeconds = completed.reduce((sum, session) => sum + session.durationSeconds, 0);
  const analyses = completed.map(session => readAnalysis(session.analysisJson)).filter((analysis): analysis is PracticeAnalysis => Boolean(analysis));
  const chronological = [...completed].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const fillerCounts = chronological.map(session => readAnalysis(session.analysisJson)?.fillerWords.length ?? 0);
  const fillerWordsReduced = fillerCounts.length > 1 ? Math.max(0, fillerCounts[0]! - fillerCounts[fillerCounts.length - 1]!) : 0;
  const now = new Date();
  const weeks = [3, 2, 1, 0].map(offset => {
    const end = new Date(now);
    end.setDate(end.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const items = scored.filter(session => session.createdAt >= start && session.createdAt <= end);
    const average = items.length ? Math.round(items.reduce((sum, item) => sum + (item.overallScore ?? 0), 0) / items.length) : null;
    return { label: offset === 0 ? "This week" : `${offset} week${offset === 1 ? "" : "s"} ago`, score: average, sessions: items.length };
  });
  const recentWeek = completed.filter(session => session.createdAt.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    metrics: {
      sessionsCompleted: completed.length,
      averageScore: scored.length ? Math.round(scored.reduce((sum, item) => sum + (item.overallScore ?? 0), 0) / scored.length) : null,
      bestScore: scored.length ? Math.max(...scored.map(item => item.overallScore ?? 0)) : null,
      speakingMinutes: Math.round(totalDurationSeconds / 60),
      fillerWordsReduced,
      averageConfidence: analyses.length ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.scores.Confidence, 0) / analyses.length) : null,
    },
    weeks,
    achievements: [
      { name: "First Session", unlocked: completed.length >= 1, detail: "Complete your first recorded practice." },
      { name: "10 Sessions", unlocked: completed.length >= 10, detail: "Complete ten practice sessions." },
      { name: "50 Minutes Spoken", unlocked: totalDurationSeconds >= 3000, detail: "Accumulate fifty minutes of recorded practice." },
      { name: "Filler-Free Speaker", unlocked: analyses.some(analysis => analysis.fillerWords.length === 0), detail: "Finish a reviewed session without detected fillers." },
      { name: "JAM Master", unlocked: completed.filter(session => session.sessionType === "jam").length >= 10, detail: "Complete ten JAM practice sessions." },
      { name: "GD Starter", unlocked: completed.some(session => session.sessionType === "gd"), detail: "Complete your first group discussion." },
      { name: "Consistent Speaker", unlocked: recentWeek.length >= 3, detail: "Complete three sessions in the last seven days." },
    ],
  };
}
