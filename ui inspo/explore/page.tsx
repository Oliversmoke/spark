import dynamicImport from "next/dynamic";
import { Suspense } from "react";

import { getMergedCatalog } from "@/lib/catalog/approved";
import { ExploreCatalogSkeleton } from "../components/skeleton-ui";

export const dynamic = "force-dynamic";

const ExploreClient = dynamicImport(
  () => import("./explore-client").then((m) => m.ExploreClient),
  { loading: () => <ExploreCatalogSkeleton /> },
);

export default async function ExplorePage() {
  const catalog = await getMergedCatalog();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Explore</p>
        <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
        <p className="text-sm text-muted">Games, posts, and people.</p>
      </header>

      <Suspense fallback={<ExploreCatalogSkeleton />}>
        <ExploreClient items={catalog} />
      </Suspense>
    </div>
  );
}
