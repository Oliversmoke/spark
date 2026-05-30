"use client";

import Link from "next/link";
import { WeeklyReviewCard } from "@/components/reviews/weekly-review-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WeeklyReviewDTO } from "@/types";

export function WeeklyReviewBanner({
  review,
  onApply,
  onDismiss,
}: {
  review: WeeklyReviewDTO;
  onApply: (reviewId: string) => Promise<void>;
  onDismiss: (reviewId: string) => Promise<void>;
}) {
  return (
    <Card className="mb-4 border-border-low bg-cream/40">
      <CardContent className="space-y-3 py-4">
        <WeeklyReviewCard
          review={review}
          onApply={onApply}
          onDismiss={onDismiss}
          compact
        />
        <div className="flex flex-wrap gap-2 border-t border-border-low pt-3">
          <Link href="/progress">
            <Button size="sm" variant="ghost">
              View on Progress
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
