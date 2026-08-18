import { LiveWaveform } from "@/components/LiveWaveform";
import { RecordingReview } from "@/components/RecordingReview";
import { SpeakUpShell } from "@/components/SpeakUpShell";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/_core/hooks/useAuth";
import { DEFAULT_PREPARATION_SECONDS, getCaptureUploadConfig, nextCountdownValue } from "@/lib/practiceCapture";
import { trpc } from "@/lib/trpc";
import { difficulties, topicCategories, type Difficulty, type PracticeAnalysis, type Topic, type TopicCategory } from "@shared/practice";
import { AlertCircle, ArrowLeft, Camera, Mic, Pause, Play, RotateCcw, ShieldCheck, Square, Video } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

type JamStage = "setup" | "preparing" | "speaking" | "finishing" | "review";
type CaptureMode = "audio" | "video";

function secondsLabel(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function JamPractice() {
  const { user } = useAuth();
  const [category, setCategory] = useState<TopicCategory>("Random");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const { data: generated, refetch } = trpc.topics.random.useQuery({ category, difficulty, durationSeconds: 60 });
  const [topic, setTopic] = useState<Topic | null>(null);
  const [stage, setStage] = useState<JamStage>("setup");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("audio");
  const [preparationSeconds, setPreparationSeconds] = useState(DEFAULT_PREPARATION_SECONDS);
  const [remaining, setRemaining] = useState(DEFAULT_PREPARATION_SECONDS);
  const [sessionSeconds, setSessionSeconds] = useState(60);
  const [sessionLength, setSessionLength] = useState(60);
  const [isChallenge, setIsChallenge] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<PracticeAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const recorder = useAudioRecorder({ withVideo: captureMode === "video" });
  const createSession = trpc.sessions.create.useMutation();
  const upload = trpc.recordings.upload.useMutation();
  const transcribe = trpc.recordings.transcribe.useMutation();
  const feedback = trpc.feedback.generate.useMutation();
  const complete = trpc.sessions.complete.useMutation();
  const currentTopic = topic || generated || null;
  const working = upload.isPending || transcribe.isPending || feedback.isPending || createSession.isPending || complete.isPending;
  const { start: startRecording, stop: stopRecording, status: recorderStatus } = recorder;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("speakup-topic");
      const mode = localStorage.getItem("speakup-practice-mode");
      const duration = Number(localStorage.getItem("speakup-challenge-duration"));
      if (stored) {
        setTopic(JSON.parse(stored) as Topic);
        localStorage.removeItem("speakup-topic");
      }
      if (mode === "challenge" && [30, 60, 90].includes(duration)) {
        setIsChallenge(true);
        setSessionLength(duration);
        setSessionSeconds(duration);
      }
      localStorage.removeItem("speakup-practice-mode");
      localStorage.removeItem("speakup-challenge-duration");
    } catch { /* Ignore invalid local topic. */ }
  }, []);

  useEffect(() => {
    if (!topic && generated) setTopic(generated);
  }, [generated, topic]);

  useEffect(() => {
    setTopic(null);
    refetch();
  }, [category, difficulty, refetch]);

  useEffect(() => {
    if (cameraPreviewRef.current && recorder.previewStream) cameraPreviewRef.current.srcObject = recorder.previewStream;
  }, [recorder.previewStream]);

  useEffect(() => {
    if (stage !== "preparing") return;
    if (remaining === 0) {
      setStage("speaking");
      setSessionSeconds(sessionLength);
      startRecording();
      return;
    }
    const id = window.setTimeout(() => setRemaining(nextCountdownValue), 1000);
    return () => window.clearTimeout(id);
  }, [stage, remaining, sessionLength, startRecording]);

  useEffect(() => {
    if (stage !== "speaking" || recorderStatus === "paused") return;
    if (sessionSeconds === 0) {
      stopRecording();
      setStage("finishing");
      return;
    }
    const id = window.setTimeout(() => setSessionSeconds(nextCountdownValue), 1000);
    return () => window.clearTimeout(id);
  }, [stage, sessionSeconds, recorderStatus, stopRecording]);

  useEffect(() => {
    if (stage === "finishing" && recorder.recordingUrl) setStage("review");
  }, [stage, recorder.recordingUrl]);

  const timerProgress = useMemo(() => {
    const total = stage === "preparing" ? Math.max(preparationSeconds, 1) : sessionLength;
    const value = stage === "preparing" ? remaining : sessionSeconds;
    return `${(value / total) * 100}%`;
  }, [stage, remaining, sessionSeconds, preparationSeconds, sessionLength]);

  const generateAnother = () => {
    setTopic(null);
    refetch();
  };

  const begin = () => {
    setRemaining(preparationSeconds);
    setSessionSeconds(sessionLength);
    setAnalysis(null);
    setTranscript("");
    setAnalysisError(null);
    recorder.reset();
    setStage(preparationSeconds ? "preparing" : "speaking");
    if (!preparationSeconds) startRecording();
  };

  const finishNow = useCallback(() => {
    stopRecording();
    setStage("finishing");
  }, [stopRecording]);

  const tryAgain = () => {
    recorder.reset();
    setRemaining(preparationSeconds);
    setSessionSeconds(sessionLength);
    setAnalysis(null);
    setTranscript("");
    setStage("setup");
  };

  const submit = async () => {
    if (!recorder.recordingBlob || !currentTopic) return;
    try {
      setAnalysisError(null);
      const recordingKind = captureMode === "video" ? "video" : "audio";
      const session = user ? await createSession.mutateAsync({
        sessionType: isChallenge ? "challenge" : "jam",
        topic: currentTopic.text,
        category: currentTopic.category,
        difficulty: currentTopic.difficulty,
        preparationSeconds,
        durationSeconds: sessionLength,
        recordingKind,
      }) : undefined;
      const base64 = await blobToBase64(recorder.recordingBlob);
      const captureUpload = getCaptureUploadConfig(captureMode, recorder.recordingBlob.type);
      const saved = await upload.mutateAsync({ base64, ...captureUpload });
      const speech = await transcribe.mutateAsync({ recordingUrl: saved.url });
      if (!("text" in speech)) throw new Error(speech.error || "The recording could not be transcribed.");
      const text = speech.text || "";
      setTranscript(text);
      const result = await feedback.mutateAsync({ transcript: text, topic: currentTopic.text, durationSeconds: Math.max(1, sessionLength - sessionSeconds) });
      setAnalysis(result);
      if (session?.id) await complete.mutateAsync({
        sessionId: session.id,
        overallScore: result.overallScore,
        recordingKind,
        recordingMimeType: recorder.recordingBlob.type || captureUpload.contentType,
        recordingKey: saved.key,
        recordingUrl: saved.url,
        transcript: text,
        analysisJson: JSON.stringify(result),
      });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "We could not analyze this recording. Please try again.");
    }
  };

  if (stage === "review") {
    return <SpeakUpShell><main className="app-container py-10 md:py-14"><div className="mb-7 flex items-center justify-between"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to practice</Link><span className="topic-tag">{captureMode === "video" ? "Camera + voice" : isChallenge ? "Random Challenge" : "JAM"} · {currentTopic?.difficulty || difficulty}</span></div><p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Session review</p><h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-.05em] md:text-4xl">{currentTopic?.text}</h1>{analysisError && <p className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"><AlertCircle className="h-4 w-4" />{analysisError}</p>}<div className="mt-7"><RecordingReview recordingUrl={recorder.recordingUrl} recordingKind={captureMode} analysis={analysis} transcript={transcript} isWorking={working} onAnalyze={submit} onTryAgain={tryAgain} /></div></main></SpeakUpShell>;
  }

  return <SpeakUpShell><main className="jam-surface"><div className="app-container py-8"><div className="flex items-center justify-between"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Exit practice</Link><div className="flex items-center gap-2"><span className="topic-tag">{isChallenge ? "Challenge" : "JAM"}</span><span className="topic-tag">{difficulty}</span></div></div>{stage === "setup" ? <section className="mx-auto mt-14 max-w-4xl"><p className="eyebrow justify-center"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> {isChallenge ? "Random Challenge" : "Just A Minute"}</p><h1 className="mt-5 text-center text-4xl font-semibold tracking-[-.06em] md:text-5xl">Your topic is<span className="text-[var(--accent)]">…</span></h1><div className="jam-topic mt-10"><p className="text-sm font-medium text-muted-foreground">Draw a clear opening. Then let the point unfold.</p><h2>{currentTopic?.text || "Preparing a topic…"}</h2><div className="mt-7 flex flex-wrap gap-2"><span className="topic-tag">{currentTopic?.category || category}</span><span className="topic-tag">{currentTopic?.difficulty || difficulty}</span><span className="topic-tag">{preparationSeconds} sec prep · {sessionLength} sec speak</span></div><div className="mt-10 border-t border-border/70 pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Topic settings</p><div className="flex flex-wrap gap-2">{topicCategories.map(item => <button key={item} onClick={() => setCategory(item)} className={`filter-pill ${category === item ? "active" : ""}`}>{item}</button>)}{difficulties.map(item => <button key={item} onClick={() => setDifficulty(item)} className={`filter-pill ${difficulty === item ? "active" : ""}`}>{item}</button>)}</div></div><div className="mt-6 grid gap-5 border-t border-border/70 pt-5 md:grid-cols-2"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Preparation time</p><div className="flex flex-wrap gap-2">{[0, 15, 30, 45, 60].map(value => <button key={value} onClick={() => setPreparationSeconds(value)} className={`filter-pill ${preparationSeconds === value ? "active" : ""}`}>{value ? `${value} sec` : "None"}</button>)}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Speaking time</p><div className="flex flex-wrap gap-2">{[30, 60, 90, 120].map(value => <button key={value} onClick={() => { setSessionLength(value); setSessionSeconds(value); }} className={`filter-pill ${sessionLength === value ? "active" : ""}`}>{value} sec</button>)}</div></div></div><div className="mt-6 border-t border-border/70 pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Capture mode</p><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => setCaptureMode("audio")} className={`capture-choice ${captureMode === "audio" ? "active" : ""}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-background"><Mic className="h-4 w-4" /></span><span><strong>Voice only</strong><small>Record speech and receive a transcript.</small></span></button><button onClick={() => setCaptureMode("video")} className={`capture-choice ${captureMode === "video" ? "active" : ""}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-background"><Camera className="h-4 w-4" /></span><span><strong>Camera + voice</strong><small>Review framing, eye line, posture, and delivery.</small></span></button></div><p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" /> Your camera stays off unless you choose Camera + voice and allow browser access.</p></div></div><div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={generateAnother} className="rounded-full bg-background"><RotateCcw className="mr-1.5 h-4 w-4" /> Generate another topic</Button><Button onClick={begin} className="rounded-full px-6">Start {isChallenge ? "challenge" : "JAM"} {captureMode === "video" ? <Video className="ml-1.5 h-4 w-4" /> : <Mic className="ml-1.5 h-4 w-4" />}</Button></div></section> : <section className="mx-auto mt-10 max-w-3xl text-center"><p className="text-sm font-medium text-muted-foreground">{currentTopic?.text}</p>{captureMode === "video" && recorder.previewStream && <div className="camera-preview mt-5"><video ref={cameraPreviewRef} autoPlay muted playsInline /><span className="camera-live"><span /> Camera preview</span></div>}<div className="relative mx-auto mt-8 grid h-[min(68vw,340px)] w-[min(68vw,340px)] place-items-center rounded-full bg-card shadow-[0_25px_70px_rgba(26,34,52,.12)]"><div className="timer-ring" style={{ "--timer-progress": timerProgress } as React.CSSProperties} /><div className="relative z-10"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{stage === "preparing" ? "Preparation" : stage === "finishing" ? "Finishing" : recorderStatus === "paused" ? "Paused" : "Speak now"}</p><p className="mt-3 font-mono text-5xl font-medium tabular-nums tracking-[-.035em] md:text-6xl">{secondsLabel(stage === "preparing" ? remaining : sessionSeconds)}</p></div></div>{stage === "preparing" ? <p className="mt-8 text-sm text-muted-foreground">Use this time to plan your opening. The {captureMode === "video" ? "camera and microphone" : "microphone"} will start automatically after {preparationSeconds} seconds.</p> : <><LiveWaveform levels={recorder.levels} active={recorderStatus === "recording"} className="mx-auto mt-7 max-w-lg" /><p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"><span className={`h-2 w-2 rounded-full ${recorderStatus === "recording" ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />{recorderStatus === "requesting" ? `Waiting for ${captureMode === "video" ? "camera and microphone" : "microphone"} permission…` : recorderStatus === "recording" ? `${captureMode === "video" ? "Video and voice" : "Voice"} recording is active` : recorderStatus === "paused" ? "Recording is paused" : "Finishing your recording…"}</p>{recorder.error && <p className="mx-auto mt-4 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{recorder.error}</p>}<div className="mt-7 flex flex-wrap justify-center gap-3">{recorderStatus === "recording" ? <Button variant="outline" onClick={recorder.pause} className="rounded-full bg-background"><Pause className="mr-1.5 h-4 w-4" /> Pause</Button> : recorderStatus === "paused" ? <Button variant="outline" onClick={recorder.resume} className="rounded-full bg-background"><Play className="mr-1.5 h-4 w-4" /> Resume</Button> : null}<Button onClick={finishNow} disabled={stage === "finishing"} className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"><Square className="mr-1.5 h-4 w-4" /> Stop</Button></div></>}</section>}</div></main></SpeakUpShell>;
}
