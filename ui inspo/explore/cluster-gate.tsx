"use client";

import Link from "next/link";
import { useThemeNetwork } from "../components/theme-network-provider";

export function ClusterGate({ allowed }: { allowed: Array<"devnet" | "mainnet-beta"> }) {
  const { cluster, setCluster } = useThemeNetwork();
  const ok = allowed.includes(cluster);
  if (ok) return null;

  const other = cluster === "devnet" ? "mainnet-beta" : "devnet";

  return (
    <div className="rounded border border-border-low bg-cream px-4 py-4">
      <div className="text-sm font-semibold text-foreground">Not available on {cluster}</div>
      <div className="mt-1 text-sm text-muted">
        This item is only available on {allowed.join(" or ")}. Switch clusters to view or unlock it.
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCluster(other)}
          className="rounded bg-foreground px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90"
        >
          Switch to {other === "mainnet-beta" ? "Mainnet" : "Devnet"}
        </button>
        <Link
          href="/explore"
          className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
        >
          Back to Explore
        </Link>
      </div>
    </div>
  );
}

