"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { authStore } from "../components/auth-store";

type Tab = "submissions" | "users" | "audit" | "withdrawals" | "appeals" | "subscriptions";

type SubmissionRow = {
  id: string;
  kind: string;
  status: string;
  title: string;
  slug: string;
  submitterWallet: string;
  summary: string;
  createdAt: string;
  gameDescription?: string | null;
  contentBody?: string | null;
  developerPipeline?: boolean;
  playableUrl?: string | null;
  gameCategory?: string | null;
  listingMonetization?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  socialTwitter?: string | null;
  socialDiscord?: string | null;
  mediaGallery?: string[];
  demoVideoUrl?: string | null;
  gameInstructionsExtra?: string | null;
  automatedChecks?: {
    warnings?: string[];
    playableUrlHttps?: boolean;
    playableUrlReachable?: boolean | null;
    malwareScanMode?: string;
    uploadsMimeOk?: boolean;
    underSizeLimits?: boolean;
  } | null;
  qaReview?: {
    playableLinkOk?: boolean;
    mediaReviewedOk?: boolean;
    metadataCompleteOk?: boolean;
    notes?: string;
  } | null;
};

type UserRow = {
  id: string;
  walletAddress: string;
  roles: string[];
  status: string;
};

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorWallet: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type WithdrawalRow = {
  id: string;
  status: string;
  walletAddress: string;
  unitsRequested: number;
  lamportsPayout: string;
  createdAt: string;
};

type AppealRow = {
  id: string;
  category: string;
  targetKind: string;
  targetId: string | null;
  title: string;
  statement: string;
  supplement: string | null;
  status: string;
  appellantUserId: string;
  appellantWalletAddress: string;
  publicStaffResponse: string | null;
  staffInternalNotes: string | null;
  createdAt: string;
};

type SubPlanRow = {
  id: string;
  ownerUserId: string;
  ownerWalletAddress: string;
  title: string;
  cadence: string;
  priceUnits: number;
  isActive: boolean;
  updatedAt: string;
};

type SubRow = {
  id: string;
  cluster: string;
  status: string;
  planId: string;
  planTitle: string;
  planIsActive: boolean;
  ownerUserId: string;
  ownerWalletAddress: string;
  subscriberUserId: string;
  subscriberWalletAddress: string;
  cadence: string;
  priceUnits: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  updatedAt: string;
};

type UserActivityRow = {
  id: string;
  actorUserId: string;
  actorWallet: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type UserTxRow = {
  id: string;
  createdAt: string;
  ledgerKind: string;
  units: number;
  label: string;
  reason: string | null;
  withdrawal?: { status: string; unitsRequested: number } | null;
};

type PayoutSettingsRow = {
  payoutsOutgoingEnabled: boolean;
  autoApproveAllPayouts: boolean;
  manualReviewAboveUnits: number;
  updatedAt: string;
};

const ROLE_OPTIONS = [
  "gamer",
  "developer",
  "creator",
  "moderator",
  "admin",
  "superadmin",
  "finance",
  "support",
] as const;

function SubmissionInspector({
  s,
  busy,
  onSaveQa,
}: {
  s: SubmissionRow;
  busy: boolean;
  onSaveQa: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const qa = s.qaReview;
  const [playableLinkOk, setPlayableLinkOk] = useState(qa?.playableLinkOk ?? false);
  const [mediaReviewedOk, setMediaReviewedOk] = useState(qa?.mediaReviewedOk ?? false);
  const [metadataCompleteOk, setMetadataCompleteOk] = useState(qa?.metadataCompleteOk ?? false);
  const [notes, setNotes] = useState(qa?.notes ?? "");

  useEffect(() => {
    setPlayableLinkOk(qa?.playableLinkOk ?? false);
    setMediaReviewedOk(qa?.mediaReviewedOk ?? false);
    setMetadataCompleteOk(qa?.metadataCompleteOk ?? false);
    setNotes(qa?.notes ?? "");
  }, [s.id, qa?.playableLinkOk, qa?.mediaReviewedOk, qa?.metadataCompleteOk, qa?.notes]);

  return (
    <div className="space-y-4 border-t border-border-low pt-4 text-sm">
      {s.kind === "game" && s.gameDescription ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Game description</div>
          <p className="mt-1 whitespace-pre-wrap text-muted">{s.gameDescription}</p>
        </div>
      ) : null}

      {s.developerPipeline ? (
        <div className="space-y-2 rounded border border-border-low bg-bg1/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Developer submission</div>
          {s.playableUrl ? (
            <a
              href={s.playableUrl}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-foreground underline"
            >
              {s.playableUrl}
            </a>
          ) : null}
          <div className="text-xs text-muted">
            Category: <span className="font-semibold text-foreground">{s.gameCategory ?? "—"}</span> · Monetization:{" "}
            <span className="font-semibold text-foreground">{s.listingMonetization ?? "—"}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {s.githubUrl ? (
              <a href={s.githubUrl} target="_blank" rel="noreferrer" className="underline">
                GitHub
              </a>
            ) : null}
            {s.websiteUrl ? (
              <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="underline">
                Website
              </a>
            ) : null}
            {s.socialTwitter ? (
              <a href={s.socialTwitter} target="_blank" rel="noreferrer" className="underline">
                X/Twitter
              </a>
            ) : null}
            {s.socialDiscord ? (
              <a href={s.socialDiscord} target="_blank" rel="noreferrer" className="underline">
                Discord
              </a>
            ) : null}
          </div>
          {s.demoVideoUrl ? (
            <a href={s.demoVideoUrl} target="_blank" rel="noreferrer" className="text-xs underline">
              Demo video
            </a>
          ) : null}
          {s.gameInstructionsExtra ? (
            <p className="whitespace-pre-wrap text-xs text-muted">{s.gameInstructionsExtra}</p>
          ) : null}
          {s.mediaGallery?.length ? (
            <ul className="list-inside list-disc text-xs break-all text-muted">
              {s.mediaGallery.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          ) : null}
          {s.automatedChecks ? (
            <div className="mt-2 rounded border border-border-low bg-card p-2 text-xs">
              <div className="font-semibold text-foreground">Automated checks</div>
              <div className="mt-1 text-muted">
                HTTPS: {String(s.automatedChecks.playableUrlHttps)} · Reachable (HEAD):{" "}
                {s.automatedChecks.playableUrlReachable === null
                  ? "n/a"
                  : String(s.automatedChecks.playableUrlReachable)}{" "}
                · Scan: {s.automatedChecks.malwareScanMode ?? "—"}
              </div>
              {s.automatedChecks.warnings?.length ? (
                <ul className="mt-1 list-inside list-disc text-[11px] text-muted">
                  {s.automatedChecks.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 rounded border border-border-low bg-card p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">QA checklist</div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={playableLinkOk}
            onChange={(e) => setPlayableLinkOk(e.target.checked)}
            disabled={busy}
          />
          Playable link verified
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={mediaReviewedOk}
            onChange={(e) => setMediaReviewedOk(e.target.checked)}
            disabled={busy}
          />
          Media reviewed
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={metadataCompleteOk}
            onChange={(e) => setMetadataCompleteOk(e.target.checked)}
            disabled={busy}
          />
          Metadata complete
        </label>
        <label className="block space-y-1 text-xs">
          <span className="text-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={busy}
            className="w-full rounded border border-border-low bg-bg1 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-cream/70"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSaveQa(s.id, {
              playableLinkOk,
              mediaReviewedOk,
              metadataCompleteOk,
              notes,
            })
          }
          className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          Save QA
        </button>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);
  const [tab, setTab] = useState<Tab>("submissions");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [cluster, setCluster] = useState<"devnet" | "mainnet-beta">("devnet");
  const [userTxCluster, setUserTxCluster] = useState<"devnet" | "mainnet-beta">("devnet");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityRow[]>([]);
  const [userTx, setUserTx] = useState<UserTxRow[]>([]);
  const [userInspectBusy, setUserInspectBusy] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettingsRow | null>(null);
  const [payoutSettingsSaving, setPayoutSettingsSaving] = useState(false);
  const [manualAboveDraft, setManualAboveDraft] = useState("");
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [appealFilter, setAppealFilter] = useState<"queue" | "all">("queue");
  const [subCluster, setSubCluster] = useState<"devnet" | "mainnet-beta">("devnet");
  const [subStatus, setSubStatus] = useState<"active" | "past_due" | "canceled" | "all">("active");
  const [subPlans, setSubPlans] = useState<SubPlanRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);

  const canManageUsers = useMemo(
    () => me?.roles?.some((r) => r === "admin" || r === "superadmin"),
    [me?.roles]
  );

  const loadSubmissions = useCallback(async () => {
    const res = await fetch("/api/admin/submissions?status=pending", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load submissions");
    setSubmissions(Array.isArray(json.items) ? json.items : []);
  }, []);

  const loadUsers = useCallback(async () => {
    const qs = userQuery.trim() ? `?q=${encodeURIComponent(userQuery.trim())}` : "";
    const res = await fetch(`/api/admin/users${qs}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load users");
    setUsers(Array.isArray(json.items) ? json.items : []);
  }, [userQuery]);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/admin/audit?limit=100", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load audit log");
    setAudit(Array.isArray(json.items) ? json.items : []);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    const res = await fetch(`/api/admin/withdrawals?cluster=${cluster}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load withdrawals");
    setWithdrawals(Array.isArray(json.items) ? json.items : []);
  }, [cluster]);

  const loadPayoutSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings/payouts", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load payout settings");
    setPayoutSettings(json as PayoutSettingsRow);
    if (typeof json.manualReviewAboveUnits === "number") {
      setManualAboveDraft(String(json.manualReviewAboveUnits));
    }
  }, []);

  const loadAppeals = useCallback(async () => {
    const qs = appealFilter === "queue" ? "status=queue" : "status=all";
    const res = await fetch(`/api/admin/appeals?${qs}&limit=60`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to load appeals");
    setAppeals(Array.isArray(json.items) ? json.items : []);
  }, [appealFilter]);

  const loadSubscriptions = useCallback(async () => {
    const [p, s] = await Promise.all([
      fetch("/api/admin/subscription-plans?limit=120", { credentials: "include" }),
      fetch(`/api/admin/subscriptions?cluster=${subCluster}&status=${subStatus}&limit=160`, {
        credentials: "include",
      }),
    ]);
    const jp = await p.json().catch(() => ({}));
    const js = await s.json().catch(() => ({}));
    if (!p.ok) throw new Error(jp?.error ?? "Failed to load subscription plans");
    if (!s.ok) throw new Error(js?.error ?? "Failed to load subscriptions");
    setSubPlans(Array.isArray(jp.items) ? jp.items : []);
    setSubscriptions(Array.isArray(js.items) ? js.items : []);
  }, [subCluster, subStatus]);

  async function patchPayoutSettings(patch: Partial<PayoutSettingsRow>) {
    setPayoutSettingsSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/settings/payouts", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setPayoutSettings(json as PayoutSettingsRow);
      if (typeof json.manualReviewAboveUnits === "number") {
        setManualAboveDraft(String(json.manualReviewAboveUnits));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPayoutSettingsSaving(false);
    }
  }

  const loadUserInspect = useCallback(async (userId: string) => {
    setUserInspectBusy(true);
    try {
      const [a, t] = await Promise.all([
        fetch(`/api/admin/users/${userId}/activity?limit=120`, { credentials: "include" }),
        fetch(`/api/admin/users/${userId}/transactions?cluster=${userTxCluster}&limit=200`, {
          credentials: "include",
        }),
      ]);
      const ja = await a.json().catch(() => ({}));
      const jt = await t.json().catch(() => ({}));
      if (!a.ok) throw new Error(ja?.error ?? "Failed to load user activity");
      if (!t.ok) throw new Error(jt?.error ?? "Failed to load user transactions");
      setUserActivity(Array.isArray(ja.items) ? ja.items : []);
      setUserTx(Array.isArray(jt.items) ? jt.items : []);
    } finally {
      setUserInspectBusy(false);
    }
  }, [userTxCluster]);

  useEffect(() => {
    setErr(null);
    setBusy(true);
    const run = async () => {
      try {
        if (tab === "submissions") await loadSubmissions();
        if (tab === "users" && canManageUsers) await loadUsers();
        if (tab === "audit") await loadAudit();
        if (tab === "withdrawals" && canManageUsers) {
          await loadWithdrawals();
          await loadPayoutSettings();
        }
        if (tab === "appeals") await loadAppeals();
        if (tab === "subscriptions") await loadSubscriptions();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    };
    run().catch(() => {});
  }, [
    tab,
    appealFilter,
    subCluster,
    subStatus,
    canManageUsers,
    loadSubmissions,
    loadUsers,
    loadAudit,
    loadWithdrawals,
    loadPayoutSettings,
    loadAppeals,
    loadSubscriptions,
  ]);

  useEffect(() => {
    if (!selectedUserId || tab !== "users") return;
    loadUserInspect(selectedUserId).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [selectedUserId, tab, userTxCluster, loadUserInspect]);

  async function approveSubmission(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Approve failed");
      await loadSubmissions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function rejectSubmission(id: string) {
    const reason = window.prompt("Rejection reason (optional)") ?? "";
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Reject failed");
      await loadSubmissions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveQa(id: string, payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/qa`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "QA save failed");
      await loadSubmissions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubmission(id: string) {
    if (!window.confirm("Remove this submission? Approved entries are hidden from the catalog.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      await loadSubmissions();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(u: UserRow, patch: { status?: string; roles?: string[] }) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      await loadUsers();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setAppealUnderReview(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/appeals/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "under_review" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      await loadAppeals();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resolveAppeal(id: string, outcome: "resolved_granted" | "resolved_denied") {
    const publicStaffResponse =
      window.prompt(
        outcome === "resolved_granted"
          ? "Public response to the user (required). Explain what happens next."
          : "Public response to the user (required). Explain why the decision stands."
      ) ?? "";
    if (!publicStaffResponse.trim()) return;
    const staffInternalNotes = window.prompt("Internal notes (optional, staff-only)") ?? "";
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/appeals/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: outcome,
          publicStaffResponse: publicStaffResponse.trim(),
          staffInternalNotes: staffInternalNotes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Resolve failed");
      await loadAppeals();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function approveWithdrawal(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/withdrawals/approve", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Approve withdrawal failed");
      await loadWithdrawals();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex flex-wrap gap-2 rounded border border-border-low bg-card p-1">
        {(
          [
            { key: "submissions" as const, label: "Submissions" },
            { key: "users" as const, label: "Users", disabled: !canManageUsers },
            { key: "audit" as const, label: "Audit log" },
            { key: "withdrawals" as const, label: "Withdrawals", disabled: !canManageUsers },
            { key: "appeals" as const, label: "Appeals" },
            { key: "subscriptions" as const, label: "Subscriptions" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={"disabled" in t ? t.disabled : false}
            onClick={() => setTab(t.key)}
            className={[
              "rounded px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
              tab === t.key ? "bg-cream text-foreground" : "text-muted hover:bg-cream/60 hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm font-semibold">{err}</div>
      ) : null}

      {tab === "submissions" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Pending community games & content.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => loadSubmissions().catch(() => {})}
              className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
            >
              Refresh
            </button>
          </div>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted">No pending submissions.</p>
          ) : (
            <div className="divide-y divide-border-low rounded border border-border-low bg-card">
              {submissions.map((s) => (
                <div key={s.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {s.title}{" "}
                        <span className="font-normal text-muted">
                          · {s.kind} · {s.slug}
                        </span>
                        {s.developerPipeline ? (
                          <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                            Developer pipeline
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted">{s.submitterWallet}</div>
                      <p className="mt-2 text-sm text-muted">{s.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setExpandedSubmissionId((cur) => (cur === s.id ? null : s.id))
                        }
                        className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold hover:bg-cream/60 disabled:opacity-50"
                      >
                        {expandedSubmissionId === s.id ? "Hide" : "Details"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => approveSubmission(s.id)}
                        className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => rejectSubmission(s.id)}
                        className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold hover:bg-cream/60 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteSubmission(s.id)}
                        className="rounded border border-border-low px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/40 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedSubmissionId === s.id ? (
                    <SubmissionInspector busy={busy} s={s} onSaveQa={saveQa} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "users" && canManageUsers ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search wallet or user id"
              className="h-11 min-w-[200px] flex-1 rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => loadUsers().catch(() => {})}
              className="h-11 rounded bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {selectedUserId ? (
            <div className="space-y-4 rounded border border-border-low bg-bg2/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Inspecting user</div>
                  <div className="mt-1 font-mono text-sm">{selectedUserId}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["devnet", "mainnet-beta"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setUserTxCluster(c)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        userTxCluster === c
                          ? "bg-foreground text-background"
                          : "border border-border-low bg-card text-muted",
                      ].join(" ")}
                    >
                      Tx · {c}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(null);
                      setUserActivity([]);
                      setUserTx([]);
                    }}
                    className="rounded-full border border-border-low px-3 py-1 text-xs font-semibold text-muted hover:bg-cream/60"
                  >
                    Close
                  </button>
                </div>
              </div>

              {userInspectBusy ? (
                <p className="text-sm text-muted">Loading activity & transactions…</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-x-auto rounded border border-border-low bg-card">
                    <div className="border-b border-border-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Activity log (audit)
                    </div>
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <tbody className="divide-y divide-border-low">
                        {userActivity.length === 0 ? (
                          <tr>
                            <td className="p-3 text-xs text-muted">No audit entries for this user.</td>
                          </tr>
                        ) : (
                          userActivity.map((a) => (
                            <tr key={a.id}>
                              <td className="p-2 align-top text-xs text-muted whitespace-nowrap">
                                {new Date(a.createdAt).toLocaleString()}
                              </td>
                              <td className="p-2 align-top text-xs">
                                <span className="font-semibold">{a.action}</span>
                                <div className="text-muted">
                                  {a.targetType}:{a.targetId}
                                </div>
                                {a.actorUserId !== selectedUserId ? (
                                  <div className="text-[10px] text-muted">actor {a.actorWallet.slice(0, 8)}…</div>
                                ) : null}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-x-auto rounded border border-border-low bg-card">
                    <div className="border-b border-border-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      GamePass transactions ({userTxCluster})
                    </div>
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <tbody className="divide-y divide-border-low">
                        {userTx.length === 0 ? (
                          <tr>
                            <td className="p-3 text-xs text-muted">No ledger rows for this cluster.</td>
                          </tr>
                        ) : (
                          userTx.map((t) => (
                            <tr key={t.id}>
                              <td className="p-2 align-top text-xs text-muted whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString()}
                              </td>
                              <td className="p-2 align-top text-xs">
                                <div className="font-semibold">{t.label}</div>
                                <div className="text-muted">
                                  {t.ledgerKind}
                                  {t.withdrawal ? ` · ${t.withdrawal.status}` : ""}
                                </div>
                              </td>
                              <td className="p-2 align-top text-right text-xs font-semibold whitespace-nowrap">
                                {t.units > 0 ? "+" : ""}
                                {t.units} GP
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="divide-y divide-border-low rounded border border-border-low bg-card">
            {users.map((u) => (
              <div key={u.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-muted">{u.id}</div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId((cur) => (cur === u.id ? null : u.id))}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      selectedUserId === u.id
                        ? "bg-foreground text-background"
                        : "border border-border-low bg-card text-muted hover:bg-cream/60",
                    ].join(" ")}
                  >
                    {selectedUserId === u.id ? "Inspector open" : "Activity & transactions"}
                  </button>
                </div>
                <div className="text-sm font-semibold break-all">{u.walletAddress}</div>
                <div className="text-sm">
                  Status: <span className="font-semibold">{u.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const on = u.roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const next = on ? u.roles.filter((x) => x !== r) : [...u.roles, r];
                          if (next.length) patchUser(u, { roles: next });
                        }}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          on ? "bg-foreground text-background" : "border border-border-low bg-card text-muted",
                        ].join(" ")}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || u.status === "banned"}
                    onClick={() => patchUser(u, { status: "banned" })}
                    className="rounded border border-border-low px-3 py-2 text-xs font-semibold hover:bg-cream/50 disabled:opacity-40"
                  >
                    Ban
                  </button>
                  <button
                    type="button"
                    disabled={busy || u.status === "active"}
                    onClick={() => patchUser(u, { status: "active" })}
                    className="rounded border border-border-low px-3 py-2 text-xs font-semibold hover:bg-cream/50 disabled:opacity-40"
                  >
                    Unban
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="overflow-x-auto rounded border border-border-low bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border-low bg-bg2/40 text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-low">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-semibold">{a.action}</td>
                  <td className="px-3 py-2 text-xs">
                    {a.targetType}:{a.targetId}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-muted">{a.actorWallet}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {audit.length === 0 ? <p className="p-4 text-sm text-muted">No entries yet.</p> : null}
        </div>
      ) : null}

      {tab === "withdrawals" && canManageUsers ? (
        <div className="space-y-4">
          <div className="rounded border border-border-low bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Payout policy</p>
                <p className="mt-1 text-xs text-muted">
                  Small withdrawals settle automatically; amounts above the threshold queue for manual approval unless
                  auto-approve-all is on. Turning off outbound payouts blocks new user withdrawals and SOL sends.
                </p>
              </div>
              <button
                type="button"
                disabled={payoutSettingsSaving || busy}
                onClick={() => loadPayoutSettings().catch((e) => setErr(e instanceof Error ? e.message : String(e)))}
                className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
              >
                Refresh
              </button>
            </div>

            {payoutSettings ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded border border-border-low bg-bg2/40 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={payoutSettings.payoutsOutgoingEnabled}
                    disabled={payoutSettingsSaving}
                    onChange={(e) => patchPayoutSettings({ payoutsOutgoingEnabled: e.target.checked })}
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Outbound payouts enabled</span>
                    <span className="block text-xs text-muted">
                      Off = pause: users cannot create withdrawals; admin cannot pay queued requests until turned back
                      on.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded border border-border-low bg-bg2/40 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={payoutSettings.autoApproveAllPayouts}
                    disabled={payoutSettingsSaving}
                    onChange={(e) => patchPayoutSettings({ autoApproveAllPayouts: e.target.checked })}
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Auto-approve all payouts</span>
                    <span className="block text-xs text-muted">
                      When on, every withdrawal is paid automatically—no manual queue, regardless of size.
                    </span>
                  </span>
                </label>

                <div className="md:col-span-2 rounded border border-border-low bg-bg2/40 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Manual review above (GP units)
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Withdrawals with more GP than this require admin approval unless auto-approve-all is enabled.
                    Default env: <code className="font-mono">WITHDRAW_MANUAL_REVIEW_ABOVE_UNITS</code>.
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <input
                      value={manualAboveDraft}
                      onChange={(e) => setManualAboveDraft(e.target.value)}
                      inputMode="numeric"
                      className="h-10 w-40 rounded border border-border-low bg-bg1 px-3 text-sm font-semibold"
                      disabled={payoutSettingsSaving}
                    />
                    <button
                      type="button"
                      disabled={payoutSettingsSaving}
                      onClick={() => {
                        const n = Number(manualAboveDraft);
                        if (!Number.isFinite(n) || n < 0) {
                          setErr("Enter a valid non-negative number");
                          return;
                        }
                        patchPayoutSettings({ manualReviewAboveUnits: Math.floor(n) });
                      }}
                      className="h-10 rounded bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
                    >
                      Save threshold
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Last updated: {new Date(payoutSettings.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Loading payout settings…</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(["devnet", "mainnet-beta"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCluster(c)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  cluster === c ? "bg-foreground text-background" : "border border-border-low bg-card text-muted",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>

          {payoutSettings && !payoutSettings.payoutsOutgoingEnabled ? (
            <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
              Outbound payouts are <span className="font-semibold text-foreground">paused</span>. Users cannot create
              new withdrawals; manual approval is disabled until you enable outbound payouts above.
            </div>
          ) : null}

          <div className="divide-y divide-border-low rounded border border-border-low bg-card">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-semibold">{w.status.toUpperCase()}</div>
                  <div className="text-xs text-muted">{new Date(w.createdAt).toLocaleString()}</div>
                  <div className="mt-1 text-xs break-all">{w.walletAddress}</div>
                  <div className="text-xs text-muted">
                    {w.unitsRequested} GP · payout lamports {w.lamportsPayout}
                  </div>
                </div>
                {w.status === "requested" ? (
                  <button
                    type="button"
                    disabled={busy || !payoutSettings?.payoutsOutgoingEnabled}
                    title={
                      !payoutSettings?.payoutsOutgoingEnabled
                        ? "Enable outbound payouts in policy above"
                        : undefined
                    }
                    onClick={() => approveWithdrawal(w.id)}
                    className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
                  >
                    Approve & pay
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {withdrawals.length === 0 ? <p className="text-sm text-muted">No withdrawals for this cluster.</p> : null}
        </div>
      ) : null}

      {tab === "appeals" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-2xl space-y-1 text-sm text-muted">
              <p>
                Disputes for bans, rejected submissions, archived content, withdrawals, and general platform issues.
                Grant/deny records the outcome; operational fixes (unban, reinstate) still use Users / submissions tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAppealFilter("queue")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  appealFilter === "queue"
                    ? "bg-foreground text-background"
                    : "border border-border-low bg-card text-muted",
                ].join(" ")}
              >
                Queue
              </button>
              <button
                type="button"
                onClick={() => setAppealFilter("all")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  appealFilter === "all"
                    ? "bg-foreground text-background"
                    : "border border-border-low bg-card text-muted",
                ].join(" ")}
              >
                All recent
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => loadAppeals().catch(() => {})}
                className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="divide-y divide-border-low rounded border border-border-low bg-card">
            {appeals.map((a) => (
              <div key={a.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{a.status}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {a.title}{" "}
                      <span className="font-normal text-muted">
                        · {a.category} · {a.targetKind}
                        {a.targetId ? ` · ${a.targetId}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs break-all text-muted">{a.appellantWalletAddress}</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{a.statement}</p>
                    {a.supplement ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        <span className="font-semibold text-foreground">Supplement:</span> {a.supplement}
                      </p>
                    ) : null}
                    {a.staffInternalNotes ? (
                      <p className="mt-2 rounded border border-border-low bg-bg2/40 p-2 text-xs text-muted">
                        <span className="font-semibold text-foreground">Internal:</span> {a.staffInternalNotes}
                      </p>
                    ) : null}
                    {a.publicStaffResponse ? (
                      <p className="mt-2 text-sm">
                        <span className="font-semibold">Staff reply:</span> {a.publicStaffResponse}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    {a.status === "open" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setAppealUnderReview(a.id)}
                          className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold hover:bg-cream/60"
                        >
                          Mark in review
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resolveAppeal(a.id, "resolved_granted")}
                          className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90"
                        >
                          Grant
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resolveAppeal(a.id, "resolved_denied")}
                          className="rounded border border-border-low px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/40"
                        >
                          Deny
                        </button>
                      </>
                    ) : null}
                    {a.status === "under_review" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resolveAppeal(a.id, "resolved_granted")}
                          className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90"
                        >
                          Grant
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resolveAppeal(a.id, "resolved_denied")}
                          className="rounded border border-border-low px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/40"
                        >
                          Deny
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="text-[11px] text-muted">Opened {new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {appeals.length === 0 ? <p className="text-sm text-muted">No appeals in this view.</p> : null}
        </div>
      ) : null}

      {tab === "subscriptions" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-muted">
              Monitor creator subscription plans and subscriber states. Revenue is debited in GamePass units on
              subscription start and renewal.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => loadSubscriptions().catch((e) => setErr(e instanceof Error ? e.message : String(e)))}
              className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/60"
            >
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["devnet", "mainnet-beta"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSubCluster(c)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  subCluster === c ? "bg-foreground text-background" : "border border-border-low bg-card text-muted",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
            {(["active", "past_due", "canceled", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubStatus(s)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  subStatus === s ? "bg-foreground text-background" : "border border-border-low bg-card text-muted",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded border border-border-low bg-card">
              <div className="border-b border-border-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Plans (recent)
              </div>
              <table className="w-full min-w-[360px] text-left text-sm">
                <tbody className="divide-y divide-border-low">
                  {subPlans.length === 0 ? (
                    <tr>
                      <td className="p-3 text-xs text-muted">No plans found.</td>
                    </tr>
                  ) : (
                    subPlans.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 align-top text-xs">
                          <div className="font-semibold">{p.title}</div>
                          <div className="text-muted">
                            {p.cadence} · {p.priceUnits} GP · {p.isActive ? "active" : "disabled"}
                          </div>
                          <div className="text-[10px] text-muted break-all">owner {p.ownerWalletAddress}</div>
                        </td>
                        <td className="p-2 align-top text-right text-[10px] text-muted whitespace-nowrap">
                          {new Date(p.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded border border-border-low bg-card">
              <div className="border-b border-border-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Subscriptions ({subCluster} · {subStatus})
              </div>
              <table className="w-full min-w-[360px] text-left text-sm">
                <tbody className="divide-y divide-border-low">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td className="p-3 text-xs text-muted">No subscriptions in this view.</td>
                    </tr>
                  ) : (
                    subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td className="p-2 align-top text-xs">
                          <div className="font-semibold">{s.planTitle || s.planId}</div>
                          <div className="text-muted">
                            {s.status}
                            {s.cancelAtPeriodEnd ? " · cancels" : ""}
                            {s.planIsActive ? "" : " · plan_disabled"}
                          </div>
                          <div className="text-[10px] text-muted break-all">sub {s.subscriberWalletAddress}</div>
                        </td>
                        <td className="p-2 align-top text-right text-[10px] text-muted whitespace-nowrap">
                          ends {new Date(s.currentPeriodEnd).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
