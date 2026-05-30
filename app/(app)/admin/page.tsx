"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/arc/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";

type AdminStats = {
  users: number;
  activeGoals: number;
  templateGoals: number;
  totalLogs: number;
  inRecovery: number;
  signups: number;
  taskLogs: number;
  weeklyReviews: number;
  recovery: {
    triggered: number;
    accepted: number;
    completed: number;
    atRiskEvents: number;
    recoveryRate: number;
    acceptanceRate: number;
  };
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) {
          setError("Admin access required");
          return;
        }
        const d = await r.json();
        setStats(d.stats);
      })
      .catch(() => setError("Failed to load"));
  }, []);

  return (
    <>
      <PageHeader
        label="Internal"
        title="Admin"
        description="Beta metrics — users, logs, templates, recovery."
      />

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            {error}. Set ADMIN_EMAILS in env.
            <br />
            <Link href="/chat" className="mt-2 inline-block font-semibold underline-offset-2 hover:underline">
              Back to app
            </Link>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Users", stats.users],
              ["Signups", stats.signups],
              ["Active goals", stats.activeGoals],
              ["Template goals", stats.templateGoals],
              ["Task logs", stats.taskLogs],
              ["Weekly reviews", stats.weeklyReviews],
              ["In recovery", stats.inRecovery],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardHeader>
                  <CardTitle className="text-sm">{label as string}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{value as number}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recovery funnel</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Triggered" value={stats.recovery.triggered} />
              <Stat label="Accepted" value={stats.recovery.accepted} />
              <Stat label="Completed" value={stats.recovery.completed} />
              <Stat label="Recovery rate" value={`${stats.recovery.recoveryRate}%`} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <StandardPageSkeleton cards={3} />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-border-low bg-cream/20 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
