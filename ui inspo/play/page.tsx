"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GiConsoleController } from "react-icons/gi";
import { BUILT_IN_GAMES } from "@/lib/games/config";

const GAME_COVERS: Record<
  string,
  { src: string; tags: string[] }
> = {
  "arc-runner-3d": {
    src: "/game_images/5.png",
    tags: ["arcade", "runner", "reflex"],
  },
  "target-tap-3d": {
    src: "/game_images/6.png",
    tags: ["aim", "speed", "precision"],
  },
  "ring-run-3d": {
    src: "/game_images/7.png",
    tags: ["skill", "timing", "clean"],
  },
  "dev-sprint-quiz": {
    src: "/game_images/1.png",
    tags: ["quiz", "dev", "trivia"],
  },
  "design-sprint-quiz": {
    src: "/game_images/2.png",
    tags: ["quiz", "ux", "design"],
  },
  "cyber-sprint-quiz": {
    src: "/game_images/3.png",
    tags: ["quiz", "security", "infosec"],
  },
  "analytics-sprint-quiz": {
    src: "/game_images/4.png",
    tags: ["quiz", "data", "analytics"],
  },
};

const QUIZ_IDS = new Set([
  "dev-sprint-quiz",
  "design-sprint-quiz",
  "cyber-sprint-quiz",
  "analytics-sprint-quiz",
]);

export default function PlayPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const freq = new Map<string, number>();
    for (const g of BUILT_IN_GAMES) {
      const tags = GAME_COVERS[g.id]?.tags ?? [];
      for (const t of tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([t]) => t);
    return ["All", ...top];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = BUILT_IN_GAMES.filter((g) => {
      const meta = GAME_COVERS[g.id];
      const tags = meta?.tags ?? [];
      if (category !== "All" && !tags.includes(category)) return false;
      if (!q) return true;
      const hay = [g.title, g.summary, ...tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
    rows.sort((a, b) => {
      const aq = QUIZ_IDS.has(a.id);
      const bq = QUIZ_IDS.has(b.id);
      if (aq !== bq) return aq ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
    return rows;
  }, [category, query]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Play</p>
        <h1 className="text-3xl font-semibold tracking-tight">Built-in games</h1>
        <p className="text-sm text-muted">Pick a game and jump in.</p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {/* <p className="text-sm text-muted">
              Pick a vibe, search, then jump in.
            </p> */}
            <div className="relative -mx-4 px-4">
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((c) => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={[
                        "snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "border-border-low bg-cream text-foreground"
                          : "border-border-low bg-card text-muted hover:bg-cream/60 hover:text-foreground",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-full sm:max-w-sm">
            <label className="sr-only" htmlFor="play-search">
              Search built-in games
            </label>
            <input
              id="play-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games…"
              className="h-11 w-full rounded border border-border-low bg-card px-4 text-sm font-semibold text-foreground outline-none placeholder:text-muted focus:border-border-low focus:ring-2 focus:ring-cream/70"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded border border-border-low bg-card p-6 text-center">
            <div className="text-base font-semibold">No results</div>
            <div className="mt-1 text-sm text-muted">
              Try a different category or search term.
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((g) => {
          const meta = GAME_COVERS[g.id];
          return (
            <Link
              key={g.id}
              href={`/play/${g.id}`}
              className="group overflow-hidden rounded border border-border-low bg-card shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_85px_-55px_rgba(0,0,0,0.55)]"
            >
              <div className="relative aspect-4/3 w-full bg-bg2">
                {meta ? (
                  <>
                    <Image
                      src={meta.src}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      priority={false}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/55 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      <GiConsoleController aria-hidden className="opacity-95" />
                      <span className="opacity-95">Built-in</span>
                    </div>
                  </>
                ) : null}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-base font-semibold tracking-tight text-white">
                    {g.title}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-sm text-white/85">
                    {g.summary}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                    Stake {g.minStakeUnits}–{g.maxStakeUnits.toLocaleString()} GP
                  </span>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                    {g.id === "dev-sprint-quiz" ||
                    g.id === "design-sprint-quiz" ||
                    g.id === "cyber-sprint-quiz" ||
                    g.id === "analytics-sprint-quiz"
                      ? "20 questions · 1 min · up to 1.4× stake"
                      : `Rewards scale · cap ~${g.maxRewardUnits} GP @ min stake`}
                  </span>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                    {g.availableClusters.includes("devnet") ? "Devnet" : null}
                    {g.availableClusters.length === 2 ? " + " : null}
                    {g.availableClusters.includes("mainnet-beta")
                      ? "Mainnet"
                      : null}
                  </span>
                  {meta?.tags?.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">
                    Play & earn
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    Open
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
