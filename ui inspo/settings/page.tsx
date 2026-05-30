"use client";

import { SettingsBar } from "../components/settings-bar";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted">Theme and network preferences.</p>
      </header>

      <section className="rounded border border-border-low bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">App settings</div>
            <div className="mt-1 text-xs text-muted">These are saved on this device.</div>
          </div>
          <SettingsBar showCluster />
        </div>
      </section>
    </div>
  );
}

