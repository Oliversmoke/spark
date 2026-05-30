"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { authStore } from "../components/auth-store";

type AppealItem = {
  id: string;
  category: string;
  targetKind: string;
  targetId: string | null;
  title: string;
  statement: string;
  supplement: string | null;
  status: string;
  publicStaffResponse: string | null;
  createdAt: string;
  updatedAt: string;
  events: Array<{
    at: string;
    kind: string;
    body?: string;
    previousStatus?: string;
    nextStatus?: string;
  }>;
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "account_ban", label: "Account restriction (ban)" },
  { value: "submission_rejection", label: "Rejected game or content submission" },
  { value: "content_removal", label: "Archived / removed post" },
  { value: "withdrawal_dispute", label: "Withdrawal or payout" },
  { value: "platform_other", label: "Other platform issue" },
];

export default function AppealsPage() {
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);
  const [items, setItems] = useState<AppealItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState("platform_other");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/appeals/my", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load appeals");
    setItems(Array.isArray(json.items) ? json.items : []);
  }, []);

  useEffect(() => {
    if (!me) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load()
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [me, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setSubmitting(true);
    setErr(null);
    try {
      const targetKind =
        category === "account_ban"
          ? "account"
          : category === "submission_rejection"
            ? "submission"
            : category === "content_removal"
              ? "creator_post"
              : category === "withdrawal_dispute"
                ? "withdrawal"
                : "none";
      const resolvedTargetId =
        category === "platform_other"
          ? null
          : category === "account_ban"
            ? me.id
            : targetId.trim() || null;
      const res = await fetch("/api/appeals", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          targetKind,
          targetId: resolvedTargetId,
          title: title.trim(),
          statement: statement.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not submit appeal");
      setTitle("");
      setStatement("");
      setTargetId("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold">Appeals</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your wallet to open or track a dispute. If your account is restricted, you can still use this page
          while your session is valid.
        </p>
        <Link href="/app" className="mt-6 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">
          Go to sign in
        </Link>
      </div>
    );
  }

  const needsTarget =
    category !== "platform_other" &&
    category !== "account_ban";

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <header className="space-y-2 border-b border-border-low pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Trust & safety</p>
        <h1 className="text-3xl font-semibold tracking-tight">Appeals & disputes</h1>
        <p className="max-w-2xl text-sm text-muted leading-relaxed">
          Submit one appeal per issue. Staff review typically considers your statement and any linked record (submission id,
          post id, or withdrawal id). For account bans, we validate your appeal against your current account state.
          Decisions are logged; granting an appeal may still require a separate moderator action to restore access or
          content.
        </p>
      </header>

      <section className="rounded border border-border-low bg-card p-6">
        <h2 className="text-lg font-semibold">New appeal</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {category === "account_ban" ? (
            <p className="text-xs text-muted">
              Your user id is used automatically. You can only open this when your account is currently marked banned.
            </p>
          ) : null}

          {needsTarget ? (
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">Target id (Mongo id)</span>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Submission, post, or withdrawal id"
                className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 font-mono text-sm"
              />
            </label>
          ) : null}

          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Short title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Statement</span>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              rows={6}
              maxLength={8000}
              placeholder="What happened, what you expect, and any evidence we should consider."
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm"
            />
          </label>

          {err ? <div className="rounded border border-border-low bg-cream px-3 py-2 text-sm font-semibold">{err}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit appeal"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your appeals</h2>
        {loading ? <p className="mt-2 text-sm text-muted">Loading…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No appeals yet.</p>
        ) : null}
        <ul className="mt-4 space-y-4">
          {items.map((a) => (
            <li key={a.id} className="rounded border border-border-low bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{a.status.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted">{new Date(a.updatedAt).toLocaleString()}</span>
              </div>
              <div className="mt-1 font-semibold">{a.title}</div>
              <div className="text-xs text-muted">
                {a.category}
                {a.targetId ? ` · ${a.targetId}` : ""}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{a.statement}</p>
              {a.publicStaffResponse ? (
                <div className="mt-3 rounded border border-border-low bg-bg2/50 p-3 text-sm">
                  <span className="font-semibold text-foreground">Response:</span> {a.publicStaffResponse}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
