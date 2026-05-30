"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren, useMemo } from "react";

import { autoDiscover, createClient } from "@solana/client";
import { SolanaCluster, ThemeNetworkProvider, useThemeNetwork } from "./theme-network-provider";

function clusterEndpoint(cluster: SolanaCluster) {
  if (cluster === "mainnet-beta") return "https://api.mainnet-beta.solana.com";
  return "https://api.devnet.solana.com";
}

function SolanaClientProvider({ children }: PropsWithChildren) {
  const { cluster } = useThemeNetwork();

  const client = useMemo(
    () =>
      createClient({
        endpoint: clusterEndpoint(cluster),
        walletConnectors: autoDiscover(),
      }),
    [cluster]
  );

  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeNetworkProvider>
      <SolanaClientProvider>{children}</SolanaClientProvider>
    </ThemeNetworkProvider>
  );
}
