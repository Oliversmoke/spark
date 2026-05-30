"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiCompass,
  FiFileText,
  FiGrid,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import {
  isAvailableOnCluster,
  type CatalogContent,
  type CatalogGame,
  type CatalogItem,
} from "@/lib/demo/catalog";

import { withBasePath } from "../components/base-path";
import { DiscoverListSkeleton } from "../components/skeleton-ui";
import { useThemeNetwork } from "../components/theme-network-provider";

const DiscoverClient = dynamic(
  () => import("../discover/discover-client").then((m) => m.DiscoverClient),
  { loading: () => <DiscoverListSkeleton /> },
);

type ExploreView = "catalog" | "people";
type TabKey = "all" | "games" | "content";
type PriceKey = "any" | "free" | "gamepass";
type GameModeKey = "any" | "built-in" | "community";

function isGame(i: CatalogItem): i is CatalogGame {
  return i.kind === "game";
}
function isContent(i: CatalogItem): i is CatalogContent {
  return i.kind === "content";
}

function shortAddr(addr: string) {
  const a = addr.trim();
  if (a.length <= 10) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function hrefFor(item: CatalogItem) {
  if (item.kind === "game") return `/explore/games/${item.slug}`;
  return `/explore/content/${item.slug}`;
}

const GAME_IMAGE_BY_SLUG: Record<string, string> = {
  // Demo/built-in catalog slugs
  "arc-runner": "/game_images/5.png",
  "solana-quiz": "/game_images/1.png",
  "creator-duel": "/game_images/8.png",

  // Built-in game ids used by /play
  "arc-runner-3d": "/game_images/5.png",
  "target-tap-3d": "/game_images/6.png",
  "ring-run-3d": "/game_images/7.png",
  "dev-sprint-quiz": "/game_images/1.png",
  "design-sprint-quiz": "/game_images/2.png",
  "cyber-sprint-quiz": "/game_images/3.png",
  "analytics-sprint-quiz": "/game_images/4.png",
};

export function ExploreClient({ items }: { items: CatalogItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: ExploreView = searchParams.get("view") === "people" ? "people" : "catalog";

  const { cluster } = useThemeNetwork();
  const [tab, setTab] = useState<TabKey>("all");
  const [price, setPrice] = useState<PriceKey>("any");
  const [gameMode, setGameMode] = useState<GameModeKey>("any");
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const baseForChips = useMemo(() => {
    let base = items.filter((i) => isAvailableOnCluster(i, cluster));
    if (tab === "games") base = base.filter(isGame);
    if (tab === "content") base = base.filter(isContent);

    if (price === "free") base = base.filter((i) => i.access === "free");
    if (price === "gamepass") base = base.filter((i) => i.access === "gamepass");

    if (gameMode !== "any") {
      base = base.filter((i) => (i.kind === "game" ? i.mode === gameMode : true));
    }

    return base;
  }, [cluster, gameMode, items, price, tab]);

  const categories = useMemo(() => {
    const freq = new Map<string, number>();
    for (const item of baseForChips) {
      for (const t of item.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([t]) => t);
    return ["All", ...top];
  }, [baseForChips]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory("All");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join("|")]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = baseForChips;

    if (category !== "All") {
      base = base.filter((i) => i.tags.includes(category));
    }

    if (!q) return base;
    return base.filter((item) => {
      const hay = [item.title, item.summary, ...item.tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [baseForChips, category, query]);

  function setExploreView(next: ExploreView) {
    if (next === "people") {
      router.replace(withBasePath("/explore?view=people"));
      return;
    }
    const q = query.trim();
    router.replace(withBasePath(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border-low pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded border border-border-low bg-card p-1">
          {(
            [
              { key: "catalog" as const, label: "Games & content" },
              { key: "people" as const, label: "Creators & leaderboard" },
            ] as const
          ).map(({ key, label }) => {
            const active = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setExploreView(key)}
                className={[
                  "rounded px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-cream text-foreground"
                    : "text-muted hover:bg-cream/60 hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {view === "people" ? (
        <DiscoverClient />
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded border border-border-low bg-card p-1">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "games", label: "Games" },
                    { key: "content", label: "Content" },
                  ] as const
                ).map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={[
                        "rounded px-3 py-2 text-sm font-semibold transition",
                        active ? "bg-cream text-foreground" : "text-muted hover:bg-cream/60 hover:text-foreground",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full items-center gap-2 sm:max-w-lg">
                <label className="sr-only" htmlFor="explore-search">
                  Search catalog
                </label>
                <input
                  id="explore-search"
                  value={query}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQuery(next);
                    const q = next.trim();
                    router.replace(withBasePath(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore"));
                  }}
                  placeholder="Search…"
                  className="h-11 w-full rounded border border-border-low bg-card px-4 text-sm font-semibold text-foreground outline-none placeholder:text-muted focus:border-border-low focus:ring-2 focus:ring-cream/70"
                />

                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={[
                    "inline-flex h-11 shrink-0 items-center gap-2 rounded border px-3 text-sm font-semibold transition",
                    filtersOpen
                      ? "border-border-low bg-cream text-foreground"
                      : "border-border-low bg-card text-muted hover:bg-cream/60 hover:text-foreground",
                  ].join(" ")}
                >
                  <FiCompass aria-hidden />
                  Filters
                </button>
              </div>
            </div>

            {filtersOpen ? (
              <div className="rounded border border-border-low bg-card p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs font-semibold text-muted">
                    <span className="inline-flex items-center gap-2">
                      <FiGrid aria-hidden />
                      Access
                    </span>
                    <select
                      value={price}
                      onChange={(e) => setPrice(e.target.value as PriceKey)}
                      className="h-10 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                    >
                      <option value="any">Any</option>
                      <option value="free">Free</option>
                      <option value="gamepass">GamePass</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-muted">
                    <span className="inline-flex items-center gap-2">
                      <FiGrid aria-hidden />
                      Source
                    </span>
                    <select
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value as GameModeKey)}
                      className="h-10 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                    >
                      <option value="any">Any</option>
                      <option value="built-in">Built-in</option>
                      <option value="community">Community</option>
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPrice("any");
                        setGameMode("any");
                        setCategory("All");
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
                    >
                      <FiZap aria-hidden />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-3 relative -mx-3 px-3">
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
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded border border-border-low bg-card p-6 text-center">
              <div className="text-base font-semibold">No results</div>
              <div className="mt-1 text-sm text-muted">Try a different search term or tab.</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((item) => (
                // Use curated /public/game_images covers for games when available.
                <Link
                  key={`${item.kind}:${item.slug}`}
                  href={hrefFor(item)}
                  className="group overflow-hidden rounded border border-border-low bg-card shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_85px_-55px_rgba(0,0,0,0.55)]"
                >
                  <div className="relative aspect-4/3 w-full bg-bg2">
                    <Image
                      src={
                        item.kind === "game"
                          ? (GAME_IMAGE_BY_SLUG[item.slug] ?? item.coverImageSrc)
                          : item.coverImageSrc
                      }
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      priority={false}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/55 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      {item.kind === "game" ? (
                        <FiGrid aria-hidden className="opacity-95" />
                      ) : (
                        <FiFileText aria-hidden className="opacity-95" />
                      )}
                      <span className="opacity-95">{item.kind === "game" ? "Game" : "Post"}</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-base font-semibold tracking-tight text-white">{item.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-sm text-white/85">{item.summary}</div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                    {item.kind === "game" ? (
                      <>
                        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                          {item.access === "free" ? "Free" : `${item.priceUnits} GP`}
                        </span>
                        <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                          {item.mode === "built-in" ? "Built-in" : "Community"}
                        </span>
                        <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                          By {shortAddr(item.creatorWalletAddress)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                          {item.access === "free" ? "Free" : `${item.priceUnits} GP`}
                        </span>
                        <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                          By {item.author}
                        </span>
                        <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                          {shortAddr(item.creatorWalletAddress)}
                        </span>
                      </>
                    )}
                    {item.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-muted">
                        {item.availableClusters.includes("devnet") ? "Devnet" : null}
                        {item.availableClusters.length === 2 ? " + " : null}
                        {item.availableClusters.includes("mainnet-beta") ? "Mainnet" : null}
                      </div>
                      <span className="text-xs font-semibold text-foreground">Open</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
