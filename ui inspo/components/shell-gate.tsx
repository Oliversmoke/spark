"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWalletConnection } from "@solana/react-hooks";
import { AppShell } from "./app-shell";
import { BottomTabs } from "./bottom-tabs";
import { authStore } from "./auth-store";
import { withBasePath } from "./base-path";

export function ShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useWalletConnection();
  const me = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => null);
  const [checked, setChecked] = useState(false);

  const isLanding = pathname === "/";

  const isProtectedRoute = useMemo(() => {
    return (
      pathname === "/app" ||
      pathname === "/play" ||
      pathname === "/create" ||
      pathname === "/explore" ||
      pathname === "/discover" ||
      pathname.startsWith("/discover/") ||
      pathname === "/wallet" ||
      pathname === "/transactions" ||
      pathname.startsWith("/transactions/") ||
      pathname === "/profile" ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/")
    );
  }, [pathname]);

  // One-time session check when entering protected routes.
  useEffect(() => {
    if (!isProtectedRoute) return;
    if (checked) return;
    setChecked(true);
    authStore.refresh().catch(() => {});
  }, [checked, isProtectedRoute]);

  // Enforce: must have session + wallet connected.
  useEffect(() => {
    if (!isProtectedRoute) return;

    // If we checked and still have no session, bounce to landing.
    if (checked && !me) {
      router.replace(withBasePath("/"));
    }
  }, [checked, isProtectedRoute, me, router, status]);

  // Landing page should feel like a standalone splash/website.
  if (isLanding) return <>{children}</>;

  if (isProtectedRoute && (!checked || !me || status !== "connected")) {
    return (
      <div className="min-h-dvh bg-bg1 text-foreground">
        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="text-lg font-semibold">Connect your wallet to continue</div>
          <div className="text-sm text-muted">
            You need to be wallet-connected and signed in before accessing the app.
          </div>
          <button
            type="button"
            onClick={() => router.replace(withBasePath("/"))}
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Go to sign-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <BottomTabs />
    </>
  );
}

