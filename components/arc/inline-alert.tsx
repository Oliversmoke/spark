import { cn } from "@/lib/utils";

export function InlineAlert({
  variant = "info",
  children,
  className,
}: {
  variant?: "info" | "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-border-low bg-cream/40 text-foreground",
    error: "border-red-300/40 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100",
    success: "border-border-low bg-cream/60 text-foreground",
  };

  return (
    <div
      className={cn(
        "rounded border px-4 py-3 text-sm",
        styles[variant],
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}
