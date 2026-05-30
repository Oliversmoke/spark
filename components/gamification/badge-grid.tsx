"use client";

import { BADGE_META, type BadgeId } from "@/types";
import { cn } from "@/lib/utils";

export function BadgeGrid({ badges }: { badges: BadgeId[] | string[] }) {
  const earned = new Set(badges);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(BADGE_META) as BadgeId[]).map((id) => {
        const meta = BADGE_META[id];
        const isEarned = earned.has(id);

        return (
          <div
            key={id}
            className={cn(
              "rounded border p-4 transition",
              isEarned
                ? "border-border-low bg-cream/40"
                : "border-border-low bg-card opacity-50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden>
                {meta.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{meta.name}</p>
                <p className="mt-1 text-xs text-muted">{meta.description}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {isEarned ? "Earned" : "Locked"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
