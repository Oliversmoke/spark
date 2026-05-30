"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { SettingsBar } from "./components/settings-bar";
import { authStore } from "./components/auth-store";
import { ShimmerBlock } from "./components/skeleton-ui";
import { withBasePath } from "./components/base-path";

const MemojiMarquee = dynamic(
  () => import("./components/memoji-marquee").then((m) => m.MemojiMarquee),
  {
    loading: () => (
      <div className="h-32 w-full overflow-hidden rounded-lg bg-card/60 md:min-h-0 md:flex-1">
        <div className="arc-shimmer h-full min-h-32 w-full rounded-lg md:min-h-0" />
      </div>
    ),
  },
);

const FeatureSlider = dynamic(
  () => import("./components/feature-slider").then((m) => m.FeatureSlider),
  {
    loading: () => (
      <div className="h-44 w-full rounded-xl border border-border-low bg-card/60 md:h-52">
        <div className="arc-shimmer h-full w-full rounded-xl" />
      </div>
    ),
  },
);

const GetStarted = dynamic(
  () => import("./components/get-started").then((m) => m.GetStarted),
  {
    loading: () => (
      <ShimmerBlock className="h-14 w-full max-w-md rounded-2xl" />
    ),
  },
);

const MEMOJI_IMAGES = [
  "/memojis_safe/Ellipse_133.png",
  "/memojis_safe/Ellipse_134.png",
  "/memojis_safe/Ellipse_135.png",
  "/memojis_safe/Ellipse_136.png",
  "/memojis_safe/Ellipse_137.png",
  "/memojis_safe/Ellipse_138.png",
  "/memojis_safe/Ellipse_139.png",
  "/memojis_safe/Ellipse_140.png",
  "/memojis_safe/Ellipse_141.png",
  "/memojis_safe/Ellipse_142.png",
  "/memojis_safe/Ellipse_143.png",
  "/memojis_safe/Ellipse_144.png",
  "/memojis_safe/Ellipse_145.png",
  "/memojis_safe/Ellipse_146.png",
  "/memojis_safe/Ellipse_147.png",
  "/memojis_safe/Ellipse_148.png",
  "/memojis_safe/Ellipse_149.png",
  "/memojis_safe/Ellipse_150.png",
  "/memojis_safe/Ellipse_151.png",
  "/memojis_safe/Ellipse_152.png",
  "/memojis_safe/Ellipse_153.png",
  "/memojis_safe/Ellipse_154.png",
  "/memojis_safe/Ellipse_155.png",
  "/memojis_safe/Ellipse_156.png",
  "/memojis_safe/Ellipse_157.png",
  "/memojis_safe/Ellipse_158.png",
  "/memojis_safe/Ellipse_159.png",
  "/memojis_safe/Ellipse_160.png",
  "/memojis_safe/Ellipse_161.png",
  "/memojis_safe/Ellipse_162.png",
  "/memojis_safe/Ellipse_163.png",
  "/memojis_safe/Ellipse_164.png",
  "/memojis_safe/Ellipse_165.png",
  "/memojis_safe/Ellipse_166.png",
  "/memojis_safe/Ellipse_167.png",
  "/memojis_safe/Ellipse_168.png",
  "/memojis_safe/Ellipse_169.png",
  "/memojis_safe/Ellipse_170.png",
  "/memojis_safe/Ellipse_171.png",
  "/memojis_safe/Ellipse_172.png",
  "/memojis_safe/Ellipse_173.png",
  "/memojis_safe/Ellipse_174.png",
  "/memojis_safe/Ellipse_175.png",
  "/memojis_safe/Ellipse_176.png",
];

const FEATURE_SLIDES = [
  {
    title: "Connect your wallet. You’re signed in.",
    subtitle: "Connect your Solana wallet.\nSIWS signs you in automatically.",
  },
  {
    title: "Play games with GamePass.",
    subtitle: "Spend GamePass to enter paid games.\nWin to earn more rewards.",
  },
  {
    title: "Creators and devs get rewarded.",
    subtitle:
      "Discover community games and content.\nPaid plays can share revenue.",
  },
] as const;

function RotatingWord() {
  const words = useMemo(() => ["Play", "Create", "Earn"] as const, []);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => setI((v) => (v + 1) % words.length),
      2200,
    );
    return () => window.clearInterval(t);
  }, [words.length]);

  return (
    <span key={i} className="inline-block animate-[arc-fade_300ms_ease-out]">
      {words[i]}
      <span className="text-foreground"> on Solana.</span>
    </span>
  );
}

export default function LandingAuth() {
  const router = useRouter();
  const me = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => null,
  );

  // If already signed in, send them into the app.
  useEffect(() => {
    if (me) router.replace(withBasePath("/app"));
  }, [me, router]);

  // Best-effort: if session cookie exists, hydrate it.
  useEffect(() => {
    authStore.refresh().catch(() => {});
  }, []);

  return (
    <main className="min-h-dvh bg-bg1 text-foreground">
      {/* Mobile app-like auth splash */}
      <section className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-10 md:hidden">
        <div className="absolute top-6 right-6 left-6 flex justify-end">
          <div className="w-full max-w-md">
            <SettingsBar />
          </div>
        </div>

        <div className="mt-4 grid place-items-center">
          <div className="relative h-16 w-16 overflow-hidden rounded border border-border-low bg-card shadow-[0_30px_90px_-60px_rgba(0,0,0,0.6)]">
            <Image
              src="/9tharclogo.png"
              alt="9thArc"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">9thArc</h1>
          <p className="mt-2 text-base text-muted">
            Connect a Solana wallet to continue.
          </p>
        </div>

        <div className="mt-6 w-full">
          <MemojiMarquee images={MEMOJI_IMAGES} rows={4} sizePx={58} />
        </div>

        <div className="mt-6 w-full">
          <FeatureSlider
            slides={[...FEATURE_SLIDES]}
            autoPlay={false}
            swipeable
            variant="plain"
            dotSize={6}
            className="select-none"
          />
        </div>

        <div className="mt-6 w-full max-w-md self-center">
          <GetStarted />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          If your browser doesn’t discover wallets, use “Open in
          Phantom/Solflare/Backpack” in the wallet picker.
        </p>
      </section>

      {/* Desktop web landing + auth */}
      <section className="mx-auto hidden max-w-6xl px-6 py-14 md:block">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded border border-border-low bg-card">
              <Image
                src="/9tharclogo.png"
                alt="9thArc"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* <div className="leading-tight">
              <div className="text-sm font-semibold">9thArc</div>
            </div> */}
          </div>
          <SettingsBar />
        </header>

        <div className="mt-12 grid grid-cols-12 items-stretch gap-10">
          <div className="col-span-6 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              9thArc
            </p>
            <h1
              className="font-semibold tracking-tight leading-[1.05] animate-[arc-fade_650ms_ease-out]"
              style={{ fontSize: "clamp(2.2rem, 3.1vw, 3.4rem)" }}
            >
              <RotatingWord />
              <span className="block text-muted">
                Where gamers and creators get rewards.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted">
              Connect a Solana wallet to sign in (SIWS), then play games,
              discover content, and manage your in-app wallet.
            </p>

            <div className="pt-2">
              <GetStarted />
            </div>

            <p className="text-xs text-muted">
              Mobile tip: if wallets don’t appear in Safari/Chrome, use the
              “Open in …” buttons in the picker.
            </p>

            <div className="">
              {/* <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Quick actions
              </p> */}
              <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  {
                    href: "/wallet",
                    title: "Wallet",
                    desc: "Buy GP, view history, withdraw",
                  },
                  {
                    href: "/play",
                    title: "Play",
                    desc: "Earn rewards and rank up",
                  },
                  {
                    href: "/explore",
                    title: "Explore",
                    desc: "Games, content, creators & rankings",
                  },
                  {
                    href: "/explore?view=people",
                    title: "Creators",
                    desc: "Leaderboard & public profiles",
                  },
                  {
                    href: "/create",
                    title: "Create",
                    desc: "Post or submit content",
                  },
                  {
                    href: "/appeals",
                    title: "Appeals",
                    desc: "Disputes & account review",
                  },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group relative aspect-square w-39 shrink-0 rounded border border-border-low bg-card p-4 transition hover:-translate-y-0.5 hover:bg-cream/40 hover:shadow-sm"
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold tracking-tight">
                          {a.title}
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-muted line-clamp-3">
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
          </div>

          <div className="col-span-6 flex min-h-0 self-stretch">
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded border border-border-low bg-card p-6 shadow-[0_30px_120px_-80px_rgba(0,0,0,0.55)]">
              <MemojiMarquee images={MEMOJI_IMAGES} rows={9} sizePx={50} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
