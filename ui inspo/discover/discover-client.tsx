"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useThemeNetwork } from "@/app/components/theme-network-provider";

type Row = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  compositeScore: number;
  globalRank: number;
  sessionsPlayed: number;
  wins: number;
  leaderboardGames: number;
  approvedSubmissions: number;
  approvedGames: number;
  approvedContent: number;
  publishedPosts: number;
  profilePath: string | null;
};

type SortKey = "rank" | "wins" | "sessions" | "published";

export function DiscoverClient() {
  const { cluster } = useThemeNetwork();
  const [sort, setSort] = useState<SortKey>("rank");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(24);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        cluster,
        sort,
        page: String(page),
        limit: String(limit),
      });
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/discover/members?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setRows(Array.isArray(json.items) ? json.items : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
      setCapped(Boolean(json.cappedMerge));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cluster, sort, page, q, limit]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="block min-w-[200px] flex-1 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Search</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") load().catch(() => {});
            }}
            placeholder="Name or @username"
            className="w-full rounded border border-border-low bg-card px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "rank" as const, label: "Leaderboard score" },
              { key: "wins" as const, label: "Wins" },
              { key: "sessions" as const, label: "Sessions" },
              { key: "published" as const, label: "Published" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSort(s.key);
                setPage(1);
              }}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                sort === s.key
                  ? "bg-foreground text-background"
                  : "border border-border-low bg-card text-muted hover:bg-cream/60",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold hover:bg-cream/60"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      <p className="text-xs text-muted">
        Network: <span className="font-semibold text-foreground">{cluster}</span> · Stats are per cluster (leaderboard
        &amp; sessions). Only <span className="font-semibold">public</span> profiles with creator or developer role.
      </p>

      {capped ? (
        <p className="text-xs text-muted">
          Long search results are capped for performance; refine your search to see everyone.
        </p>
      ) : null}

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-muted">No creators or developers match.</p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.userId}>
            <article className="flex flex-wrap items-start gap-4 rounded border border-border-low bg-card p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border-low bg-bg2">
                {r.avatarUrl ? (
                  <Image src={r.avatarUrl} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-bold text-muted">
                    {(r.displayName || r.username || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded bg-cream px-2 py-0.5 text-xs font-bold text-foreground/80">
                    #{r.globalRank}
                  </span>
                  <h2 className="text-lg font-semibold leading-tight">
                    {r.displayName || (r.username ? `@${r.username}` : "Creator")}
                  </h2>
                  {r.username ? (
                    <span className="text-sm text-muted">@{r.username}</span>
                  ) : (
                    <span className="font-mono text-xs text-muted">{r.userId.slice(-8)}…</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.roles
                    .filter((x) => x === "creator" || x === "developer")
                    .map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-border-low px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
                      >
                        {role}
                      </span>
                    ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">LB score</dt>
                    <dd className="font-semibold tabular-nums">{r.compositeScore}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Games on LB</dt>
                    <dd className="font-semibold tabular-nums">{r.leaderboardGames}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sessions</dt>
                    <dd className="font-semibold tabular-nums">{r.sessionsPlayed}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Wins</dt>
                    <dd className="font-semibold tabular-nums">{r.wins}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Published games</dt>
                    <dd className="font-semibold tabular-nums">{r.approvedGames}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Catalog content (approved)</dt>
                    <dd className="font-semibold tabular-nums">{r.approvedContent}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Approved subs</dt>
                    <dd className="font-semibold tabular-nums">{r.approvedSubmissions}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Creator posts</dt>
                    <dd className="font-semibold tabular-nums">{r.publishedPosts}</dd>
                  </div>
                </dl>
                {r.profilePath ? (
                  <Link
                    href={r.profilePath}
                    className="inline-block text-sm font-semibold text-foreground underline decoration-border-low"
                  >
                    View profile
                  </Link>
                ) : (
                  <p className="text-xs text-muted">Set a username to get a public profile link.</p>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-low pt-4">
          <p className="text-sm text-muted">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-border-low px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border-low px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
