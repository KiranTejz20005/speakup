import { cn } from "@/lib/utils";

const bars = [18, 29, 42, 62, 46, 72, 94, 63, 47, 72, 49, 32, 21];

export function WaveVisual({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <div className={cn("wave-visual flex h-24 items-center justify-center gap-1.5", active && "is-active", className)} aria-label={active ? "Live audio waveform" : "Decorative audio waveform"}>
      {bars.map((height, index) => (
        <span key={index} className="wave-bar" style={{ height: `${height}%`, animationDelay: `${index * 55}ms` }} />
      ))}
    </div>
  );
}
