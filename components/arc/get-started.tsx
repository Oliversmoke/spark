"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/client";

export function GetStarted({ className }: { className?: string }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const linkClass = [
    "inline-flex w-full items-center justify-center rounded bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition hover:opacity-90",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const href = user ? "/home" : "/signup";
  const label = user ? "Open app" : "Get started";

  return (
    <Link href={href} className={linkClass}>
      {label}
    </Link>
  );
}
