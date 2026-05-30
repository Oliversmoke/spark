"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { authStore } from "./auth-store";
import { useRouter } from "next/navigation";
import { withBasePath } from "./base-path";

function buildBrowseDeepLinks(currentUrl: string) {
  const url = encodeURIComponent(currentUrl);
  const ref = encodeURIComponent(new URL(currentUrl).origin);
  return {
    phantom: `https://phantom.app/ul/browse/${url}?ref=${ref}`,
    solflare: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`,
    backpack: `https://backpack.app/ul/v1/browse/${url}?ref=${ref}`,
  };
}

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

export function GetStarted() {
  const router = useRouter();
  const { connectors, connect, status } = useWalletConnection();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);

  const browseLinks = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return buildBrowseDeepLinks(window.location.href);
    } catch {
      return null;
    }
  }, []);

  const connectError = useMemo(() => stringifyError(err), [err]);

  // If we just signed in on the landing page, route into the app.
  useEffect(() => {
    if (me) router.replace(withBasePath("/app"));
  }, [me, router]);

  async function handleGetStarted(connectorId: string) {
    setBusy(true);
    setErr(null);
    try {
      const session = await connect(connectorId);
      await authStore.signIn(session);
      setOpen(false);
    } catch (e) {
      setErr(stringifyError(e) ?? "Connection failed");
      // If connection partially succeeded, allow user to disconnect cleanly.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={status === "connecting" || busy}
          className="inline-flex w-full items-center justify-center rounded bg-foreground px-6 py-4 text-base font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Get started
        </button>

      </div>

      {connectError ? (
        <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
          <span className="font-semibold text-foreground">Error:</span>{" "}
          <span className="wrap-break-word">{connectError}</span>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-60">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => (busy ? null : setOpen(false))}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t border border-border-low bg-card p-4 shadow-[0_-30px_80px_-40px_rgba(0,0,0,0.75)] md:left-1/2 md:top-1/2 md:bottom-auto md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded md:p-6 md:shadow-[0_40px_140px_-90px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Choose a wallet</p>
                <p className="text-sm text-muted">Connect and sign in with Solana.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded border border-border-low bg-cream px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {connectors.length === 0 ? (
                <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
                  <p className="font-semibold text-foreground">No wallets detected in this browser.</p>
                  <p className="mt-1">
                    On mobile, wallet discovery usually works only inside a wallet’s in-app browser. Tap a wallet
                    below to open this page inside it.
                  </p>

                  {browseLinks ? (
                    <div className="mt-3 grid gap-2">
                      <a
                        href={browseLinks.phantom}
                        className="flex items-center justify-between rounded border border-border-low bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-cream/50"
                      >
                        <span>Open in Phantom</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-border-low" aria-hidden />
                      </a>
                      <a
                        href={browseLinks.solflare}
                        className="flex items-center justify-between rounded border border-border-low bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-cream/50"
                      >
                        <span>Open in Solflare</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-border-low" aria-hidden />
                      </a>
                      <a
                        href={browseLinks.backpack}
                        className="flex items-center justify-between rounded border border-border-low bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-cream/50"
                      >
                        <span>Open in Backpack</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-border-low" aria-hidden />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {connectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleGetStarted(c.id)}
                  disabled={busy || status === "connecting"}
                  className="flex w-full items-center justify-between rounded border border-border-low bg-card px-4 py-3 text-left text-sm font-semibold transition hover:bg-cream/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted">
                      {busy || status === "connecting" ? "Connecting…" : "Tap to continue"}
                    </span>
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-border-low" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

