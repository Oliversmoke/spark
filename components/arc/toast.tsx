"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ToastVariant = "info" | "success" | "error";

export type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4200;

const variantStyles: Record<ToastVariant, string> = {
  info: "border-border-low bg-card text-foreground shadow-[0_16px_40px_-24px_rgba(0,0,0,0.35)]",
  success:
    "border-border-low bg-cream text-foreground shadow-[0_16px_40px_-24px_rgba(0,0,0,0.35)] dark:bg-card",
  error:
    "border-border-strong bg-card text-foreground shadow-[0_16px_40px_-24px_rgba(0,0,0,0.35)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const record: ToastRecord = {
        id,
        message: input.message,
        title: input.title,
        variant: input.variant ?? "info",
        duration: input.duration ?? DEFAULT_DURATION,
      };

      setToasts((current) => [...current, record].slice(-4));

      const timer = window.setTimeout(() => dismiss(id), record.duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed inset-x-0 z-[1150] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        style={{ top: "var(--arc-toast-top)" }}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto w-full max-w-sm animate-[arc-toast-in_220ms_ease-out] rounded border px-4 py-3",
              variantStyles[item.variant ?? "info"]
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {item.title ? (
                  <p className="text-sm font-semibold tracking-tight">{item.title}</p>
                ) : null}
                <p className={cn("text-sm", item.title ? "mt-0.5 text-muted" : "font-medium")}>
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-muted transition hover:bg-cream/60 hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
