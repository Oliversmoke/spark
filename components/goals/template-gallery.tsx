"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PathPreview } from "@/components/goals/path-preview";
import { EmptyState } from "@/components/arc/empty-state";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { TemplateIcon } from "@/components/icons/app-icons";
import { useToast } from "@/components/arc/toast";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid } from "lucide-react";
import type { Path } from "@/types";

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  category: "skill" | "fitness" | "habit";
  icon: string;
  durationWeeks: number;
  phaseCount: number;
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "skill", label: "Skills" },
  { id: "fitness", label: "Fitness" },
  { id: "habit", label: "Habits" },
] as const;

export function TemplateGallery({
  onCreated,
}: {
  onCreated?: (goalId: string) => void;
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<Path | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPreviewPath(null);
      return;
    }

    setPreviewLoading(true);
    fetch(`/api/templates/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setPreviewPath(d.template?.path ?? null))
      .finally(() => setPreviewLoading(false));
  }, [selectedId]);

  const filtered =
    category === "all"
      ? templates
      : templates.filter((t) => t.category === category);

  async function createFromTemplate(templateId: string) {
    setCreating(true);
    try {
      const template = templates.find((t) => t.id === templateId);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, title: template?.name }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "error",
          message:
            res.status === 403
              ? `${data.error ?? "Goal limit reached"} Visit Pricing for unlimited.`
              : (data.error ?? "Failed to create goal"),
          duration: 6000,
        });
        return;
      }

      toast({ variant: "success", message: "Goal created from template." });
      onCreated?.(data.goal.id);
    } catch {
      toast({ variant: "error", message: "Something went wrong. Try again." });
    } finally {
      setCreating(false);
    }
  }

  if (fetching) {
    return <StandardPageSkeleton cards={2} />;
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        title="No templates yet"
        description="Templates will appear here when available. Use Describe goal or Chat instead."
        actionLabel="Describe a goal"
        actionHref="/goals/new"
        iconVariant="sparkles"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <LayoutGrid className="h-4 w-4" aria-hidden />
        <span>Pick a proven path — tap to preview, then start when ready.</span>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Template categories"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={category === cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "rounded border px-3 py-1.5 text-sm font-semibold transition",
              category === cat.id
                ? "border-border-low bg-card text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((t) => (
          <Card
            key={t.id}
            className={cn(
              "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md",
              selectedId === t.id && "ring-2 ring-foreground/20"
            )}
            onClick={() => setSelectedId(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedId(t.id);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={selectedId === t.id}
            aria-label={`Preview ${t.name} template`}
          >
            <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
              <TemplateIcon name={t.icon} />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>
                <p className="mt-2 text-xs font-medium text-muted">
                  {t.durationWeeks} weeks · {t.phaseCount} phase
                  {t.phaseCount === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 shrink-0 text-muted transition",
                  selectedId === t.id && "translate-x-0.5 text-foreground"
                )}
                aria-hidden
              />
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedId ? (
        <div className="space-y-4 rounded border border-border-low bg-cream/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Template preview</p>
              <p className="text-xs text-muted">
                Review checkpoints and tasks before starting.
              </p>
            </div>
            <Button
              size="sm"
              disabled={creating || previewLoading || !previewPath}
              onClick={() => createFromTemplate(selectedId)}
              className="gap-1"
            >
              {creating ? "Creating…" : "Start this template"}
              {!creating ? <ChevronRight className="h-4 w-4" /> : null}
            </Button>
          </div>

          {previewLoading ? (
            <StandardPageSkeleton cards={1} />
          ) : previewPath ? (
            <PathPreview path={previewPath} />
          ) : null}
        </div>
      ) : (
        <p className="rounded border border-dashed border-border-low py-8 text-center text-sm text-muted">
          Select a template above to preview its full path.
        </p>
      )}
    </div>
  );
}
