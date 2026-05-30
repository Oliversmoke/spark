"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
  }
}

export function trackClientEvent(
  name: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;

  const payload = props
    ? Object.fromEntries(
        Object.entries(props).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v])
      )
    : undefined;

  if (window.plausible) {
    window.plausible(name, payload ? { props: payload as Record<string, string | number> } : undefined);
  }

  if (window.posthog) {
    window.posthog.capture(name, props);
  }
}

export function AnalyticsScripts() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!domain) return null;

  return (
    <>
      <script defer data-domain={domain} src="https://plausible.io/js/script.js" />
    </>
  );
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) return;
    const query = searchParams?.toString();
    trackClientEvent("pageview", {
      path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
