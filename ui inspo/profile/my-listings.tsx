"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SubmissionRow = {
  id: string;
  kind: "game" | "content";
  status: "pending" | "approved" | "rejected" | "deleted";
  title: string;
  slug: string;
  summary: string;
  coverImageSrc: string;
  access: "free" | "gamepass";
  priceUnits: number;
  availableClusters: Array<"devnet" | "mainnet-beta">;
  rejectionReason: string | null;
  updatedAt: string;
};

type CreatorPostRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  format: string;
  access: "free" | "gamepass";
  purchaseMode: string;
  priceUnits: number;
  updatedAt: string;
};

function pill(status: string) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold";
  if (status === "approved" || status === "published") return `${base} bg-emerald-50 text-emerald-700`;
  if (status === "pending") return `${base} bg-amber-50 text-amber-800`;
  if (status === "rejected") return `${base} bg-rose-50 text-rose-700`;
  if (status === "draft") return `${base} bg-slate-100 text-slate-700`;
  if (status === "archived" || status === "deleted") return `${base} bg-slate-50 text-slate-500`;
  return `${base} bg-slate-100 text-slate-700`;
}

export function MyListings() {
  const [tab, setTab] = useState<"games" | "content" | "posts">("games");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [posts, setPosts] = useState<CreatorPostRow[]>([]);

  const kindFilter = useMemo(() => (tab === "games" ? "game" : tab === "content" ? "content" : null), [tab]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      if (tab === "posts") {
        const res = await fetch("/api/creator/posts?status=all", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load posts");
        setPosts(Array.isArray(json?.posts) ? (json.posts as CreatorPostRow[]) : []);
        return;
      }

      const q = new URLSearchParams();
      if (kindFilter) q.set("kind", kindFilter);
      const res = await fetch(`/api/submissions/my?${q.toString()}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load submissions");
      setSubs(Array.isArray(json?.items) ? (json.items as SubmissionRow[]) : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function deleteSubmission(id: string) {
    if (!confirm("Delete this listing?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function archivePost(id: string) {
    if (!confirm("Archive this post?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/creator/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Archive failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded border border-border-low bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">My listings</p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Manage what you’ve published</h2>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={busy}
          className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60 disabled:opacity-60"
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("games")}
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            tab === "games" ? "bg-foreground text-background" : "border border-border-low text-muted",
          ].join(" ")}
        >
          Games
        </button>
        <button
          type="button"
          onClick={() => setTab("content")}
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            tab === "content" ? "bg-foreground text-background" : "border border-border-low text-muted",
          ].join(" ")}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={[
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            tab === "posts" ? "bg-foreground text-background" : "border border-border-low text-muted",
          ].join(" ")}
        >
          Posts
        </button>
        <div className="ml-auto flex items-center gap-2">
          {tab === "posts" ? (
            <Link
              href="/create/posts/new"
              className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
            >
              New post
            </Link>
          ) : (
            <Link
              href={`/create?kind=${tab === "games" ? "game" : "content"}`}
              className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
            >
              New {tab === "games" ? "game" : "content"}
            </Link>
          )}
        </div>
      </div>

      {err ? <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div> : null}

      {tab === "posts" ? (
        <div className="overflow-hidden rounded border border-border-low">
          {posts.length === 0 ? (
            <div className="p-4 text-sm text-muted">No posts yet.</div>
          ) : (
            <ul className="divide-y divide-border-low">
              {posts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={pill(p.status)}>{p.status}</span>
                      <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                    </div>
                    <p className="truncate text-xs text-muted">/{p.slug}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/create/posts/${encodeURIComponent(p.id)}/edit`}
                      className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => archivePost(p.id)}
                      className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-60"
                    >
                      Archive
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-border-low">
          {subs.length === 0 ? (
            <div className="p-4 text-sm text-muted">No listings yet.</div>
          ) : (
            <ul className="divide-y divide-border-low">
              {subs.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={s.coverImageSrc}
                      alt=""
                      className="h-10 w-14 shrink-0 rounded border border-border-low bg-bg2 object-cover"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={pill(s.status)}>{s.status}</span>
                        <p className="truncate text-sm font-semibold text-foreground">{s.title}</p>
                      </div>
                      <p className="truncate text-xs text-muted">/{s.slug}</p>
                      {s.status === "rejected" && s.rejectionReason ? (
                        <p className="text-xs text-rose-700">Rejected: {s.rejectionReason}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/create?kind=${s.kind}&edit=${encodeURIComponent(s.id)}`}
                      className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteSubmission(s.id)}
                      className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

