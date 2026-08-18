import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Loader2, LockKeyhole } from "lucide-react";

export function PracticeGate({ children, label = "Sign in to save and analyze your practice" }: { children: React.ReactNode; label?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /></div>;
  if (!user) return <div className="mx-auto grid min-h-[54vh] max-w-lg place-items-center text-center"><div className="rounded-3xl border border-border bg-card p-9 shadow-[0_18px_44px_rgba(20,27,45,.07)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--soft-accent)] text-[var(--accent-ink)]"><LockKeyhole className="h-5 w-5" /></span><h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Bring your practice into focus.</h1><p className="mt-3 leading-7 text-muted-foreground">{label}</p><Button onClick={() => startLogin()} className="mt-7 rounded-full px-6">Sign in to continue</Button></div></div>;
  return <>{children}</>;
}
