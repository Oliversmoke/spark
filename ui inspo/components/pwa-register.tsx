"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    // Register even on localhost so you can test installability/offline.
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (isLocalhost) console.log("[PWA] SW registered", reg.scope);
      })
      .catch((err) => {
        if (isLocalhost) console.warn("[PWA] SW registration failed", err);
      });
  }, []);

  return null;
}

