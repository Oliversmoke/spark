"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { authStore } from "./auth-store";
import { UserAvatar } from "./user-avatar";

export function ProfileEditor() {
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);

  const [username, setUsername] = useState("");
  const [origin, setOrigin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    authStore.refresh().catch(() => {});
  }, []);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!me) return;
    setUsername(me.username ?? "");
    setDisplayName(me.displayName ?? "");
    setBio(me.bio ?? "");
    setVisibility((me.profileVisibility as "public" | "private") ?? "private");
  }, [me]);

  async function saveProfile() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          displayName,
          bio,
          profileVisibility: visibility,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      await authStore.refresh();
      setOk("Profile saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/me/avatar", { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      await authStore.refresh();
      setOk("Photo updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function clearUsernameHandle() {
    if (!window.confirm("Remove this username? Your public link at /u/... will stop working.")) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearUsername: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not remove username");
      setUsername("");
      await authStore.refresh();
      setOk("Username removed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function clearPhoto() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearAvatar: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not remove photo");
      await authStore.refresh();
      setOk("Photo removed — showing initials.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <p className="rounded border border-border-low bg-card p-4 text-sm text-muted">
        Sign in to edit your profile.
      </p>
    );
  }

  return (
    <div className="rounded border border-border-low bg-card p-5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <UserAvatar
            src={me.avatarUrl}
            displayName={displayName}
            walletAddress={me.walletAddress}
            size={96}
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <label className="cursor-pointer rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold hover:bg-cream/60">
              Upload photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={busy}
                onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
            {me.avatarUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => clearPhoto()}
                className="rounded border border-border-low px-3 py-2 text-xs font-semibold text-muted hover:bg-cream/40 disabled:opacity-50"
              >
                Use initials
              </button>
            ) : null}
          </div>
          <p className="max-w-[220px] text-center text-xs text-muted sm:text-left">
            Without a photo we show initials from your display name, or your wallet suffix.
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Username (unique, 3–24 chars)
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 font-mono text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
              placeholder="cool_creator"
              disabled={busy}
            />
          </label>
          {origin && username.trim() ? (
            <div className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs">
              <div className="font-semibold text-muted">Public profile link</div>
              <Link
                href={`/u/${username.trim().toLowerCase()}`}
                className="mt-1 block break-all font-mono text-sm text-foreground underline"
              >
                {origin}/u/{username.trim().toLowerCase()}
              </Link>
              <p className="mt-2 text-[11px] text-muted">
                Works when your profile is public. You can change your username anytime if it’s still
                available.
              </p>
            </div>
          ) : origin ? (
            <p className="text-xs text-muted">
              Choose a username to get a shareable link:{" "}
              <span className="font-mono">
                {origin}/u/<span className="text-muted">yourname</span>
              </span>
            </p>
          ) : null}
          {me?.username ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => clearUsernameHandle()}
              className="text-xs font-semibold text-muted underline hover:text-foreground disabled:opacity-50"
            >
              Remove username
            </button>
          ) : null}

          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
              placeholder="Your name"
              disabled={busy}
            />
          </label>

          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              disabled={busy}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
              placeholder="Short intro visible when your profile is public."
            />
          </label>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Profile visibility</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setVisibility("public")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  visibility === "public" ? "bg-foreground text-background" : "border border-border-low text-muted",
                ].join(" ")}
              >
                Public
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setVisibility("private")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  visibility === "private" ? "bg-foreground text-background" : "border border-border-low text-muted",
                ].join(" ")}
              >
                Private
              </button>
            </div>
            <p className="text-xs text-muted">
              Public profiles: <span className="font-mono text-[11px]">GET /api/users/&lt;username&gt;</span> or
              legacy id, and the page <span className="font-mono text-[11px]">/u/&lt;username&gt;</span>.
            </p>
          </div>

          {err ? <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div> : null}
          {ok ? <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{ok}</div> : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => saveProfile()}
            className="inline-flex h-11 items-center justify-center rounded bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
