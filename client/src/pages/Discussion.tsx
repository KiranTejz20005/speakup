import { LiveWaveform } from "@/components/LiveWaveform";
import { PracticeGate } from "@/components/PracticeGate";
import { SpeakUpShell } from "@/components/SpeakUpShell";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { gdPersonalities, type GDPersonality } from "@shared/practice";
import { AlertCircle, ArrowLeft, BarChart3, BrainCircuit, Mic, Pause, Play, Send, Square, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type DiscussionMessage = { id: string; author: string; type: "ai" | "user" | "system"; content: string };
async function blobToBase64(blob: Blob) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }

const topic = "Should AI replace human jobs?";
const starter: DiscussionMessage[] = [{ id: "starter", author: "Balanced", type: "ai", content: "Automation can increase productivity, but the strongest argument should also account for how people can move into new work." }];

function DiscussionWorkspace() {
  const { user } = useAuth();
  const [personality, setPersonality] = useState<GDPersonality>("Logical");
  const [messages, setMessages] = useState<DiscussionMessage[]>(starter);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const recorder = useAudioRecorder();
  const upload = trpc.recordings.upload.useMutation();
  const transcribe = trpc.recordings.transcribe.useMutation();
  const discussionRound = trpc.discussion.round.useMutation();
  const feedback = trpc.feedback.generate.useMutation();
  const createSession = trpc.sessions.create.useMutation();
  const completeSession = trpc.sessions.complete.useMutation();
  const busy = upload.isPending || transcribe.isPending || discussionRound.isPending || feedback.isPending || createSession.isPending || completeSession.isPending;
  const userMessages = messages.filter(message => message.type === "user");
  const spokenWords = userMessages.reduce((count, message) => count + (message.content.match(/[A-Za-z']+/g)?.length ?? 0), 0);
  const participantReplies = messages.filter(message => message.type === "ai").length;
  const record = () => { if (recorder.status === "idle" || recorder.status === "stopped" || recorder.status === "error") recorder.start(); };
  const send = async () => {
    if (!recorder.recordingBlob || !user) return;
    try {
      setError(null);
      const base64 = await blobToBase64(recorder.recordingBlob);
      const saved = await upload.mutateAsync({ base64, contentType: recorder.recordingBlob.type.includes("ogg") ? "audio/ogg" : "audio/webm", fileName: "gd-contribution.webm" });
      const speech = await transcribe.mutateAsync({ recordingUrl: saved.url });
      if (!("text" in speech)) throw new Error(speech.error || "Your contribution could not be transcribed.");
      const text = speech.text.trim();
      if (!text) throw new Error("We could not hear a spoken argument. Try again with your microphone closer.");
      const session = await createSession.mutateAsync({ sessionType: "gd", topic, category: "Technology", difficulty: "Medium", durationSeconds: 60 });
      const analysis = await feedback.mutateAsync({ transcript: text, topic, durationSeconds: 60 });
      if (session?.id) await completeSession.mutateAsync({ sessionId: session.id, overallScore: analysis.overallScore, recordingKey: saved.key, recordingUrl: saved.url, transcript: text, analysisJson: JSON.stringify(analysis) });
      setMessages(current => [...current, { id: `user-${Date.now()}`, author: "You", type: "user", content: text }]);
      const responses = await discussionRound.mutateAsync({ topic, userArgument: text });
      setMessages(current => [...current, ...responses.map((response, index) => ({ id: `ai-${Date.now()}-${index}`, author: response.personality, type: "ai" as const, content: response.content }))]);
      recorder.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not send your point. Try again."); }
  };
  return <main className="app-container py-8 md:py-11"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to practice</Link><span className="topic-tag">Live simulator · {userMessages.length} contribution{userMessages.length === 1 ? "" : "s"}</span></div><div className="mt-8 grid gap-6 xl:grid-cols-[.74fr_1.26fr]"><aside className="rounded-3xl border border-border bg-card p-6"><p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Group discussion</p><h1 className="mt-4 text-3xl font-semibold tracking-[-.05em]">Should AI replace human jobs?</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">All five participants respond after your contribution. Select one to focus on as the discussion evolves.</p><div className="mt-7"><p className="text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Five active participants</p><div className="mt-3 grid gap-2">{gdPersonalities.map(item => <button key={item} onClick={() => setPersonality(item)} className={`personality-row ${personality === item ? "active" : ""}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-background"><BrainCircuit className="h-3.5 w-3.5" /></span>{item}</button>)}</div></div><div className="mt-8 rounded-2xl bg-muted/60 p-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Discussion cue</p><p className="mt-2 text-sm leading-6">Offer a position, support it with one reason, then recognise a trade-off.</p></div><Button variant="outline" disabled={!userMessages.length} onClick={() => setReportOpen(true)} className="mt-4 w-full rounded-xl bg-background"><BarChart3 className="mr-1.5 h-4 w-4" /> End & view report</Button></aside><section className="flex min-h-[610px] flex-col rounded-3xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--soft-accent)] text-[var(--accent-ink)]"><UsersRound className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Discussion room</p><p className="text-xs text-muted-foreground">Listen, contribute, respond</p></div></div><span className="h-2 w-2 rounded-full bg-emerald-500" /></div><div className="flex-1 space-y-4 overflow-y-auto px-5 py-6 md:px-7">{messages.map(message => <div key={message.id} className={`discussion-message ${message.type} ${message.author === personality ? "focus" : ""}`}><span className="text-xs font-semibold uppercase tracking-[.14em]">{message.author}</span><p className="mt-2 text-sm leading-6">{message.content}</p></div>)}</div><div className="border-t border-border p-4 md:p-5">{error && <p className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}<div className="rounded-2xl border border-border bg-muted/35 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{recorder.status === "recording" ? "Your contribution is recording" : recorder.status === "paused" ? "Contribution paused" : recorder.recordingUrl ? "Contribution ready to send" : "Make your point"}</p><p className="mt-1 text-xs text-muted-foreground">Use your microphone; five participants will respond to your argument.</p></div>{recorder.status === "recording" && <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Recording</span>}</div><LiveWaveform levels={recorder.levels} active={recorder.status === "recording"} className="my-2 h-12" /><div className="flex flex-wrap gap-2">{recorder.status === "recording" ? <><Button variant="outline" onClick={recorder.pause} className="rounded-full bg-background"><Pause className="mr-1.5 h-4 w-4" />Pause</Button><Button onClick={recorder.stop} className="rounded-full"><Square className="mr-1.5 h-4 w-4" />Stop</Button></> : recorder.status === "paused" ? <><Button variant="outline" onClick={recorder.resume} className="rounded-full bg-background"><Play className="mr-1.5 h-4 w-4" />Resume</Button><Button onClick={recorder.stop} className="rounded-full"><Square className="mr-1.5 h-4 w-4" />Stop</Button></> : recorder.recordingUrl ? <><Button variant="outline" onClick={recorder.reset} className="rounded-full bg-background">Record again</Button><Button disabled={busy} onClick={send} className="rounded-full">{busy ? "Sending…" : "Send contribution"}<Send className="ml-1.5 h-4 w-4" /></Button></> : <Button onClick={record} className="rounded-full"><Mic className="mr-1.5 h-4 w-4" />Start contribution</Button>}</div>{recorder.error && <p className="mt-3 text-xs text-red-600">{recorder.error}</p>}</div></div></section></div>{reportOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl bg-card p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> GD Performance Report</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.05em]">You made {userMessages.length} contribution{userMessages.length === 1 ? "" : "s"}.</h2></div><Button variant="ghost" size="sm" onClick={() => setReportOpen(false)} className="rounded-full">Close</Button></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="score-pod"><span className="text-2xl font-semibold">{userMessages.length}</span><span>Contributions</span></div><div className="score-pod"><span className="text-2xl font-semibold">{spokenWords}</span><span>Spoken words</span></div><div className="score-pod"><span className="text-2xl font-semibold">{participantReplies}</span><span>Participant replies</span></div><div className="score-pod"><span className="text-2xl font-semibold">{userMessages.length ? "Active" : "—"}</span><span>Engagement</span></div></div><div className="mt-5 rounded-2xl bg-muted/55 p-5"><p className="font-semibold">Coach’s next move</p><p className="mt-2 text-sm leading-6 text-muted-foreground">On your next round, respond to one specific counterargument before returning to your own position. It demonstrates listening as well as leadership.</p></div></div></div>}</main>;
}

export default function Discussion() { return <SpeakUpShell><PracticeGate label="Sign in to use the voice-powered group-discussion simulator and preserve your practice."><DiscussionWorkspace /></PracticeGate></SpeakUpShell>; }
