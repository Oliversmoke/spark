"use client";

export function OfflineBanner({
  cachedAt,
  className,
}: {
  cachedAt?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded border border-border-low bg-cream/40 px-4 py-3 text-sm ${className ?? ""}`}
      role="status"
    >
      <p className="font-semibold">You&apos;re offline</p>
      <p className="mt-1 text-muted">
        Showing your last synced Today view
        {cachedAt ? ` from ${new Date(cachedAt).toLocaleString()}` : ""}.
        Logging will sync when you&apos;re back online.
      </p>
    </div>
  );
}
