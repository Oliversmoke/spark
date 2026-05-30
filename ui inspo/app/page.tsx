"use client";

import Link from "next/link";
import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useWalletConnection } from "@solana/react-hooks";
import {
  FiArrowRight,
  FiCopy,
  FiCreditCard,
  FiEdit3,
  FiFileText,
  FiRefreshCw,
  FiTrendingUp,
} from "react-icons/fi";

import { authStore } from "../components/auth-store";
import { ShimmerBlock } from "../components/skeleton-ui";
import { useThemeNetwork } from "../components/theme-network-provider";

function stringifyError(err: unknown) {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function truncateMiddle(addr: string, headChars = 4, tailChars = 4) {
  const a = addr.trim();
  if (a.length <= headChars + tailChars + 1) return a;
  return `${a.slice(0, headChars)}…${a.slice(-tailChars)}`;
}

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

export default function AppHome() {
  const me = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => null,
  );
  const { cluster } = useThemeNetwork();
  const { wallet, status } = useWalletConnection();

  const address =
    wallet?.account?.address?.toString() ?? me?.walletAddress ?? null;

  const [balanceUnits, setBalanceUnits] = useState<number | null>(null);
  const [feed, setFeed] = useState<TransactionFeedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const connectError = useMemo(() => stringifyError(err), [err]);
  const shortAddress = useMemo(
    () => (address ? truncateMiddle(address, 4, 4) : null),
    [address],
  );

  async function refresh() {
    setLoading(true);
    setErr(null);
    setBalanceUnits(null);
    setFeed(null);
    try {
      const [b, tx] = await Promise.all([
        fetch(`/api/gamepass/balance?cluster=${cluster}`).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/me/transactions?cluster=${cluster}&limit=20`).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      setBalanceUnits(b?.units != null ? Number(b.units) : null);
      setFeed(
        Array.isArray(tx?.items) ? (tx.items as TransactionFeedItem[]) : [],
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }

  // Load on entry (and on cluster switch). Use a timer to avoid
  // synchronous setState inside the effect body (lint rule).
  useEffect(() => {
    const t = window.setTimeout(() => {
      refresh().catch(() => {});
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Welcome Home</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {me?.displayName?.trim() ? `${me.displayName.trim()} 👋` : "Stranger 👋"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Quick actions, wallet balance, and recent activity on{" "}
              <span className="font-semibold text-foreground">{cluster}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-low bg-card/60 text-foreground transition hover:bg-cream/60 disabled:opacity-60"
            aria-label="Refresh"
            title="Refresh"
          >
            <FiRefreshCw
              className={loading ? "animate-spin" : ""}
              aria-hidden
            />
          </button>
        </div>
      </header>

      {connectError ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
          <span className="font-semibold text-foreground">Error:</span>{" "}
          {connectError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-border-low bg-card/70 p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted">Balance</p>
              <p className="text-xs font-semibold text-muted">GamePass (GP)</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
                {cluster}
              </span>
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
                {status === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {balanceUnits == null ? (
                <ShimmerBlock className="h-10 w-32 rounded-xl" />
              ) : (
                <div className="text-4xl font-semibold tracking-tight tabular-nums">
                  {balanceUnits} GP
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded border border-border-low bg-card px-2 py-1 font-mono">
                  {shortAddress ?? "No wallet"}
                </span>
                {address ? (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(address).catch(() => {})}
                    className="inline-flex items-center gap-1 rounded border border-border-low bg-card px-2 py-1 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
                    title="Copy address"
                  >
                    <FiCopy aria-hidden />
                    Copy
                  </button>
                ) : null}
              </div>
            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/wallet"
              className="inline-flex items-center justify-center gap-2 rounded border border-border-low bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
            >
              <FiCreditCard aria-hidden /> Buy GP
            </Link>
            <Link
              href="/transactions"
              className="inline-flex items-center justify-center gap-2 rounded border border-border-low bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
            >
              <FiTrendingUp aria-hidden /> Activity
            </Link>
          </div>
        </div>

        <div className="rounded border border-border-low bg-card/70 p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted">Actions</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                { href: "/create?kind=game", label: "Create game", Icon: FiEdit3 },
                { href: "/create/posts/new", label: "Create post", Icon: FiFileText },
                { href: "/wallet", label: "Buy GP", Icon: FiCreditCard },
                { href: "/transactions", label: "Transactions", Icon: FiTrendingUp },
              ] as const
            ).map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between gap-3 rounded border border-border-low bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-cream/40 hover:shadow-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon
                    aria-hidden
                    className="text-base text-muted transition group-hover:text-foreground"
                  />
                  {label}
                </span>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded border border-border-low bg-card/70 p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted">Recent activity</p>
            <p className="text-xl font-semibold tracking-tight">Transactions</p>
          </div>
          <Link
            href="/transactions"
            className="text-sm font-semibold text-foreground underline decoration-border-low"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {feed == null ? (
            <div className="space-y-2">
              <ShimmerBlock className="h-12 w-full rounded-xl" />
              <ShimmerBlock className="h-12 w-full rounded-xl" />
              <ShimmerBlock className="h-12 w-full rounded-xl" />
            </div>
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted">
              No activity yet. Buy GamePass or play a game to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {feed.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/transactions/${encodeURIComponent(item.id)}?cluster=${item.cluster}`}
                    className="flex items-center justify-between gap-3 rounded border border-border-low bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:bg-cream/40 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {formatCompactDate(item.createdAt)} · {item.cluster}
                      </div>
                    </div>
                    <div
                      className={[
                        "shrink-0 font-mono text-sm font-semibold tabular-nums",
                        item.units >= 0 ? "text-foreground" : "text-muted",
                      ].join(" ")}
                      title={item.ledgerKind}
                    >
                      {item.units >= 0 ? `+${item.units}` : String(item.units)}{" "}
                      GP
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
