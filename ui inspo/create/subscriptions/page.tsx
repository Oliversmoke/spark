"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useThemeNetwork } from "@/app/components/theme-network-provider";

type Candidate = {
  kind: "game" | "content";
  source: "creator_post" | "submission";
  slug: string;
  title: string;
  access?: string;
  purchaseMode?: string;
  priceUnits?: number;
  coverImageSrc?: string;
};

type Plan = {
  id: string;
  title: string;
  description: string;
  cadence: "daily" | "monthly" | "annually";
  priceUnits: number;
  targets: { kind: "game" | "content"; slug: string }[];
  isActive: boolean;
  updatedAt: string;
};

type SubRow = {
  id: string;
  planId: string;
  planTitle: string;
  subscriberUserId: string;
  subscriberWalletAddress: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
};

function cadenceLabel(c: Plan["cadence"]) {
  if (c === "daily") return "Daily";
  if (c === "monthly") return "Monthly";
  return "Annual";
}

export default function CreatorSubscriptionsPage() {
  const { cluster } = useThemeNetwork();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState<Plan["cadence"]>("monthly");
  const [priceUnits, setPriceUnits] = useState("100");
  const [selectedTargets, setSelectedTargets] = useState<Record<string, boolean>>({});

  const selected = useMemo(() => {
    const out: { kind: "game" | "content"; slug: string }[] = [];
    for (const k of Object.keys(selectedTargets)) {
      if (!selectedTargets[k]) continue;
      const [kind, slug] = k.split(":");
      if ((kind === "game" || kind === "content") && slug) out.push({ kind, slug });
    }
    return out;
  }, [selectedTargets]);

  async function loadAll() {
    setErr(null);
    const [candRes, plansRes, subsRes] = await Promise.all([
      fetch("/api/creator/subscriptions/candidates", { credentials: "include" }),
      fetch("/api/creator/subscriptions/plans", { credentials: "include" }),
      fetch(`/api/creator/subscriptions/subscribers?cluster=${cluster}&status=active&limit=120`, {
        credentials: "include",
      }),
    ]);
    const jc = await candRes.json().catch(() => ({}));
    const jp = await plansRes.json().catch(() => ({}));
    const js = await subsRes.json().catch(() => ({}));
    if (!candRes.ok) throw new Error(jc?.error ?? "Failed to load candidates");
    if (!plansRes.ok) throw new Error(jp?.error ?? "Failed to load plans");
    if (!subsRes.ok) throw new Error(js?.error ?? "Failed to load subscribers");

    const c: Candidate[] = [...(jc.posts ?? []), ...(jc.submissions ?? [])];
    setCandidates(c);
    setPlans(jp.items ?? []);
    setSubs(js.items ?? []);
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster]);

  async function createPlan() {
    setBusy(true);
    setErr(null);
    try {
      const n = Number(priceUnits);
      const res = await fetch("/api/creator/subscriptions/plans", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          cadence,
          priceUnits: Number.isFinite(n) ? Math.floor(n) : null,
          targets: selected,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Create failed");
      setTitle("");
      setDescription("");
      setSelectedTargets({});
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disablePlan(id: string) {
    if (!window.confirm("Disable this plan? Existing subscribers keep access until period end.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/creator/subscriptions/plans/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Update failed");
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create</p>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="max-w-3xl text-sm text-muted">Create plans and manage subscribers.</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/create/posts"
            className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
          >
            ← Posts
          </Link>
        </div>
      </header>

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm font-semibold">{err}</div>
      ) : null}

      <section className="rounded border border-border-low bg-card p-5">
        <h2 className="text-base font-semibold">New plan</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <div className="font-semibold">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded border border-border-low bg-bg1 px-3"
              placeholder="e.g. Pro archive"
              disabled={busy}
            />
          </label>

          <label className="space-y-1 text-sm">
            <div className="font-semibold">Cadence</div>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as any)}
              className="h-11 w-full rounded border border-border-low bg-bg1 px-3"
              disabled={busy}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annual</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <div className="font-semibold">Price (GP units)</div>
            <input
              value={priceUnits}
              onChange={(e) => setPriceUnits(e.target.value)}
              inputMode="numeric"
              className="h-11 w-full rounded border border-border-low bg-bg1 px-3 font-mono"
              disabled={busy}
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <div className="font-semibold">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-border-low bg-bg1 px-3 py-2"
              disabled={busy}
            />
          </label>
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Select included items</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {candidates.map((c) => {
              const key = `${c.kind}:${c.slug}`;
              const on = Boolean(selectedTargets[key]);
              return (
                <button
                  key={`${c.source}:${key}`}
                  type="button"
                  onClick={() => setSelectedTargets((cur) => ({ ...cur, [key]: !on }))}
                  className={[
                    "rounded border px-3 py-3 text-left text-sm transition",
                    on
                      ? "border-foreground bg-cream text-foreground"
                      : "border-border-low bg-card hover:bg-cream/60",
                  ].join(" ")}
                >
                  <div className="font-semibold">{c.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {c.kind} · {c.source} · {c.slug}
                  </div>
                </button>
              );
            })}
          </div>
          {candidates.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No published posts or approved submissions found yet. Publish a post or get a submission approved first.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !title.trim() || selected.length === 0}
            onClick={() => createPlan()}
            className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            Create plan
          </button>
          <span className="text-xs text-muted">{selected.length} selected</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Your plans</h2>
        <div className="divide-y divide-border-low rounded border border-border-low bg-card">
          {plans.map((p) => (
            <div key={p.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {p.title}{" "}
                    <span className="font-normal text-muted">
                      · {cadenceLabel(p.cadence)} · {p.priceUnits} GP
                      {p.isActive ? "" : " · disabled"}
                    </span>
                  </div>
                  {p.description ? <p className="mt-1 text-sm text-muted">{p.description}</p> : null}
                  <div className="mt-2 text-xs text-muted">{p.targets.length} items included</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.isActive ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => disablePlan(p.id)}
                      className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
                    >
                      Disable
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 ? <p className="p-4 text-sm text-muted">No subscription plans yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Active subscribers ({cluster})</h2>
        <div className="divide-y divide-border-low rounded border border-border-low bg-card">
          {subs.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{s.planTitle || s.planId}</div>
                <div className="mt-1 text-xs break-all text-muted">{s.subscriberWalletAddress}</div>
                <div className="text-xs text-muted">
                  {s.status}
                  {s.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                </div>
              </div>
              <div className="text-xs text-muted">Renews/ends {new Date(s.currentPeriodEnd).toLocaleString()}</div>
            </div>
          ))}
          {subs.length === 0 ? <p className="p-4 text-sm text-muted">No active subscribers on {cluster}.</p> : null}
        </div>
      </section>
    </div>
  );
}

