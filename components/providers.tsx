"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth/client";
import { ThemeProvider } from "@/components/arc/theme-provider";
import { ToastProvider } from "@/components/arc/toast";
import { AnalyticsScripts, PageViewTracker } from "@/lib/analytics/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AnalyticsScripts />
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
