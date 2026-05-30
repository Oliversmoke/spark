"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useWalletConnection } from "@solana/react-hooks";

import { authStore } from "../components/auth-store";
import { FormPageSkeleton } from "../components/skeleton-ui";
import { UserAvatar } from "../components/user-avatar";
import { withBasePath } from "../components/base-path";

const MyListings = dynamic(() => import("./my-listings").then((m) => m.MyListings), {
  loading: () => <FormPageSkeleton />,
});

const ProfileEditor = dynamic(
  () => import("../components/profile-editor").then((m) => m.ProfileEditor),
  { loading: () => <FormPageSkeleton /> }
);

function truncateMiddle(addr: string, headChars = 4, tailChars = 4) {
  if (addr.length <= headChars + tailChars + 3) return addr;
  return `${addr.slice(0, headChars)}…${addr.slice(-tailChars)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);
  const { disconnect } = useWalletConnection();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authStore.refresh().catch(() => {});
  }, []);

  const wallet = me?.walletAddress ?? "";
  const displayName = me?.displayName?.trim() || (me?.username ? `@${me.username}` : "Player");
  const username = me?.username?.trim() || null;
  const bio = me?.bio?.trim() || null;
  const visibility = (me?.profileVisibility as "public" | "private" | undefined) ?? "private";
  const publicHref = username ? `/u/${encodeURIComponent(username)}` : null;

  return (
    <div className="space-y-6">
      <div className="rounded border border-border-low bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              src={me?.avatarUrl ?? null}
              displayName={me?.displayName ?? null}
              walletAddress={wallet || "—"}
              size={56}
              className="shadow-[0_20px_60px_-45px_rgba(0,0,0,0.7)]"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {displayName}
                </h1>
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    visibility === "public"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-600",
                  ].join(" ")}
                  title={visibility === "public" ? "Visible on public profile" : "Hidden from public profile"}
                >
                  {visibility === "public" ? "Public" : "Private"}
                </span>
              </div>
              {username ? <p className="mt-1 text-sm text-muted">@{username}</p> : null}
              {bio ? <p className="mt-2 text-sm text-foreground/90">{bio}</p> : null}
              {wallet ? (
                <p className="mt-2 truncate font-mono text-[11px] text-muted" title={wallet}>
                  {truncateMiddle(wallet, 6, 6)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {publicHref ? (
              <Link
                href={publicHref}
                className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
              >
                View public profile
              </Link>
            ) : (
              <span className="text-xs text-muted">Set a username to enable public profile.</span>
            )}
            <Link
              href="/profile"
              className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
            >
              Profile settings
            </Link>
          </div>
        </div>
      </div>

      <MyListings />

      <details className="rounded border border-border-low bg-card">
        <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-foreground">
          Edit profile
        </summary>
        <div className="px-5 pb-5">
          <ProfileEditor />
        </div>
      </details>

      <div className="rounded border border-border-low bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Session</div>
            <div className="text-sm font-semibold text-foreground">Signed in</div>
          </div>
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await authStore.logout();
              } finally {
                await disconnect().catch(() => {});
                router.replace(withBasePath("/"));
                setLoggingOut(false);
              }
            }}
            className="rounded border border-border-low bg-bg1 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60 disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}

