import { AudioLines } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background shadow-[0_8px_24px_rgba(13,22,38,0.16)]">
        <AudioLines className="h-[18px] w-[18px]" strokeWidth={2.3} />
      </span>
      {!compact && <span className="text-[17px] font-semibold tracking-[-0.04em]">SpeakUp</span>}
    </div>
  );
}
