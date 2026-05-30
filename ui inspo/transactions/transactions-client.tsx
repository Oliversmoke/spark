"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";

import { useThemeNetwork } from "../components/theme-network-provider";
import { ShimmerBlock } from "../components/skeleton-ui";
import { withBasePath } from "../components/base-path";

type TransactionFeedItem = {
  id: string;
  createdAt: string;
  cluster: "devnet" | "mainnet-beta";
  ledgerKind: string;
  units: number;
  label: string;
  reason: string | null;
};

function formatCompactDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateLabel(s: string, max = 72) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function TransactionsClient() {
  const { cluster } = useThemeNetwork();
  const [items, setItems] = useState<TransactionFeedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const header = useMemo(() => {
    return cluster === "mainnet-beta" ? "Mainnet activity" : "Devnet activity";
  }, [cluster]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/me/transactions?cluster=${cluster}&limit=200`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setItems(Array.isArray(json.items) ? (json.items as TransactionFeedItem[]) : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-muted">{header}</div>
          <div className="text-xs text-muted">
            Showing up to <span className="font-semibold text-foreground">200</span> most recent items.
          </div>
        </div>

        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded border border-border-low bg-card px-3 py-2 text-sm font-semibold hover:bg-cream/60 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div>
      ) : null}

      {items == null ? (
        <div className="space-y-2">
          <ShimmerBlock className="h-14 w-full rounded-xl" />
          <ShimmerBlock className="h-14 w-full rounded-xl" />
          <ShimmerBlock className="h-14 w-full rounded-xl" />
          <ShimmerBlock className="h-14 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border border-border-low bg-card p-6 text-center">
          <div className="text-base font-semibold">No transactions yet</div>
          <div className="mt-1 text-sm text-muted">Buy GamePass, play games, or unlock content to see activity.</div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const href = withBasePath(`/transactions/${encodeURIComponent(t.id)}?cluster=${t.cluster}`);
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  className="group flex items-center justify-between gap-4 rounded border border-border-low bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:bg-cream/40 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{truncateLabel(t.label)}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {formatCompactDate(t.createdAt)} · {t.cluster}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "shrink-0 font-mono text-sm font-semibold tabular-nums",
                        t.units >= 0 ? "text-foreground" : "text-muted",
                      ].join(" ")}
                      title={t.ledgerKind}
                    >
                      {t.units >= 0 ? `+${t.units}` : String(t.units)} GP
                    </div>
                    <FiArrowRight
                      aria-hidden
                      className="shrink-0 text-muted transition group-hover:text-foreground"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

