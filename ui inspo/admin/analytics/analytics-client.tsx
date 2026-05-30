"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Overview = {
  range: { since: string; until: string; cluster: string; maxRangeDays: number };
  funnel: {
    newAccounts: number;
    newAccountsByDay: { day: string; count: number }[];
    distinctUsersLedger: number;
    purchaseLines: number;
    gpCreditedFromPurchases: number;
    sessionsStarted: number;
    sessionsSubmitted: number;
    sessionsWithReward: number;
    unlockEvents: number;
    withdrawalRequestsCreated: number;
    withdrawalsPaid: number;
    returningPlayers: number;
  };
  economy: {
    gpPurchaseCredits: number;
    gpDebitSpend: number;
    gpRewardCredits: number;
    gpRefundCredits: number;
    creatorAccruedGp: number;
    platformAccruedGp: number;
    gpWithdrawalReservedOrPaid: number;
    payoutVelocity: {
      paidInRange: number;
      pendingOutstanding: number;
      pendingOpenedInRange: number;
      failed: number;
      medianHoursRequestToPaid: number | null;
    };
  };
  safety: {
    bannedUsersTotal: number;
    statusChangeEvents: number;
    refundLedgerLines: number;
    highFrequencyWithdrawals: { userId: string; walletAddress: string; requestCount: number }[];
    topDebitUsers: { userId: string; walletAddress: string; debitGp: number }[];
  };
  notes?: { funnel?: string; safety?: string };
};

type Tab = "funnel" | "economy" | "safety";

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums">{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg2">
        <div className="h-full rounded-full bg-foreground/80 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsClient() {
  const [cluster, setCluster] = useState<"devnet" | "mainnet-beta">("devnet");
  const [since, setSince] = useState(() => {
    const u = new Date();
    const s = new Date(u.getTime() - 30 * 24 * 60 * 60 * 1000);
    return s.toISOString().slice(0, 10);
  });
  const [until, setUntil] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<Tab>("funnel");
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sinceIso = new Date(since + "T00:00:00.000Z").toISOString();
      const untilIso = new Date(until + "T23:59:59.999Z").toISOString();
      const res = await fetch(
        `/api/admin/analytics/overview?cluster=${cluster}&since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(untilIso)}`,
        { credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load analytics");
      setData(json as Overview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cluster, since, until]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const funnelMax = useMemo(() => {
    if (!data) return 1;
    const f = data.funnel;
    return Math.max(
      f.newAccounts,
      f.distinctUsersLedger,
      f.purchaseLines,
      f.sessionsStarted,
      f.sessionsSubmitted,
      f.sessionsWithReward,
      f.unlockEvents,
      f.withdrawalRequestsCreated,
      f.withdrawalsPaid,
      f.returningPlayers,
      1
    );
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted underline decoration-border-low hover:text-foreground"
        >
          ← Operations
        </Link>
        <button
          type="button"
          disabled={loading}
          onClick={() => load()}
          className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded border border-border-low bg-card p-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Cluster
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value as "devnet" | "mainnet-beta")}
            className="rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground"
          >
            <option value="devnet">devnet</option>
            <option value="mainnet-beta">mainnet-beta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Since (UTC date)
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Until (UTC date)
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold"
          />
        </label>
      </div>

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm font-semibold text-muted">{err}</div>
      ) : null}

      {loading && !data ? <p className="text-sm text-muted">Loading…</p> : null}

      {data ? (
        <>
          <p className="text-xs text-muted">
            Range: {new Date(data.range.since).toLocaleString()} → {new Date(data.range.until).toLocaleString()} ·{" "}
            {data.range.maxRangeDays} days · {data.range.cluster}
          </p>

          <div className="inline-flex flex-wrap gap-2 rounded border border-border-low bg-card p-1">
            {(
              [
                { key: "funnel" as const, label: "Funnel" },
                { key: "economy" as const, label: "Economy" },
                { key: "safety" as const, label: "Safety" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  "rounded px-3 py-2 text-sm font-semibold transition",
                  tab === t.key ? "bg-cream text-foreground" : "text-muted hover:bg-cream/60 hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "funnel" ? (
            <div className="space-y-6">
              <p className="text-sm text-muted">{data.notes?.funnel}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border border-border-low bg-card p-4 space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Volume funnel (relative)</h2>
                  <BarRow label="New accounts (global)" value={data.funnel.newAccounts} max={funnelMax} />
                  <BarRow
                    label="Active wallets (ledger on cluster)"
                    value={data.funnel.distinctUsersLedger}
                    max={funnelMax}
                  />
                  <BarRow label="Purchase lines (ledger)" value={data.funnel.purchaseLines} max={funnelMax} />
                  <BarRow label="Sessions started" value={data.funnel.sessionsStarted} max={funnelMax} />
                  <BarRow label="Sessions submitted" value={data.funnel.sessionsSubmitted} max={funnelMax} />
                  <BarRow label="Sessions with reward" value={data.funnel.sessionsWithReward} max={funnelMax} />
                  <BarRow label="Unlock / paid access events" value={data.funnel.unlockEvents} max={funnelMax} />
                  <BarRow label="Withdrawal requests opened" value={data.funnel.withdrawalRequestsCreated} max={funnelMax} />
                  <BarRow label="Withdrawals paid (range)" value={data.funnel.withdrawalsPaid} max={funnelMax} />
                  <BarRow label="Returning players (2+ sessions)" value={data.funnel.returningPlayers} max={funnelMax} />
                </div>
                <div className="rounded border border-border-low bg-card p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">New accounts by day</h2>
                  <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto">
                    {data.funnel.newAccountsByDay.length === 0 ? (
                      <p className="text-sm text-muted">No new accounts in range.</p>
                    ) : (
                      data.funnel.newAccountsByDay.map((d) => (
                        <BarRow key={d.day} label={d.day} value={d.count} max={Math.max(...data.funnel.newAccountsByDay.map((x) => x.count), 1)} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "economy" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-border-low bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">GamePass flow</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Purchases credited (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.gpPurchaseCredits)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Debit spends (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.gpDebitSpend)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Rewards credited (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.gpRewardCredits)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Refunds (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.gpRefundCredits)}</span>
                </div>
              </div>
              <div className="rounded border border-border-low bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Revenue share (accrual)</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Creator accrual (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.creatorAccruedGp)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Platform accrual (GP)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.platformAccruedGp)}</span>
                </div>
              </div>
              <div className="md:col-span-2 rounded border border-border-low bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Payouts & velocity</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">GP paid out (completed withdrawals in range)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.gpWithdrawalReservedOrPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Paid completions (in range)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.payoutVelocity.paidInRange)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Pending queue (cluster, any age)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.payoutVelocity.pendingOutstanding)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Still requested & opened in range</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.payoutVelocity.pendingOpenedInRange)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Failed payouts (opened in range)</span>
                  <span className="font-semibold tabular-nums">{fmt(data.economy.payoutVelocity.failed)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Median hours (request → paid, paid in range)</span>
                  <span className="font-semibold tabular-nums">
                    {data.economy.payoutVelocity.medianHoursRequestToPaid == null
                      ? "—"
                      : `${data.economy.payoutVelocity.medianHoursRequestToPaid.toFixed(1)} h`}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "safety" ? (
            <div className="space-y-6">
              <p className="text-sm text-muted">{data.notes?.safety}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded border border-border-low bg-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Banned accounts</div>
                  <div className="mt-2 text-2xl font-semibold">{fmt(data.safety.bannedUsersTotal)}</div>
                  <p className="mt-1 text-xs text-muted">Current total (not range-limited).</p>
                </div>
                <div className="rounded border border-border-low bg-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">User status audit events</div>
                  <div className="mt-2 text-2xl font-semibold">{fmt(data.safety.statusChangeEvents)}</div>
                  <p className="text-xs text-muted">Audit action user.status in range.</p>
                </div>
                <div className="rounded border border-border-low bg-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Refund ledger lines</div>
                  <div className="mt-2 text-2xl font-semibold">{fmt(data.safety.refundLedgerLines)}</div>
                  <p className="text-xs text-muted">Chargeback-equivalent signal (off-chain).</p>
                </div>
              </div>

              <div className="rounded border border-border-low bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  High-frequency withdrawals (3+ in range)
                </h2>
                {data.safety.highFrequencyWithdrawals.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">None in this window.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.safety.highFrequencyWithdrawals.map((w) => (
                      <li key={w.userId} className="flex flex-wrap justify-between gap-2 border-b border-border-low py-2 last:border-0">
                        <span className="font-mono text-xs break-all">{w.walletAddress}</span>
                        <span className="font-semibold">{w.requestCount} requests</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border border-border-low bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Top debit volume (watchlist)</h2>
                {data.safety.topDebitUsers.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No spends in range.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.safety.topDebitUsers.map((w) => (
                      <li key={w.userId} className="flex flex-wrap justify-between gap-2 border-b border-border-low py-2 last:border-0">
                        <span className="font-mono text-xs break-all">{w.walletAddress}</span>
                        <span className="font-semibold tabular-nums">{fmt(w.debitGp)} GP</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
