import { Camera, Mic, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";

export type CaptureMode = "audio" | "video";

export function CaptureModeControls({ mode, onChange, compact = false }: { mode: CaptureMode; onChange: (mode: CaptureMode) => void; compact?: boolean }) {
  return <div className={compact ? "mt-4" : "mt-6 border-t border-border/70 pt-5"}><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Capture mode</p><div className="grid gap-2 sm:grid-cols-2"><button onClick={() => onChange("audio")} className={`capture-choice ${mode === "audio" ? "active" : ""}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-background"><Mic className="h-4 w-4" /></span><span><strong>Voice only</strong><small>Record speech and receive a transcript.</small></span></button><button onClick={() => onChange("video")} className={`capture-choice ${mode === "video" ? "active" : ""}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-background"><Camera className="h-4 w-4" /></span><span><strong>Camera + voice</strong><small>Review framing, eye line, posture, and delivery.</small></span></button></div><p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" /> Your camera stays off unless you choose Camera + voice and allow browser access.</p></div>;
}

export function LiveCameraPreview({ stream }: { stream: MediaStream | null }) {
  const previewRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (previewRef.current && stream) previewRef.current.srcObject = stream; }, [stream]);
  if (!stream) return null;
  return <div className="camera-preview mt-4"><video ref={previewRef} autoPlay muted playsInline /><span className="camera-live"><span /> Camera preview</span></div>;
}
