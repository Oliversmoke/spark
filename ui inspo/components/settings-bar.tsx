"use client";

import React from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { SolanaCluster, useThemeNetwork } from "./theme-network-provider";

export function SettingsBar({ showCluster = true }: { showCluster?: boolean }) {
  const { theme, setTheme, cluster, setCluster } = useThemeNetwork();
  const isDark = theme === "dark";

  return (
    <div className="flex w-full items-center justify-end gap-2">
      {showCluster ? (
        <>
          <label className="sr-only" htmlFor="cluster-select">
            Cluster
          </label>
          <select
            id="cluster-select"
            value={cluster}
            onChange={(e) => setCluster(e.target.value as SolanaCluster)}
            className="h-10 bg-transparent px-1 text-sm font-semibold text-foreground outline-none"
          >
            <option value="devnet">Devnet</option>
            <option value="mainnet-beta">Mainnet</option>
          </select>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground transition hover:bg-cream/60"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        {isDark ? <FiSun className="text-lg" aria-hidden /> : <FiMoon className="text-lg" aria-hidden />}
      </button>
    </div>
  );
}

