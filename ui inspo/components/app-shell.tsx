import React from "react";
import { Navbar } from "./navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg1 text-foreground md:min-h-dvh">
      {/* Mobile: lock shell to viewport; scroll only inside main (tabs stay viewport-fixed via portal). */}
      <div className="flex max-md:h-dvh max-md:max-h-dvh max-md:flex-col max-md:overflow-hidden md:contents">
        <div className="shrink-0 md:contents">
          <Navbar />
        </div>
        <main className="arc-app-scroll mx-auto w-full max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom)+var(--arc-tabbar-pad))] pt-6 max-md:min-h-0 md:block md:flex-none md:overflow-visible md:px-6 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
