"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { authStore } from "./auth-store";
import { SettingsBar } from "./settings-bar";
import { withBasePath } from "./base-path";

function truncateMiddle(addr: string, headChars = 4, tailChars = 4) {
  const a = addr.trim();
  if (a.length <= headChars + tailChars + 1) return a;
  return `${a.slice(0, headChars)}…${a.slice(-tailChars)}`;
}

const links = [
  { href: "/app", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/create", label: "Create" },
  { href: "/explore", label: "Explore" },
  { href: "/wallet", label: "Wallet" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => null,
  );
  const { disconnect, wallet, status } = useWalletConnection();
  const walletAddress =
    wallet?.account?.address != null
      ? wallet.account.address.toString()
      : (me?.walletAddress ?? null);
  const staff = me?.roles?.some(
    (r) => r === "admin" || r === "superadmin" || r === "moderator",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target))
        setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function logoutAndDisconnect() {
    setMenuOpen(false);
    try {
      await authStore.logout();
    } finally {
      await disconnect().catch(() => {});
      router.replace(withBasePath("/"));
    }
  }

  const menuLinkBase =
    "block px-4 py-2 text-sm font-semibold transition hover:bg-cream/60";

  function menuLinkClasses(active: boolean) {
    return [
      menuLinkBase,
      active ? "bg-cream text-foreground" : "text-muted hover:text-foreground",
    ].join(" ");
  }

  const isSettingsActive = pathname === "/settings";
  const isProfileActive = pathname === "/profile";
  const isTransactionsActive =
    pathname === "/transactions" || pathname.startsWith("/transactions/");
  const isAppealsActive = pathname === "/appeals";
  const isAdminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header
      className="sticky top-0 z-40 isolate px-3 py-3 md:px-5 md:py-4"
      style={{ zIndex: 1100 }}
    >
      <div
        className={[
          "relative mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-visible rounded",
          "border border-border-low/80",
          "bg-card/58 backdrop-blur-xl backdrop-saturate-[1.35]",
          "px-4 py-3.5 md:px-6 md:py-4",
          "dark:border-border-low/55 dark:bg-card/48",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-linear-to-b before:from-white/22 before:to-transparent",
          "dark:before:from-white/6",
          "after:pointer-events-none after:absolute after:inset-x-4 after:top-0 after:h-px after:max-w-[min(100%,42rem)] after:rounded-full after:bg-linear-to-r after:from-transparent after:via-white/45 after:to-transparent after:opacity-90 dark:after:via-white/18",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <Link href="/app" className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded border border-border-low bg-card">
              <Image
                src="/9tharclogo.png"
                alt="9thArc"
                fill
                className="object-contain"
                priority={false}
              />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wider text-muted">
                9THARC
              </div>
            </div>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <nav className="flex min-w-0 items-center gap-5" aria-label="Primary">
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "text-sm font-semibold transition",
                    active
                      ? "text-foreground"
                      : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  <span>{label}</span>
                </Link>
              );
            })}
            {staff ? (
              <Link
                href="/admin"
                className={[
                  "text-sm font-semibold transition",
                  isAdminActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="shrink-0 flex items-center gap-1" ref={menuRef}>
          <SettingsBar />
          {me ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-low bg-card/50 transition hover:bg-cream/60"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {me.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={me.avatarUrl}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-muted">
                    {(
                      me.displayName?.trim()?.[0] ??
                      me.walletAddress?.[0] ??
                      "U"
                    ).toUpperCase()}
                  </span>
                )}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  style={{ zIndex: 1200 }}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded border border-border-low bg-card shadow-[0_30px_100px_-70px_rgba(0,0,0,0.75)]"
                >
                  <div className="border-b border-border-low px-4 py-3 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Wallet
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {status === "connected"
                        ? "Connected"
                        : status === "connecting"
                          ? "Connecting…"
                          : "Disconnected"}
                    </p>
                    {status === "connected" && walletAddress ? (
                      <p
                        className="mt-1 truncate font-mono text-[11px] leading-snug text-muted"
                        title={walletAddress}
                      >
                        {truncateMiddle(walletAddress)}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isProfileActive ? "page" : undefined}
                    className={menuLinkClasses(isProfileActive)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isSettingsActive ? "page" : undefined}
                    className={menuLinkClasses(isSettingsActive)}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/transactions"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isTransactionsActive ? "page" : undefined}
                    className={menuLinkClasses(isTransactionsActive)}
                  >
                    Transactions
                  </Link>
                  <Link
                    href="/appeals"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isAppealsActive ? "page" : undefined}
                    className={menuLinkClasses(isAppealsActive)}
                  >
                    Appeals
                  </Link>
                  {staff ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      aria-current={isAdminActive ? "page" : undefined}
                      className={menuLinkClasses(isAdminActive)}
                    >
                      Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => logoutAndDisconnect()}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-muted hover:bg-cream/60 hover:text-foreground"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
