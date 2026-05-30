import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardList,
  Dumbbell,
  Flag,
  Flame,
  Globe,
  HeartPulse,
  Laptop,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  AlertTriangle,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
  laptop: Laptop,
  dumbbell: Dumbbell,
  globe: Globe,
  "book-open": BookOpen,
  // legacy emoji keys from API
  "💻": Laptop,
  "🏋️": Dumbbell,
  "🌍": Globe,
  "📚": BookOpen,
};

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  flame: Flame,
  flag: Flag,
  "heart-pulse": HeartPulse,
  star: Star,
};

export function TemplateIcon({
  name,
  className,
  ...props
}: { name: string } & LucideProps) {
  const Icon = TEMPLATE_ICON_MAP[name] ?? Sparkles;
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-low bg-cream/50",
        className
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5 text-foreground" {...props} />
    </span>
  );
}

export function BadgeIcon({
  name,
  className,
  earned,
  ...props
}: { name: string; earned?: boolean } & LucideProps) {
  const Icon = BADGE_ICON_MAP[name] ?? Star;
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
        earned
          ? "border-border-low bg-cream/60"
          : "border-border-low bg-card",
        className
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5" {...props} />
    </span>
  );
}

export function StreakFlameIcon({
  state,
  className,
}: {
  state: "active" | "at-risk" | "broken" | "recovering";
  className?: string;
}) {
  if (state === "at-risk") {
    return <AlertTriangle className={cn("h-4 w-4 text-foreground", className)} aria-hidden />;
  }
  return (
    <Flame
      className={cn(
        "h-4 w-4",
        state === "broken" ? "text-muted" : "text-foreground",
        className
      )}
      aria-hidden
    />
  );
}

export function EmptyStateIcon({
  variant = "sparkles",
  className,
}: {
  variant?: "clipboard" | "sparkles" | "message" | "default";
  className?: string;
}) {
  const Icon =
    variant === "clipboard"
      ? ClipboardList
      : variant === "message"
        ? MessageCircle
        : Sparkles;
  return (
    <span
      className={cn(
        "mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border-low bg-cream/40",
        className
      )}
      aria-hidden
    >
      <Icon className="h-7 w-7 text-foreground" />
    </span>
  );
}
