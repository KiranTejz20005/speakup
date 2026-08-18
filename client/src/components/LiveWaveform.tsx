import { cn } from "@/lib/utils";

export function LiveWaveform({ levels, active, className }: { levels: number[]; active: boolean; className?: string }) {
  return <div className={cn("live-waveform", active && "is-active", className)} aria-label="Live microphone waveform">{levels.map((level, index) => <span key={index} style={{ transform: `scaleY(${Math.max(.11, level)})`, transitionDelay: `${index % 4 * 12}ms` }} />)}</div>;
}
