"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  CalendarCheck,
  TrendingUp,
  Settings,
  Plus,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type Tab = {
  href: string;
  label: string;
  Icon: LucideIcon;
  variant?: "fab" | "default";
};

const tabs: Tab[] = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/today", label: "Today", Icon: CalendarCheck },
  { href: "/goals/new", label: "New", Icon: Plus, variant: "fab" },
  { href: "/progress", label: "Progress", Icon: TrendingUp },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function tabActive(pathname: string, href: string) {
  if (href === "/goals/new") {
    return pathname === "/goals/new" || pathname.startsWith("/goals/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  if (typeof document === "undefined") return null;

  const barSurface = [
    "relative overflow-visible border-t border-border-low/80",
    "bg-card/72 backdrop-blur-xl backdrop-saturate-[1.35]",
    "dark:bg-card/55 dark:border-border-low/60",
    "before:pointer-events-none before:absolute before:inset-0",
    "before:bg-linear-to-b before:from-white/24 before:to-transparent dark:before:from-white/7",
    "after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-white/50 after:to-transparent after:opacity-90 dark:after:via-white/20",
  ].join(" ");

  const nav = (
    <nav
      aria-label="Primary"
      className={`arc-mobile-tabbar pointer-events-auto w-full md:hidden ${barSurface}`}
      style={{
        paddingBottom: "calc(max(env(safe-area-inset-bottom), 6px) + var(--arc-tabbar-pad))",
      }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-5 items-end gap-x-0 px-2 pb-0 pt-2.5">
        {tabs.map((t) => {
          const active = tabActive(pathname, t.href);
          const fab = t.variant === "fab";
          const Icon = t.Icon;

          if (fab) {
            return (
              <div
                key={t.href}
                ref={menuRef}
                className="relative z-10 flex touch-manipulation flex-col items-center gap-2 pb-0"
              >
                {menuOpen ? (
                  <div className="absolute left-1/2 top-0 z-40 w-52 -translate-x-1/2 translate-y-[-210%] overflow-hidden rounded border border-border-low bg-card shadow-[0_18px_70px_-55px_rgba(0,0,0,0.55)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/goals/new");
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-cream/60"
                    >
                      From template
                    </button>
                    <div className="h-px bg-border-low" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/chat");
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-cream/60"
                    >
                      Ask coach <span className="text-xs text-muted">Chat</span>
                    </button>
                  </div>
                ) : null}

                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setMenuOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setMenuOpen((v) => !v);
                    if (e.key === "Escape") setMenuOpen(false);
                  }}
                  className="absolute z-30 grid size-16 shrink-0 translate-y-[-122%] place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
                >
                  <Icon className="h-8 w-8" aria-hidden />
                </span>
                <span className="text-[10px] font-semibold leading-none tracking-tight">
                  {t.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "flex touch-manipulation flex-col items-center gap-2 px-0.5 py-0.5 pb-1 text-[10px] font-semibold leading-none tracking-tight transition active:opacity-80",
                active ? "text-primary" : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-[1.35rem] w-[1.35rem]" aria-hidden />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(nav, document.body);
}
