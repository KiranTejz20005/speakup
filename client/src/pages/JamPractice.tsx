import { LiveWaveform } from "@/components/LiveWaveform";
import { RecordingReview } from "@/components/RecordingReview";
import { SpeakUpShell } from "@/components/SpeakUpShell";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { difficulties, topicCategories, type Difficulty, type Topic, type TopicCategory, type PracticeAnalysis } from "@shared/practice";
import { AlertCircle, ArrowLeft, Mic, Pause, Play, RotateCcw, Square, TimerReset } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type JamStage = "setup" | "preparing" | "speaking" | "finishing" | "review";

function secondsLabel(seconds: number) { return `00:${String(Math.max(0, seconds)).padStart(2, "0")}`; }
async function blobToBase64(blob: Blob) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }

export default function JamPractice() {
  const { user } = useAuth();
  const [category, setCategory] = useState<TopicCategory>("Random");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const { data: generated, refetch } = trpc.topics.random.useQuery({ category, difficulty });
  const [topic, setTopic] = useState<Topic | null>(null);
  const [stage, setStage] = useState<JamStage>("setup");
  const [remaining, setRemaining] = useState(10);
  const [sessionSeconds, setSessionSeconds] = useState(60);
  const [sessionLength, setSessionLength] = useState(60);
  const [isChallenge, setIsChallenge] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<PracticeAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const recorder = useAudioRecorder();
  const createSession = trpc.sessions.create.useMutation();
  const upload = trpc.recordings.upload.useMutation();
  const transcribe = trpc.recordings.transcribe.useMutation();
  const feedback = trpc.feedback.generate.useMutation();
  const complete = trpc.sessions.complete.useMutation();
  const currentTopic = topic || generated || null;
  const working = upload.isPending || transcribe.isPending || feedback.isPending || createSession.isPending || complete.isPending;

  useEffect(() => {
    try { const stored = localStorage.getItem("speakup-topic"); const mode = localStorage.getItem("speakup-practice-mode"); const duration = Number(localStorage.getItem("speakup-challenge-duration")); if (stored) { setTopic(JSON.parse(stored) as Topic); localStorage.removeItem("speakup-topic"); } if (mode === "challenge" && [30, 60, 90].includes(duration)) { setIsChallenge(true); setSessionLength(duration); setSessionSeconds(duration); } localStorage.removeItem("speakup-practice-mode"); localStorage.removeItem("speakup-challenge-duration"); } catch { /* Ignore invalid local topic. */ }
  }, []);
  useEffect(() => { if (!topic && generated) setTopic(generated); }, [generated, topic]);
  useEffect(() => { setTopic(null); refetch(); }, [category, difficulty, refetch]);
  useEffect(() => { if (stage !== "preparing") return; if (remaining === 0) { setStage("speaking"); setSessionSeconds(sessionLength); recorder.start(); return; } const id = window.setTimeout(() => setRemaining(value => value - 1), 1000); return () => window.clearTimeout(id); }, [stage, remaining, sessionLength, recorder]);
  useEffect(() => { if (stage !== "speaking" || recorder.status === "paused") return; if (sessionSeconds === 0) { recorder.stop(); setStage("finishing"); return; } const id = window.setTimeout(() => setSessionSeconds(value => value - 1), 1000); return () => window.clearTimeout(id); }, [stage, sessionSeconds, recorder]);
  useEffect(() => { if (stage === "finishing" && recorder.recordingUrl) setStage("review"); }, [stage, recorder.recordingUrl]);
  const timerProgress = useMemo(() => { const total = stage === "preparing" ? 10 : sessionLength; const value = stage === "preparing" ? remaining : sessionSeconds; return `${(value / total) * 100}%`; }, [stage, remaining, sessionSeconds, sessionLength]);
  const generateAnother = () => { setTopic(null); refetch(); };
  const begin = () => { setRemaining(10); setSessionSeconds(sessionLength); setAnalysis(null); setTranscript(""); recorder.reset(); setStage("preparing"); };
  const finishNow = useCallback(() => { recorder.stop(); setStage("finishing"); }, [recorder]);
  const tryAgain = () => { recorder.reset(); setRemaining(10); setSessionSeconds(sessionLength); setAnalysis(null); setTranscript(""); setStage("setup"); };
  const submit = async () => {
    if (!user) { startLogin(); return; }
    if (!recorder.recordingBlob || !currentTopic) return;
    try {
      setAnalysisError(null);
      const session = await createSession.mutateAsync({ sessionType: isChallenge ? "challenge" : "jam", topic: currentTopic.text, category: currentTopic.category, difficulty: currentTopic.difficulty, durationSeconds: sessionLength });
      const base64 = await blobToBase64(recorder.recordingBlob);
      const saved = await upload.mutateAsync({ base64, contentType: recorder.recordingBlob.type.includes("ogg") ? "audio/ogg" : "audio/webm", fileName: "jam-response.webm" });
      const speech = await transcribe.mutateAsync({ recordingUrl: saved.url });
      if (!("text" in speech)) throw new Error(speech.error || "The recording could not be transcribed.");
      const text = speech.text || "";
      setTranscript(text);
      const result = await feedback.mutateAsync({ transcript: text, topic: currentTopic.text, durationSeconds: Math.max(1, sessionLength - sessionSeconds) });
      setAnalysis(result);
      if (session?.id) await complete.mutateAsync({ sessionId: session.id, overallScore: result.overallScore, recordingKey: saved.key, recordingUrl: saved.url, transcript: text, analysisJson: JSON.stringify(result) });
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "We could not analyze this recording. Please try again."); }
  };

  if (stage === "review") return <SpeakUpShell><main className="app-container py-10 md:py-14"><div className="mb-7 flex items-center justify-between"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to practice</Link><span className="topic-tag">{isChallenge ? "Random Challenge" : "JAM"} · {currentTopic?.difficulty || difficulty}</span></div><p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Session review</p><h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-.05em] md:text-4xl">{currentTopic?.text}</h1>{analysisError && <p className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"><AlertCircle className="h-4 w-4" />{analysisError}</p>}<div className="mt-7"><RecordingReview recordingUrl={recorder.recordingUrl} analysis={analysis} transcript={transcript} isWorking={working} onAnalyze={submit} onTryAgain={tryAgain} /></div></main></SpeakUpShell>;
  return <SpeakUpShell><main className="jam-surface"><div className="app-container py-8"><div className="flex items-center justify-between"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Exit practice</Link><div className="flex items-center gap-2"><span className="topic-tag">{isChallenge ? "Challenge" : "JAM"}</span><span className="topic-tag">{difficulty}</span></div></div>{stage === "setup" ? <section className="mx-auto mt-14 max-w-4xl"><p className="eyebrow justify-center"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> {isChallenge ? "Random Challenge" : "Just A Minute"}</p><h1 className="mt-5 text-center text-4xl font-semibold tracking-[-.06em] md:text-5xl">Your topic is<span className="text-[var(--accent)]">…</span></h1><div className="jam-topic mt-10"><p className="text-sm font-medium text-muted-foreground">Draw a clear opening. Then let the point unfold.</p><h2>{currentTopic?.text || "Preparing a topic…"}</h2><div className="mt-7 flex flex-wrap gap-2"><span className="topic-tag">{currentTopic?.category || category}</span><span className="topic-tag">{currentTopic?.difficulty || difficulty}</span><span className="topic-tag">10 sec prep · {sessionLength} sec speak</span></div><div className="mt-10 border-t border-border/70 pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Shape your challenge</p><div className="flex flex-wrap gap-2">{topicCategories.map(item => <button key={item} onClick={() => setCategory(item)} className={`filter-pill ${category === item ? "active" : ""}`}>{item}</button>)}{difficulties.map(item => <button key={item} onClick={() => setDifficulty(item)} className={`filter-pill ${difficulty === item ? "active" : ""}`}>{item}</button>)}</div></div></div><div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={generateAnother} className="rounded-full bg-background"><RotateCcw className="mr-1.5 h-4 w-4" /> Generate another topic</Button><Button onClick={begin} className="rounded-full px-6">Start {isChallenge ? "challenge" : "JAM"} <Mic className="ml-1.5 h-4 w-4" /></Button></div></section> : <section className="mx-auto mt-10 max-w-3xl text-center"><p className="text-sm font-medium text-muted-foreground">{currentTopic?.text}</p><div className="relative mx-auto mt-8 grid h-[min(68vw,340px)] w-[min(68vw,340px)] place-items-center rounded-full bg-card shadow-[0_25px_70px_rgba(26,34,52,.12)]"><div className="timer-ring" style={{ "--timer-progress": timerProgress } as React.CSSProperties} /><div className="relative z-10"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{stage === "preparing" ? "Preparation" : stage === "finishing" ? "Finishing" : recorder.status === "paused" ? "Paused" : "Speak now"}</p><p className="mt-3 font-mono text-5xl font-medium tracking-[-.08em] md:text-6xl">{secondsLabel(stage === "preparing" ? remaining : sessionSeconds)}</p></div></div>{stage === "preparing" ? <p className="mt-8 text-sm text-muted-foreground">Take ten seconds to choose your opening. Your microphone will start automatically.</p> : <><LiveWaveform levels={recorder.levels} active={recorder.status === "recording"} className="mx-auto mt-7 max-w-lg" /><p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"><span className={`h-2 w-2 rounded-full ${recorder.status === "recording" ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />{recorder.status === "requesting" ? "Waiting for microphone permission…" : recorder.status === "recording" ? "Recording is active" : recorder.status === "paused" ? "Recording is paused" : "Finishing your recording…"}</p>{recorder.error && <p className="mx-auto mt-4 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{recorder.error}</p>}<div className="mt-7 flex flex-wrap justify-center gap-3">{recorder.status === "recording" ? <Button variant="outline" onClick={recorder.pause} className="rounded-full bg-background"><Pause className="mr-1.5 h-4 w-4" /> Pause</Button> : recorder.status === "paused" ? <Button variant="outline" onClick={recorder.resume} className="rounded-full bg-background"><Play className="mr-1.5 h-4 w-4" /> Resume</Button> : null}<Button onClick={finishNow} disabled={stage === "finishing"} className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"><Square className="mr-1.5 h-4 w-4" /> Stop</Button></div></>}</section>}</div></main></SpeakUpShell>;
}
