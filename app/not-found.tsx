import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg1 px-6 text-foreground">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded border border-border-low bg-card">
          <PhoneCall className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          This screen doesn&apos;t exist. Head back to your coach or today&apos;s tasks.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/home">
            <Button>Go home</Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary">Open coach</Button>
          </Link>
          <Link href="/today">
            <Button variant="secondary">Go to Today</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
