"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PathPreview } from "@/components/goals/path-preview";
import { useToast } from "@/components/arc/toast";
import type { Path } from "@/types";

type WizardStep = "form" | "preview";

export function GoalWizardForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("form");
  const [description, setDescription] = useState("");
  const [timelineWeeks, setTimelineWeeks] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPath, setPreviewPath] = useState<Path | null>(null);
  const [sourceMessage, setSourceMessage] = useState("");

  function buildPrompt() {
    const base = description.trim();
    const weeks = timelineWeeks.trim();
    if (weeks) {
      return `${base}. Target timeline: about ${weeks} weeks.`;
    }
    return base;
  }

  async function generatePreview() {
    const message = buildPrompt();
    if (message.length < 12) {
      toast({
        variant: "error",
        title: "Add more detail",
        message: "Describe what you want to achieve in at least one sentence.",
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, preview: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "error",
          title: data.retryable ? "Try again" : "Could not generate plan",
          message: data.error ?? "Something went wrong.",
          duration: 6000,
        });
        return;
      }

      setPreviewPath(data.path);
      setSourceMessage(message);
      setStep("preview");
      toast({
        variant: "success",
        message: "Plan generated. Review it before saving.",
      });
    } catch {
      toast({ variant: "error", message: "Something went wrong. Try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function saveGoal() {
    if (!previewPath) return;

    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: previewPath.title,
          path: previewPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "error",
          message:
            res.status === 403
              ? `${data.error ?? "Upgrade required"} Visit Pricing to unlock more goals.`
              : (data.error ?? "Could not save goal"),
          duration: 6000,
        });
        return;
      }

      toast({ variant: "success", message: "Goal saved. Your plan is ready." });
      router.push(`/goals/${data.goal.id}`);
    } catch {
      toast({ variant: "error", message: "Could not save goal. Try again." });
    } finally {
      setSaving(false);
    }
  }

  if (step === "preview" && previewPath) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Review your plan</CardTitle>
            <p className="text-sm text-muted">
              Make sure this matches your goal. You can regenerate or save when ready.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={saveGoal} disabled={saving}>
              {saving ? "Saving…" : "Save goal"}
            </Button>
            <Button
              variant="secondary"
              disabled={generating || saving}
              onClick={() => {
                setStep("form");
                void generatePreview();
              }}
            >
              Regenerate
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setStep("form");
                setPreviewPath(null);
              }}
            >
              Edit description
            </Button>
          </CardContent>
        </Card>

        <PathPreview path={previewPath} />

        {sourceMessage ? (
          <p className="text-xs text-muted">
            Based on: &quot;{sourceMessage.slice(0, 120)}
            {sourceMessage.length > 120 ? "…" : ""}&quot;
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Describe your goal</CardTitle>
        <p className="text-sm text-muted">
          Tell us what you want to achieve. AI will build phases, checkpoints, and daily
          tasks.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goal-description">What do you want to accomplish?</Label>
          <Textarea
            id="goal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. "I want to learn React in 3 months and ship a portfolio project"'
            rows={4}
            className="mt-2 min-h-[120px] resize-none"
          />
        </div>

        <div>
          <Label htmlFor="goal-weeks">Target timeline (weeks, optional)</Label>
          <Input
            id="goal-weeks"
            type="number"
            min={1}
            max={104}
            value={timelineWeeks}
            onChange={(e) => setTimelineWeeks(e.target.value)}
            placeholder="12"
            className="mt-2 max-w-[140px]"
          />
        </div>

        <Button onClick={generatePreview} disabled={generating}>
          {generating ? "Generating plan…" : "Generate plan"}
        </Button>
      </CardContent>
    </Card>
  );
}
