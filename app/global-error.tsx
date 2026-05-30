"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-bg1 text-foreground antialiased">
        <div className="mx-auto flex min-h-dvh max-w-lg items-center p-4">
          <Card className="w-full">
            <CardContent className="py-12 text-center">
              <h1 className="text-lg font-semibold">ComeBack.ai hit a snag</h1>
              <p className="mt-2 text-sm text-muted" role="alert">
                {error.message || "Something unexpected happened."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={reset}>Try again</Button>
                <Button variant="secondary" onClick={() => (window.location.href = "/today")}>
                  Go to Today
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
