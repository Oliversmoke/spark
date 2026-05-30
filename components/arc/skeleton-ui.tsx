import React from "react";

export function ShimmerBlock({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["arc-shimmer rounded-md", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded border border-border-low bg-card/80 p-5 shadow-sm">
      <ShimmerBlock className="h-5 w-1/2" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerBlock key={i} className={i === lines - 1 ? "h-4 w-4/5" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  );
}

export function StandardPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <ShimmerBlock className="h-4 w-24" />
        <ShimmerBlock className="h-9 w-2/3 max-w-md" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
