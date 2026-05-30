"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useWalletConnection } from "@solana/react-hooks";

import { authStore } from "./auth-store";

export function AuthPanel() {
  const { wallet, status } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString();

  const [loading, setLoading] = useState(false);
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);
  const [error, setError] = useState<string | null>(null);
  const autoTriedRef = useRef<string | null>(null);

  const canSignMessage = useMemo(() => {
    return status === "connected" && Boolean(wallet?.account) && typeof wallet?.signMessage === "function";
  }, [status, wallet]);

  const refreshMe = useCallback(async () => {
    await authStore.refresh();
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!wallet) throw new Error("Connect a wallet first.");
      await authStore.signIn(wallet);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? String((e as { message: string }).message)
          : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authStore.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-logout backend session when the wallet disconnects.
  useEffect(() => {
    if (status === "disconnected" && me) {
      authStore.logout().catch(() => {});
      autoTriedRef.current = null;
    }
  }, [me, status]);

  // Best-effort auto sign-in. Some wallets require a user gesture for signing;
  // if that happens, the user can still tap the Sign in button.
  useEffect(() => {
    if (loading) return;
    if (status !== "connected") return;
    if (!wallet || typeof wallet.signMessage !== "function") return;
    if (!walletAddress) return;
    if (me) return;
    if (autoTriedRef.current === walletAddress) return;

    autoTriedRef.current = walletAddress;
    (async () => {
      try {
        const existing = await authStore.refresh();
        if (existing) return;
        await authStore.signIn(wallet);
      } catch {
        // Ignore; user can manually click Sign in.
      }
    })();
  }, [loading, me, status, wallet, walletAddress]);

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Sign in with Solana</p>
          <p className="text-sm text-muted">
            This creates a backend session (JWT cookie) so we can apply roles (RBAC) and power API
            features.
          </p>
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {me ? "Signed in" : "Signed out"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => refreshMe()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh session
        </button>
        <button
          type="button"
          onClick={() => signIn()}
          disabled={loading || status !== "connected" || !walletAddress || !canSignMessage || !!me}
          className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {me ? "Signed in" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => logout()}
          disabled={loading || !me}
          className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Logout
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="rounded-xl border border-border-low bg-cream px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Wallet</div>
          <div className="font-mono text-xs">{walletAddress ?? "No wallet connected"}</div>
        </div>

        <div className="rounded-xl border border-border-low bg-cream px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Session</div>
          <div className="font-mono text-xs">
            {me ? JSON.stringify({ id: me.id, roles: me.roles, status: me.status }) : "None"}
          </div>
        </div>

        {error ? <div className="text-sm font-medium text-muted">Error: {error}</div> : null}
      </div>
    </section>
  );
}

