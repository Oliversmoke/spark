"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useThemeNetwork } from "../components/theme-network-provider";

export function UnlockBox(args: {
  kind: "game" | "content";
  slug: string;
  title: string;
  priceUnits: number;
  onUnlocked?: () => void;
}) {
  const { cluster } = useThemeNetwork();
  const [balance, setBalance] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const [b, u, e] = await Promise.all([
      fetch(`/api/gamepass/balance?cluster=${cluster}`).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/api/gamepass/unlocks?cluster=${cluster}&kind=${args.kind}&slug=${encodeURIComponent(args.slug)}`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/api/subscriptions/entitled?cluster=${cluster}&kind=${args.kind}&slug=${encodeURIComponent(args.slug)}`
      ).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (b?.units != null) setBalance(Number(b.units));
    setUnlocked(Boolean(u?.unlocked));
    setEntitled(Boolean(e?.entitled));
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster, args.kind, args.slug]);

  async function unlock() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/gamepass/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, kind: args.kind, slug: args.slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Unlock failed");
      await refresh();
      args.onUnlocked?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (args.priceUnits <= 0) return null;

  const enough = balance == null ? false : balance >= args.priceUnits;
  const showEntitled = entitled === true;

  return (
    <div className="rounded border border-border-low bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">Paid {args.kind}</p>
          <p className="mt-1 text-sm text-muted">
            {showEntitled ? (
              <>
                You’re subscribed. Access <span className="font-semibold text-foreground">{args.title}</span> anytime.
              </>
            ) : (
              <>
                Unlock <span className="font-semibold text-foreground">{args.title}</span> with{" "}
                <span className="font-semibold text-foreground">{args.priceUnits} GP</span>.
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your balance</div>
          <div className="mt-1 text-lg font-semibold">{balance == null ? "—" : `${balance} GP`}</div>
        </div>
      </div>

      {showEntitled ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded bg-cream px-3 py-2 text-sm font-semibold text-foreground/80">Subscribed</div>
          <Link
            href="/wallet"
            className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
          >
            Wallet
          </Link>
        </div>
      ) : unlocked ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded bg-cream px-3 py-2 text-sm font-semibold text-foreground/80">Unlocked</div>
          <Link
            href="/wallet"
            className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
          >
            View GamePass
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => unlock()}
            disabled={busy || !enough}
            className="inline-flex items-center justify-center rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Unlocking…" : `Unlock for ${args.priceUnits} GP`}
          </button>
          {!enough ? (
            <Link
              href="/wallet"
              className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
            >
              Buy GamePass
            </Link>
          ) : null}
        </div>
      )}

      {err ? (
        <div className="mt-4 rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
          {err}
        </div>
      ) : null}
    </div>
  );
}

