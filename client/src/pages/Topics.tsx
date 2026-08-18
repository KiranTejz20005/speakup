import { SpeakUpShell } from "@/components/SpeakUpShell";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { difficulties, topicCategories, type Difficulty, type TopicCategory } from "@shared/practice";
import { Bookmark, Dice5, Mic, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Topics() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<TopicCategory>("Random");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [durationSeconds, setDurationSeconds] = useState<30 | 60 | 90>(60);
  const { data: topic, isFetching, refetch } = trpc.topics.random.useQuery({ category, difficulty, durationSeconds });
  const saveTopic = trpc.topics.save.useMutation();
  useEffect(() => { refetch(); }, [category, difficulty, durationSeconds, refetch]);
  const startSpeaking = () => { if (!topic) return; localStorage.setItem("speakup-topic", JSON.stringify(topic)); localStorage.setItem("speakup-practice-mode", "challenge"); localStorage.setItem("speakup-challenge-duration", String(topic.durationSeconds || durationSeconds)); navigate("/jam"); };
  const save = () => { if (!user) return startLogin(); if (!topic) return; saveTopic.mutate({ topic: topic.text, category: topic.category, difficulty: topic.difficulty, durationSeconds }); };
  return <SpeakUpShell><main className="app-container py-10 md:py-16"><div className="mx-auto max-w-3xl text-center"><p className="eyebrow justify-center"><Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> Random topic generator</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.06em] md:text-5xl">Find your next <span className="font-serif italic text-[var(--accent)]">challenge.</span></h1><p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">Make the first move before your inner editor has time to object.</p></div><section className="mx-auto mt-10 max-w-4xl"><div className="topic-controls"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Category</p><div className="flex flex-wrap gap-2">{topicCategories.map(item => <button key={item} onClick={() => setCategory(item)} className={`filter-pill ${category === item ? "active" : ""}`}>{item}</button>)}</div></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Difficulty</p><div className="flex gap-2">{difficulties.map(item => <button key={item} onClick={() => setDifficulty(item)} className={`filter-pill ${difficulty === item ? "active" : ""}`}>{item}</button>)}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Challenge duration</p><div className="flex gap-2">{([30, 60, 90] as const).map(item => <button key={item} onClick={() => setDurationSeconds(item)} className={`filter-pill ${durationSeconds === item ? "active" : ""}`}>{item} sec</button>)}</div></div></div></div><div className="topic-card mt-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Your next challenge</span><Dice5 className={`h-5 w-5 text-[var(--accent)] ${isFetching ? "animate-spin" : ""}`} /></div><p className="mt-10 text-3xl font-semibold leading-tight tracking-[-.055em] md:text-5xl">{topic?.text || "Finding a strong topic…"}</p><div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5"><div className="flex gap-2"><span className="topic-tag">{topic?.category || category}</span><span className="topic-tag">{topic?.difficulty || difficulty}</span><span className="topic-tag">{durationSeconds} seconds</span></div><Button variant="ghost" onClick={() => refetch()} className="rounded-full text-muted-foreground"><RefreshCw className="mr-1.5 h-4 w-4" /> Generate another</Button></div></div><div className="mt-5 flex flex-wrap justify-center gap-3"><Button onClick={startSpeaking} size="lg" className="rounded-full px-6">Start speaking <Mic className="ml-1.5 h-4 w-4" /></Button><Button onClick={save} variant="outline" size="lg" className="rounded-full bg-background px-6">{saveTopic.isSuccess ? "Topic saved" : "Save topic"} <Bookmark className="ml-1.5 h-4 w-4" /></Button></div></section></main></SpeakUpShell>;
}
