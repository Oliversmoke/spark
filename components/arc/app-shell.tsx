"use client";

import { Navbar } from "./navbar";
import { BottomTabs } from "./bottom-tabs";
import { OnboardingGate } from "./onboarding-gate";
import { SkipLink } from "./skip-link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg1 text-foreground md:min-h-dvh">
      <SkipLink />
      <div className="flex max-md:h-dvh max-md:max-h-dvh max-md:flex-col max-md:overflow-hidden md:contents">
        <div className="shrink-0 md:contents">
          <Navbar />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="arc-app-scroll mx-auto w-full max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom)+var(--arc-tabbar-pad))] pt-4 max-md:min-h-0 md:block md:flex-none md:overflow-visible md:px-6 md:pb-10 md:pt-6"
        >
          {children}
        </main>
        <BottomTabs />
        <OnboardingGate />
      </div>
    </div>
  );
}
