import dynamic from "next/dynamic";

import { StandardPageSkeleton } from "../components/skeleton-ui";

const TransactionsClient = dynamic(
  () => import("./transactions-client").then((m) => m.TransactionsClient),
  { loading: () => <StandardPageSkeleton cards={2} /> },
);

export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Wallet</p>
        <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="max-w-5xl text-base leading-relaxed text-muted">
          Your GamePass activity feed (cluster-aware): purchases, spends, rewards, and withdrawals.
        </p>
      </header>

      <TransactionsClient />
    </div>
  );
}

