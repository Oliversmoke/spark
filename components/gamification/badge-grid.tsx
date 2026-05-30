"use client";

import { BADGE_META, type BadgeId } from "@/types";
import { BadgeIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

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
              "rounded-xl border p-4 transition hover:shadow-sm",
              isEarned
                ? "border-border-low bg-cream/40"
                : "border-border-low bg-card opacity-60"
            )}
          >
            <div className="flex items-start gap-3">
              <BadgeIcon name={meta.icon} earned={isEarned} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{meta.name}</p>
                <p className="mt-1 text-xs text-muted">{meta.description}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {isEarned ? (
                    "Earned"
                  ) : (
                    <>
                      <Lock className="h-3 w-3" aria-hidden />
                      Locked
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
