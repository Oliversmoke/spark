"use client";

import { useAuth } from "@/lib/auth/client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { StandardPageSkeleton } from "./skeleton-ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="px-4 pt-6">
        <StandardPageSkeleton cards={2} />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
