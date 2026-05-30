"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useThemeNetwork } from "@/app/components/theme-network-provider";

export default function CreatorEarningsPage() {
  const { cluster } = useThemeNetwork();
  const [totalUnits, setTotalUnits] = useState<number | null>(null);
  const [items, setItems] = useState<
    { id: string; sourceSlug: string; unitsAccrued: number; createdAt: string }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/creator/earnings?cluster=${cluster}`, { credentials: "include" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error ?? "Could not load");
        setTotalUnits(j.totalUnits ?? 0);
        setItems(j.items ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [cluster]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create · Posts</p>
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
        <p className="text-muted max-w-2xl text-sm">Accrued on {cluster}.</p>
      </div>
      <Link
        href="/create/posts"
        className="inline-flex rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold transition hover:bg-cream/60"
      >
        ← Back to posts
      </Link>

      {err ? (
        <p className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">{err}</p>
      ) : totalUnits == null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="rounded border border-border-low bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Total accrued (this cluster)</p>
            <p className="mt-2 text-3xl font-semibold">{totalUnits} GP</p>
          </div>
          <div className="overflow-hidden rounded border border-border-low">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-low bg-card text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Units</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={3}>
                      No earnings yet on this cluster.
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="border-b border-border-low last:border-0">
                      <td className="px-4 py-3 text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.sourceSlug}</td>
                      <td className="px-4 py-3">{r.unitsAccrued}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
