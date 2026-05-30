"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { PhoneCall } from "lucide-react";
import { SettingsBar } from "./settings-bar";

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/today", label: "Today" },
  { href: "/goals/new", label: "Goals" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await signOutUser();
    router.replace("/");
  }

  const initials =
    user?.name?.trim()?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "C";

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
        <Link href="/chat" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded border border-border-low bg-card">
            <PhoneCall className="h-4 w-4 text-foreground" aria-hidden />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wider text-muted">
              COMEBACK.AI
            </div>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Primary">
          <div className="flex items-center gap-5">
            {links.map(({ href, label }) => {
              const active =
                href === "/goals/new"
                  ? pathname.startsWith("/goals")
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "text-sm font-semibold transition",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/pricing"
              className={[
                "text-sm font-semibold transition",
                pathname === "/pricing"
                  ? "text-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              Pricing
            </Link>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1" ref={menuRef}>
          <SettingsBar />
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-low bg-card/50 text-xs font-bold text-muted transition hover:bg-cream/60"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {initials}
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  style={{ zIndex: 1200 }}
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded border border-border-low bg-card shadow-[0_30px_100px_-70px_rgba(0,0,0,0.75)]"
                >
                  <div className="border-b border-border-low px-4 py-3">
                    <p className="truncate text-sm font-semibold">
                      {user.name ?? "Coach"}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/goals/new"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
                  >
                    New goal
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
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
