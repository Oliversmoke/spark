"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ShimmerBlock } from "../../components/skeleton-ui";
import { useThemeNetwork } from "../../components/theme-network-provider";
import { withBasePath } from "../../components/base-path";

type TransactionFeedItem = {
  id: string;
  createdAt: string;
  cluster: "devnet" | "mainnet-beta";
  ledgerKind: string;
  units: number;
  label: string;
  reason: string | null;
  unlockId?: string | null;
  withdrawal?: {
    id: string;
    status: string;
    unitsRequested: number;
    lamportsPayout: string;
    payoutSignature: string | null;
  } | null;
};

function formatLongDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TransactionDetailClient({
  id,
}: {
  id: string;
}) {
  const { cluster: themeCluster } = useThemeNetwork();
  const [item, setItem] = useState<TransactionFeedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveCluster = useMemo(() => {
    if (typeof window === "undefined") return themeCluster;
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("cluster");
    return c === "mainnet-beta" || c === "devnet" ? c : themeCluster;
  }, [themeCluster]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/me/transactions/${encodeURIComponent(id)}?cluster=${effectiveCluster}`,
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load transaction");
        if (!cancelled) setItem((json.item ?? null) as TransactionFeedItem | null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [effectiveCluster, id]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Wallet</p>
        <h1 className="text-3xl font-semibold tracking-tight">Transaction details</h1>
        <p>
          <Link
            href={withBasePath("/transactions")}
            className="text-sm font-semibold text-foreground underline decoration-border-low"
          >
            ← Back to transactions
          </Link>
        </p>
      </header>

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div>
      ) : null}

      {loading ? (
        <div className="space-y-3 rounded border border-border-low bg-card p-5">
          <ShimmerBlock className="h-6 w-2/3" />
          <ShimmerBlock className="h-4 w-1/2" />
          <ShimmerBlock className="h-16 w-full rounded-xl" />
        </div>
      ) : !item ? (
        <div className="rounded border border-border-low bg-card p-6 text-center">
          <div className="text-base font-semibold">Transaction not found</div>
          <div className="mt-1 text-sm text-muted">It may be on a different cluster.</div>
        </div>
      ) : (
        <section className="rounded border border-border-low bg-card/70 p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="text-xl font-semibold tracking-tight">{item.label}</div>
              <div className="text-sm text-muted">
                {formatLongDate(item.createdAt)} ·{" "}
                <span className="font-semibold text-foreground">{item.cluster}</span>
              </div>
            </div>
            <div className="rounded border border-border-low bg-card px-3 py-2 font-mono text-sm font-semibold tabular-nums">
              {item.units >= 0 ? `+${item.units}` : String(item.units)} GP
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded border border-border-low bg-card px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Type</dt>
              <dd className="mt-1 font-semibold">{item.ledgerKind}</dd>
            </div>
            <div className="rounded border border-border-low bg-card px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Transaction id</dt>
              <dd className="mt-1 break-all font-mono text-xs text-muted">{item.id}</dd>
            </div>
            <div className="rounded border border-border-low bg-card px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Reason</dt>
              <dd className="mt-1 text-muted">{item.reason ?? "—"}</dd>
            </div>
          </dl>

          {item.withdrawal ? (
            <div className="mt-5 rounded border border-border-low bg-card px-4 py-4">
              <div className="text-sm font-semibold">Withdrawal</div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Status</dt>
                  <dd className="mt-1 font-semibold">{item.withdrawal.status}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Requested</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{item.withdrawal.unitsRequested} GP</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Payout signature</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-muted">
                    {item.withdrawal.payoutSignature ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

