"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function SettingsBar() {
  const { isDark, setTheme, theme } = useTheme();

  return (
    <div className="flex w-full items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground transition hover:bg-cream/60"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "system" ? "Theme: system" : isDark ? "Light mode" : "Dark mode"}
      >
        {isDark ? (
          <Sun className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        ) : (
          <Moon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        )}
      </button>
    </div>
  );
}
