"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GiConsoleController } from "react-icons/gi";
import {
  FiCompass,
  FiCreditCard,
  FiHome,
  FiPlus,
} from "react-icons/fi";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Center FAB: slightly raised above the bar; larger touch target. */
  variant?: "fab" | "default";
};

/** Order: Home · Play · Create (center) · Explore · Wallet */
const tabs: Tab[] = [
  { href: "/app", label: "Home", Icon: FiHome },
  { href: "/play", label: "Play", Icon: GiConsoleController },
  { href: "/create", label: "Create", Icon: FiPlus, variant: "fab" },
  { href: "/explore", label: "Explore", Icon: FiCompass },
  { href: "/wallet", label: "Wallet", Icon: FiCreditCard },
];

function tabActive(pathname: string, href: string) {
  if (href === "/play")
    return pathname === "/play" || pathname.startsWith("/play/");
  if (href === "/create")
    return pathname === "/create" || pathname.startsWith("/create/");
  if (href === "/explore")
    return pathname === "/explore" || pathname.startsWith("/explore/");
  return pathname === href;
}

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  if (typeof document === "undefined") return null;
  const [createOpen, setCreateOpen] = useState(false);
  const createWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = createWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setCreateOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

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
                ref={createWrapRef}
                className="relative z-10 flex touch-manipulation flex-col items-center gap-2 pb-0"
              >
                {createOpen ? (
                  <div className="absolute left-1/2 top-0 z-40 w-55 -translate-x-1/2 translate-y-[-210%] overflow-hidden rounded border border-border-low bg-card shadow-[0_18px_70px_-55px_rgba(0,0,0,0.55)]">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateOpen(false);
                        router.push("/create/posts/new");
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-cream/60"
                    >
                      Content <span className="text-xs text-muted">Post</span>
                    </button>
                    <div className="h-px bg-border-low" />
                    <button
                      type="button"
                      onClick={() => {
                        setCreateOpen(false);
                        router.push("/create?kind=game");
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-cream/60"
                    >
                      Game <span className="text-xs text-muted">Submission</span>
                    </button>
                  </div>
                ) : null}

                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setCreateOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setCreateOpen((v) => !v);
                    if (e.key === "Escape") setCreateOpen(false);
                  }}
                  className={[
                    "z-30 grid size-16 absolute shrink-0 place-items-center rounded-full bg-foreground text-background ring-2 ring-background ring-offset-0",
                    "translate-y-[-122%]",
                  ].join(" ")}
                >
                  <Icon className="text-[2rem] " aria-hidden />
                </span>
                <span className="text-[10px] font-semibold leading-none tracking-tight text-foreground">
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
                active ? "text-foreground" : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="text-[1.35rem]" aria-hidden />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(nav, document.body);
}
