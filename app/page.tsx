"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { PhoneCall } from "lucide-react";
import { SettingsBar } from "@/components/arc/settings-bar";
import { MobileSplash } from "@/components/arc/mobile-splash";
import { GetStarted } from "@/components/arc/get-started";
import { PwaInstallBanner } from "@/components/pwa-register";

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

function RotatingWord() {
  const words = useMemo(() => ["Learn", "Build", "Recover"] as const, []);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setI((v) => (v + 1) % words.length), 2200);
    return () => window.clearInterval(t);
  }, [words.length]);

  return (
    <span key={i} className="inline-block animate-[arc-fade_300ms_ease-out]">
      {words[i]}
      <span className="text-foreground"> with ComeBack.ai.</span>
    </span>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  return (
    <main className="min-h-dvh bg-bg1 text-foreground">
      <PwaInstallBanner />
      <MobileSplash />

      {/* Desktop */}
      <section className="mx-auto hidden max-w-6xl px-6 py-14 md:block">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded border border-border-low bg-card">
              <PhoneCall className="h-5 w-5" aria-hidden />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-semibold text-muted transition hover:text-foreground"
            >
              Pricing
            </Link>
            <SettingsBar />
          </div>
        </header>

        <div className="mt-12 grid grid-cols-12 items-stretch gap-10">
          <div className="col-span-6 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              ComeBack.ai
            </p>
            <h1
              className="animate-[arc-fade_650ms_ease-out] font-semibold leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2.2rem, 3.1vw, 3.4rem)" }}
            >
              <RotatingWord />
              <span className="block text-muted">
                Miss a day. Don&apos;t miss the goal.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted">
              ComeBack.ai turns vague goals into structured paths with daily tasks and
              checkpoints — then helps you recover when life gets in the way.
            </p>

            <div className="pt-2">
              <GetStarted />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                { href: "/login?callbackUrl=%2Fchat", title: "Chat", desc: "AI coach & goal planning" },
                { href: "/login?callbackUrl=%2Ftoday", title: "Today", desc: "Daily tasks & quick logging" },
                { href: "/login?callbackUrl=%2Fprogress", title: "Progress", desc: "XP, streaks, badges" },
                { href: "/login?callbackUrl=%2Fgoals%2Fnew", title: "Templates", desc: "SWE, gym, habits & more" },
                { href: "/login?callbackUrl=%2Fsettings", title: "Settings", desc: "Reminders & preferences" },
                { href: "/pricing", title: "Pricing", desc: "Free & Pro plans" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group relative aspect-square w-39 shrink-0 rounded border border-border-low bg-card p-4 transition hover:-translate-y-0.5 hover:bg-cream/40 hover:shadow-sm"
                >
                  <div className="flex h-full flex-col justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold tracking-tight">{a.title}</div>
                      <div className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted">
                        {a.desc}
                      </div>
                    </div>
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="col-span-6 flex min-h-0 self-stretch">
            <AnimatedBentoGrid
              variant="panel"
              className="h-full min-h-full w-full"
              draggable
            />
          </div>
        </div>
      </section>
    </main>
  );
}
