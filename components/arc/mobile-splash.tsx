"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { GetStarted } from "@/components/arc/get-started";
import { SettingsBar } from "@/components/arc/settings-bar";

const AnimatedBentoGrid = dynamic(
  () =>
    import("@/components/arc/animated-bento-grid").then((m) => m.AnimatedBentoGrid),
  {
    loading: () => (
      <div className="aspect-square w-full overflow-hidden rounded border border-border-low bg-card/60">
        <div className="arc-shimmer h-full w-full rounded" />
      </div>
    ),
  }
);

export function MobileSplash() {
  return (
    <section className="relative isolate flex h-dvh max-h-dvh flex-col overflow-hidden md:hidden">
      <div className="pointer-events-none absolute inset-0 bg-bg1" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-100"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, var(--cream) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 110%, var(--cream) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="flex shrink-0 items-center justify-end">
          <SettingsBar />
        </header>

        <div className="mt-1 shrink-0 animate-[arc-fade_650ms_ease-out] text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.125rem] border border-border-low bg-card shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]">
            <PhoneCall className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">ComeBack.ai</h1>
          <p className="mt-1 text-xs text-muted">Miss a day. Don&apos;t miss the goal.</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-3">
          <div className="animate-[arc-fade_850ms_ease-out] aspect-square h-full max-h-full w-full max-w-full min-h-0 touch-none">
            <AnimatedBentoGrid variant="default" className="h-full w-full" draggable />
          </div>
        </div>

        <footer className="shrink-0 space-y-3">
          <GetStarted className="min-h-14 py-4 text-base font-semibold shadow-[0_12px_40px_-20px_rgba(0,0,0,0.45)]" />
          <p className="text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </footer>
      </div>
    </section>
  );
}
