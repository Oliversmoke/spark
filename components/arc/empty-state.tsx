"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded border border-border-low bg-card px-6 py-12 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 flex justify-center text-3xl">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-4 inline-block">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
