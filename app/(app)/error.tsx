"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted" role="alert">
          ComeBack.ai hit a snag. Try again or head back to Today.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/today")}>
            Go to Today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
