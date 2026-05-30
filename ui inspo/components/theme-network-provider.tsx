"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type SolanaCluster = "devnet" | "mainnet-beta";

type ThemeNetworkState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cluster: SolanaCluster;
  setCluster: (cluster: SolanaCluster) => void;
};

const ThemeNetworkContext = createContext<ThemeNetworkState | null>(null);

const THEME_KEY = "9tharc.theme";
const CLUSTER_KEY = "9tharc.cluster";

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeNetworkProvider({ children }: { children: React.ReactNode }) {
  // IMPORTANT: keep initial render consistent between SSR and client hydration.
  // Read localStorage after mount to avoid hydration mismatches.
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [cluster, setClusterState] = useState<SolanaCluster>("devnet");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeState(savedTheme);
      }

      const savedCluster = localStorage.getItem(CLUSTER_KEY);
      if (savedCluster === "devnet" || savedCluster === "mainnet-beta") {
        setClusterState(savedCluster);
      }
    } catch {
      // Ignore storage errors (private mode, disabled storage, etc.)
    }
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  const setCluster = (next: SolanaCluster) => {
    setClusterState(next);
    try {
      localStorage.setItem(CLUSTER_KEY, next);
    } catch {}
  };

  const value = useMemo(() => ({ theme, setTheme, cluster, setCluster }), [theme, cluster]);

  return <ThemeNetworkContext.Provider value={value}>{children}</ThemeNetworkContext.Provider>;
}

export function useThemeNetwork() {
  const ctx = useContext(ThemeNetworkContext);
  if (!ctx) throw new Error("useThemeNetwork must be used within ThemeNetworkProvider");
  return ctx;
}

