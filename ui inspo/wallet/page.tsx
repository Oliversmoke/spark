"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSolTransfer, useWalletConnection } from "@solana/react-hooks";
import { toAddress } from "@solana/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { FiCopy, FiRefreshCw } from "react-icons/fi";

import { useThemeNetwork } from "@/app/components/theme-network-provider";
import { withBasePath } from "@/app/components/base-path";

type Intent = {
  id: string;
  cluster: "devnet" | "mainnet-beta";
  treasuryWalletAddress: string;
  lamportsExpected: string;
  solExpected: string;
  unitsNet: number;
  expiresAt: string;
};

type Quote = {
  cluster: "devnet" | "mainnet-beta";
  unitsNetTarget: number;
  unitsGross: number;
  platformFeeUnits: number;
  unitsNet: number;
  solExpected: string;
  lamportsExpected: string;
};

type MySub = {
  id: string;
  planId: string;
  plan: { id: string; title: string; cadence: string; priceUnits: number } | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
};

type LedgerRow = {
  id: string;
  kind: string;
  units: number;
  reason: string | null;
  createdAt: string;
};

type WithdrawalRow = {
  id: string;
  status: string;
  unitsRequested: number;
  feeUnits: number;
  unitsNet: number;
  lamportsPayout: string;
  destinationWalletAddress: string;
  payoutSignature: string | null;
  createdAt: string;
};

function formatTxError(e: unknown) {
  if (!e || typeof e !== "object") return String(e);
  const anyE = e as any;
  const base = typeof anyE.message === "string" ? anyE.message : "Transaction failed";
  const tpr = anyE.transactionPlanResult;
  if (!tpr) return base;
  try {
    const detail =
      typeof tpr === "string"
        ? tpr
        : JSON.stringify(
            tpr,
            (_k, v) => (typeof v === "bigint" ? v.toString() : v),
            2
          );
    return `${base}\n\ntransactionPlanResult:\n${detail}`;
  } catch {
    return `${base}\n\ntransactionPlanResult: [unserializable]`;
  }
}

function shortAddr(a: string) {
  if (!a) return "—";
  if (a.length <= 12) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

export default function WalletPage() {
  const { cluster } = useThemeNetwork();
  const { wallet } = useWalletConnection();
  const solTransfer = useSolTransfer();

  const [tab, setTab] = useState<"buy" | "history" | "withdraw" | "subs">("buy");
  const [balance, setBalance] = useState<number | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [gpAmount, setGpAmount] = useState("100");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [txSignature, setTxSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [subs, setSubs] = useState<MySub[]>([]);

  const address = wallet?.account?.address?.toString?.() ?? null;
  const shortAddress = useMemo(() => (address ? shortAddr(address) : null), [address]);

  async function refresh() {
    const [b, h, w, s] = await Promise.all([
      fetch(withBasePath(`/api/gamepass/balance?cluster=${cluster}`), { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(withBasePath(`/api/gamepass/history?cluster=${cluster}`), { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(withBasePath(`/api/gamepass/withdraw/my?cluster=${cluster}`), { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(withBasePath(`/api/subscriptions/my?cluster=${cluster}`), { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null
      ),
    ]);
    if (b?.units != null) setBalance(Number(b.units));
    setLedger(Array.isArray(h?.items) ? (h.items as LedgerRow[]) : []);
    setWithdrawals(Array.isArray(w?.items) ? (w.items as WithdrawalRow[]) : []);
    setSubs(Array.isArray(s?.items) ? (s.items as MySub[]) : []);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster]);

  const gpHelp = useMemo(() => {
    const n = Number(gpAmount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  }, [gpAmount]);

  async function refreshQuote(unitsNet: number) {
    const res = await fetch(withBasePath(`/api/gamepass/quote?cluster=${cluster}&unitsNet=${unitsNet}`), {
      credentials: "include",
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error ?? "quote_failed");
    setQuote(j.quote as Quote);
  }

  useEffect(() => {
    if (!gpHelp) {
      setQuote(null);
      return;
    }
    refreshQuote(gpHelp).catch(() => setQuote(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster, gpHelp]);

  async function createIntent(): Promise<Intent> {
    try {
      const q = quote;
      if (!q) throw new Error("Missing quote");
      const n = Number(q.solExpected);
      const res = await fetch(withBasePath("/api/gamepass/buy-intent"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, solAmount: n }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Could not create intent");
      const next = j.intent as Intent;
      setIntent(next);
      setTxSignature("");
      return next;
    } catch (e) {
      throw e;
    }
  }

  async function buyAndCredit() {
    if (!address) {
      setMsg("Your wallet connector must support sending transactions to buy in-app.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const nextIntent = await createIntent();
      setMsg(`Approve ${nextIntent.solExpected} SOL to buy +${nextIntent.unitsNet} GP…`);

      const lamports = BigInt(nextIntent.lamportsExpected);
      if (lamports <= BigInt(0)) throw new Error("Invalid lamports");
      const sig = await solTransfer.send(
        { amount: lamports, destination: toAddress(nextIntent.treasuryWalletAddress) },
        { commitment: "confirmed" }
      );
      setTxSignature(String(sig));

      const res = await fetch(withBasePath("/api/gamepass/confirm"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intentId: nextIntent.id, signature: sig }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Confirm failed");

      setMsg(`Purchased: +${j.unitsCredited ?? nextIntent.unitsNet} GP`);
      setIntent(null);
      setTxSignature("");
      await refresh();
    } catch (e) {
      setMsg(formatTxError(e));
    } finally {
      setBusy(false);
    }
  }

  const [withdrawUnits, setWithdrawUnits] = useState("100");
  const [withdrawTo, setWithdrawTo] = useState("");

  async function requestWithdraw() {
    setBusy(true);
    setMsg(null);
    try {
      const unitsRequested = Number(withdrawUnits);
      const res = await fetch("/api/gamepass/withdraw/request", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cluster,
          unitsRequested,
          destinationWalletAddress: withdrawTo.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Withdraw request failed");
      setMsg(`Withdrawal requested: ${j.request?.status ?? "requested"}`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelSub(planId: string, immediate: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, planId, immediate }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Cancel failed");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Wallet</p>
        <h1 className="text-3xl font-semibold tracking-tight">GamePass</h1>
        <p className="text-sm text-muted">Balance, funding, activity, withdrawals, and subscriptions.</p>
      </header>

      <section className="rounded border border-border-low bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Address</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-border-low bg-card px-2 py-1 font-mono text-sm">
                {shortAddress ?? "—"}
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
              <button
                type="button"
                onClick={() => refresh().catch(() => {})}
                disabled={busy}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-low bg-card/60 text-foreground transition hover:bg-cream/60 disabled:opacity-60"
                aria-label="Refresh"
                title="Refresh"
              >
                <FiRefreshCw aria-hidden className={busy ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="text-xs font-semibold text-muted">{cluster}</div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Balance</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{balance == null ? "—" : `${balance} GP`}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              { key: "buy" as const, label: "Buy" },
              { key: "history" as const, label: "History" },
              { key: "withdraw" as const, label: "Withdraw" },
              { key: "subs" as const, label: "Subscriptions" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "rounded px-3 py-2 text-sm font-semibold transition",
                tab === t.key ? "bg-cream text-foreground" : "border border-border-low bg-card text-muted hover:bg-cream/60 hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg ? (
          <div className="mt-4 rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">{msg}</div>
        ) : null}
      </section>

      {tab === "buy" ? (
        <section className="rounded border border-border-low bg-card p-6 space-y-4">
          <div className="text-sm font-semibold">Buy GamePass</div>
          <div className="rounded border border-border-low bg-bg2/30 px-4 py-3 text-sm text-muted">
            Confirm in Phantom on <span className="font-semibold text-foreground">{cluster}</span>.
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">GamePass amount (GP)</div>
              <input
                value={gpAmount}
                onChange={(e) => setGpAmount(e.target.value)}
                inputMode="numeric"
                className="h-11 w-40 rounded border border-border-low bg-bg1 px-3 font-mono text-sm"
                disabled={busy}
              />
            </label>
            <button
              type="button"
              disabled={busy || !gpHelp || !quote}
              onClick={() => buyAndCredit()}
              className="h-11 rounded bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              Buy & credit
            </button>
          </div>

          {quote ? (
            <div className="rounded border border-border-low bg-bg2/30 p-4 text-sm text-muted space-y-1">
              <div>
                Cost: <span className="font-semibold text-foreground">{quote.solExpected} SOL</span> →
                <span className="font-semibold text-foreground"> +{quote.unitsNet} GP</span>
              </div>
              <div className="text-xs text-muted">
                Gross: {quote.unitsGross} GP · Platform fee: {quote.platformFeeUnits} GP · Net credited: {quote.unitsNet} GP
              </div>
            </div>
          ) : (
            <div className="rounded border border-border-low bg-bg2/30 p-4 text-sm text-muted">
              Enter a GP amount to see the SOL cost before buying.
            </div>
          )}

          <div className="rounded border border-border-low bg-bg2/30 p-4 text-sm text-muted">
            You’ll be prompted in your wallet to approve the SOL transfer, then your GamePass balance will update
            automatically after confirmation.
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="rounded border border-border-low bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">GamePass history ({cluster})</div>
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh().catch(() => {})}
              className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
            >
              Refresh
            </button>
          </div>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted">No ledger entries yet.</p>
          ) : (
            <div className="divide-y divide-border-low">
              {ledger.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{r.kind}</div>
                    <div className="mt-1 text-xs text-muted">{r.reason ?? "—"}</div>
                    <div className="mt-1 text-[11px] text-muted">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                    {r.units > 0 ? "+" : ""}
                    {r.units} GP
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "withdraw" ? (
        <section className="space-y-4">
          <div className="rounded border border-border-low bg-card p-6 space-y-3">
            <div className="text-sm font-semibold">Request withdrawal</div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Units (GP)</div>
                <input
                  value={withdrawUnits}
                  onChange={(e) => setWithdrawUnits(e.target.value)}
                  inputMode="numeric"
                  className="h-11 w-40 rounded border border-border-low bg-bg1 px-3 font-mono text-sm"
                  disabled={busy}
                />
              </label>
              <label className="flex-1 space-y-1 text-sm min-w-60">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Destination (optional)</div>
                <input
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                  className="h-11 w-full rounded border border-border-low bg-bg1 px-3 font-mono text-sm"
                  placeholder="Defaults to your session wallet"
                  disabled={busy}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => requestWithdraw()}
                className="h-11 rounded bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
              >
                Request
              </button>
            </div>
            <p className="text-xs text-muted">
              Withdrawals may auto-pay or require manual review depending on platform policy.
            </p>
          </div>

          <div className="rounded border border-border-low bg-card p-6 space-y-4">
            <div className="text-sm font-semibold">Your withdrawal requests ({cluster})</div>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted">No withdrawals yet.</p>
            ) : (
              <div className="divide-y divide-border-low">
                {withdrawals.map((w) => (
                  <div key={w.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold">{w.status.toUpperCase()}</div>
                      <div className="text-xs text-muted">{new Date(w.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {w.unitsRequested} GP → net {w.unitsNet} GP · fee {w.feeUnits} GP
                    </div>
                    <div className="mt-1 text-xs text-muted break-all">
                      to {w.destinationWalletAddress}
                      {w.payoutSignature ? ` · payout ${w.payoutSignature}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "subs" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Your subscriptions ({cluster})</h2>
            <Link
              href="/explore"
              className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60 hover:text-foreground"
            >
              Explore
            </Link>
          </div>

          <div className="divide-y divide-border-low rounded border border-border-low bg-card">
            {subs.map((s) => (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{s.plan?.title ?? s.planId}</div>
                  <div className="text-xs text-muted">
                    {s.status}
                    {s.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    Ends {new Date(s.currentPeriodEnd).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status !== "canceled" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cancelSub(s.planId, false)}
                        className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
                      >
                        Cancel at period end
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cancelSub(s.planId, true)}
                        className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
                      >
                        Cancel now
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {subs.length === 0 ? <p className="p-4 text-sm text-muted">No subscriptions on this network.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

