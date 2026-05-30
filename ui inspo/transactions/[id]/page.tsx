import dynamic from "next/dynamic";

import { StandardPageSkeleton } from "../../components/skeleton-ui";

const TransactionDetailClient = dynamic(
  () => import("./transaction-detail-client").then((m) => m.TransactionDetailClient),
  { loading: () => <StandardPageSkeleton cards={2} /> },
);

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetailClient id={id} />;
}

