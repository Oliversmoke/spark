"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  slug: string;
  title: string;
  status: string;
  format: string;
  access: string;
  purchaseMode: string;
  priceUnits: number;
  updatedAt: string;
};

export function PostsList() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creator/posts", { credentials: "include" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error ?? "Could not load");
        setItems(j.posts ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  if (err) {
    return (
      <p className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
        {err === "unauthenticated" ? "Sign in to manage posts." : err}
      </p>
    );
  }

  if (!items) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">No posts yet. Create one to get started.</p>;
  }

  return (
    <div className="overflow-hidden rounded border border-border-low">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-low bg-card text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Monetization</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3"> </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-border-low last:border-0">
              <td className="px-4 py-3 font-semibold text-foreground">{p.title}</td>
              <td className="px-4 py-3 text-muted">{p.status}</td>
              <td className="px-4 py-3 text-muted">
                {p.access === "free"
                  ? "Free"
                  : p.purchaseMode === "per_view"
                    ? `Per view · ${p.priceUnits} GP`
                    : `Unlock · ${p.priceUnits} GP`}
              </td>
              <td className="px-4 py-3 text-muted">{new Date(p.updatedAt).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/explore/content/${encodeURIComponent(p.slug)}`}
                    className="rounded border border-border-low px-2 py-1 text-xs font-semibold hover:bg-cream/60"
                  >
                    View
                  </Link>
                  {p.status !== "archived" ? (
                    <Link
                      href={`/create/posts/${p.id}/edit`}
                      className="rounded border border-border-low px-2 py-1 text-xs font-semibold hover:bg-cream/60"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
