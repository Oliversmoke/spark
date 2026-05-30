"use client";

import Link from "next/link";
import { PhoneCall, Check } from "lucide-react";
import { SettingsBar } from "@/components/arc/settings-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Stripe not configured yet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg1 px-4 py-12 text-foreground md:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded border border-border-low bg-card">
              <PhoneCall className="h-4 w-4" aria-hidden />
            </div>
            <span className="text-sm font-semibold tracking-wider text-muted">COMEBACK.AI</span>
          </Link>
          <SettingsBar />
        </header>

        <h1 className="text-3xl font-semibold tracking-tight">Simple pricing</h1>
        <p className="mt-2 text-muted">Start free. Upgrade when you need more.</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <p className="text-3xl font-semibold">$0</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                "20 active goals",
                "100 AI coach messages",
                "Recovery coach",
                "XP & streaks",
              ].map((f) => (
                <p key={f} className="flex items-center gap-2 text-muted">
                  <Check className="h-4 w-4 shrink-0" /> {f}
                </p>
              ))}
              <Link href="/login">
                <Button className="mt-4 w-full" variant="secondary">
                  Get started
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <p className="text-3xl font-semibold">
                $9<span className="text-base font-normal text-muted">/mo</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                "Unlimited active goals",
                "Unlimited AI coaching",
                "Advanced weekly reviews",
                "Priority recovery coaching",
                "Data export",
              ].map((f) => (
                <p key={f} className="flex items-center gap-2 text-muted">
                  <Check className="h-4 w-4 shrink-0" /> {f}
                </p>
              ))}
              <Button className="mt-4 w-full" onClick={checkout} disabled={loading}>
                {loading ? "Loading…" : "Upgrade to Pro"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
