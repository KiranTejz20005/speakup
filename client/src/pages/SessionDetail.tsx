import { PracticeGate } from "@/components/PracticeGate";
import { RecordingReview } from "@/components/RecordingReview";
import { SpeakUpShell } from "@/components/SpeakUpShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import type { PracticeAnalysis } from "@shared/practice";
import { ArrowLeft, FileWarning } from "lucide-react";
import { Link, useRoute } from "wouter";

function DetailWorkspace({ sessionId }: { sessionId: number }) {
  const { user } = useAuth();
  const session = trpc.sessions.detail.useQuery({ sessionId }, { enabled: Boolean(user) });
  if (session.isLoading) return <main className="app-container grid min-h-[55vh] place-items-center text-sm text-muted-foreground">Loading session…</main>;
  if (!session.data) return <main className="app-container grid min-h-[55vh] place-items-center text-center"><div><FileWarning className="mx-auto h-8 w-8 text-[var(--accent)]" /><h1 className="mt-4 text-2xl font-semibold">This session is unavailable.</h1><Link href="/history" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">Return to history</Link></div></main>;
  let analysis: PracticeAnalysis | null = null;
  try { analysis = session.data.analysisJson ? JSON.parse(session.data.analysisJson) as PracticeAnalysis : null; } catch { analysis = null; }
  return <main className="app-container py-9 md:py-14"><Link href="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to history</Link><p className="eyebrow mt-8"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> {session.data.sessionType} session · {session.data.createdAt.toLocaleDateString()}</p><h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-.05em] md:text-4xl">{session.data.topic}</h1><div className="mt-8"><RecordingReview recordingUrl={session.data.recordingUrl} analysis={analysis} transcript={session.data.transcript || ""} isWorking={false} onAnalyze={() => undefined} onTryAgain={() => window.location.assign("/jam")} /></div></main>;
}
export default function SessionDetail() { const [, params] = useRoute("/history/:id"); const sessionId = Number(params?.id); return <SpeakUpShell><PracticeGate>{Number.isFinite(sessionId) ? <DetailWorkspace sessionId={sessionId} /> : <main className="app-container py-16">Invalid session.</main>}</PracticeGate></SpeakUpShell>; }
