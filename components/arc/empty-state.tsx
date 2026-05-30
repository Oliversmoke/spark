"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyStateIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
  iconVariant = "sparkles",
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  iconVariant?: "clipboard" | "sparkles" | "message" | "default";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-low bg-card px-6 py-12 text-center shadow-sm",
        className
      )}
    >
      {icon ?? <EmptyStateIcon variant={iconVariant} />}
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-5 inline-block">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
