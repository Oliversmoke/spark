"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/arc/page-header";
import { GoalWizardForm } from "@/components/goals/goal-wizard-form";
import { TemplateGallery } from "@/components/goals/template-gallery";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type CreateMode = "wizard" | "templates";

export default function NewGoalPage() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>("wizard");

  return (
    <>
      <PageHeader
        label="Goals"
        title="New goal"
        description="Generate a custom path with AI, pick a template, or describe your goal in Chat."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div
          className="grid grid-cols-2 gap-1 rounded border border-border-low bg-cream/30 p-1"
          role="tablist"
          aria-label="Goal creation mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "wizard"}
            onClick={() => setMode("wizard")}
            className={cn(
              "rounded px-3 py-2 text-sm font-semibold transition",
              mode === "wizard"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            Describe goal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "templates"}
            onClick={() => setMode("templates")}
            className={cn(
              "rounded px-3 py-2 text-sm font-semibold transition",
              mode === "templates"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            Templates
          </button>
        </div>

        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          Or create in Chat
        </Link>
      </div>

      {mode === "wizard" ? (
        <GoalWizardForm />
      ) : (
        <TemplateGallery onCreated={(goalId) => router.push(`/goals/${goalId}`)} />
      )}
    </>
  );
}
