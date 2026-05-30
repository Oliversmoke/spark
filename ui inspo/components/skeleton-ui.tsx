import React from "react";

/** Theme-aware shimmer using CSS variables (`--card`, `--cream`, `--border-low`). */
export function ShimmerBlock({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["arc-shimmer rounded-md", className].filter(Boolean).join(" ")} {...props} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <ShimmerBlock className={["h-4 w-full", className].join(" ")} />;
}

export function SkeletonTitle() {
  return <ShimmerBlock className="h-9 w-2/3 max-w-md" />;
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

/** Full-viewport landing-style placeholder (no AppShell). */
export function LandingPageSkeleton() {
  return (
    <div className="min-h-dvh bg-bg1 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ShimmerBlock className="h-10 w-32 rounded-xl" />
          <ShimmerBlock className="h-10 w-40 rounded-full" />
        </div>
        <ShimmerBlock className="mx-auto h-64 w-full max-w-lg rounded-2xl md:h-80" />
        <div className="space-y-3 text-center">
          <ShimmerBlock className="mx-auto h-12 w-4/5 max-w-xl" />
          <ShimmerBlock className="mx-auto h-5 w-3/5 max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Default in-app column layout (matches AppShell inner padding). */
export function StandardPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <ShimmerBlock className="h-4 w-24" />
        <SkeletonTitle />
        <ShimmerBlock className="h-5 max-w-3xl" />
        <ShimmerBlock className="h-5 max-w-2xl" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function PlayGridSkeleton() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <ShimmerBlock className="h-4 w-20" />
        <SkeletonTitle />
        <ShimmerBlock className="h-5 max-w-3xl" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}

export function GamePlayerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ShimmerBlock className="h-4 w-28" />
        <ShimmerBlock className="h-10 w-3/4 max-w-lg" />
        <ShimmerBlock className="h-4 w-full max-w-2xl" />
      </div>
      <ShimmerBlock className="aspect-video w-full max-w-3xl rounded-xl border border-border-low" />
      <div className="flex flex-wrap gap-3">
        <ShimmerBlock className="h-11 w-36 rounded-xl" />
        <ShimmerBlock className="h-11 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>
      <div className="rounded border border-border-low bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border-low p-4 last:border-b-0">
            <ShimmerBlock className="h-5 w-1/3" />
            <ShimmerBlock className="mt-2 h-4 w-full" />
            <ShimmerBlock className="mt-1 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiscoverListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ShimmerBlock className="h-10 flex-1 min-w-30 rounded-lg" />
        <ShimmerBlock className="h-10 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-between gap-4 rounded border border-border-low bg-card p-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerBlock className="h-5 w-48" />
            <ShimmerBlock className="h-4 w-full max-w-md" />
          </div>
          <ShimmerBlock className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ExploreCatalogSkeleton() {
  return (
    <div className="space-y-6">
      <ShimmerBlock className="h-10 w-full max-w-md rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}

/** Matches explore page header + filter + grid while catalog loads. */
export function ExplorePageSkeleton() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <ShimmerBlock className="h-4 w-24" />
        <SkeletonTitle />
        <ShimmerBlock className="h-5 max-w-3xl" />
        <ShimmerBlock className="h-5 max-w-2xl" />
        <ShimmerBlock className="h-4 w-48" />
      </header>
      <ExploreCatalogSkeleton />
    </div>
  );
}

/** Discover page: header + member list area. */
export function DiscoverPageSkeleton() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <ShimmerBlock className="h-4 w-32" />
        <SkeletonTitle />
        <ShimmerBlock className="h-5 max-w-3xl" />
        <ShimmerBlock className="h-4 w-56" />
      </header>
      <DiscoverListSkeleton />
    </div>
  );
}

export function ContentDetailSkeleton() {
  return (
    <div className="space-y-8">
      <ShimmerBlock className="aspect-21/9 w-full max-w-3xl rounded-xl" />
      <SkeletonTitle />
      <div className="space-y-2">
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-4/5" />
      </div>
      <ShimmerBlock className="h-12 w-44 rounded-xl" />
    </div>
  );
}

/** Placeholder under existing header while a heavy client body loads. */
export function ContentBodySkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerBlock key={i} className={i % 4 === 0 ? "h-5 w-full" : "h-4 w-full"} />
      ))}
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <SkeletonTitle />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <ShimmerBlock className="h-12 w-36 rounded-xl" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-6">
        <ShimmerBlock className="h-24 w-24 shrink-0 rounded-full border border-border-low" />
        <div className="min-w-0 flex-1 space-y-3">
          <ShimmerBlock className="h-8 w-48" />
          <ShimmerBlock className="h-4 w-full max-w-md" />
          <ShimmerBlock className="h-4 w-2/3" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded border border-border-low bg-card p-4">
            <ShimmerBlock className="h-3 w-20" />
            <ShimmerBlock className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>
      <ShimmerBlock className="h-64 w-full rounded-xl border border-border-low" />
    </div>
  );
}
