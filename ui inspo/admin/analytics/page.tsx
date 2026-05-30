import dynamic from "next/dynamic";

import { AnalyticsSkeleton } from "../../components/skeleton-ui";

const AnalyticsClient = dynamic(
  () => import("./analytics-client").then((m) => m.AnalyticsClient),
  { loading: () => <AnalyticsSkeleton /> }
);

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Admin · Analytics</p>
        <h2 className="text-xl font-semibold tracking-tight">Dashboards</h2>
        <p className="max-w-3xl text-sm text-muted">
          Funnel, economy, and safety signals derived from MongoDB (sessions, ledger, accruals, withdrawals, audit).
          Tune the date range and cluster; max window 366 days.
        </p>
      </div>
      <AnalyticsClient />
    </div>
  );
}
