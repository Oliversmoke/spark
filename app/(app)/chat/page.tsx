"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { RecoveryBanner } from "@/components/arc/recovery-banner";
import { WeeklyReviewBanner } from "@/components/arc/weekly-review-banner";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { useToast } from "@/components/arc/toast";
import { useChatHistory, useGoals } from "@/lib/hooks/use-callback-data";
import { isGoalCreationIntent } from "@/lib/goal-intent";
import type { WeeklyReviewDTO } from "@/types";

export default function ChatPage() {
  const { messages, loading: chatLoading, refresh: refreshChat } = useChatHistory();
  const { recoveringGoal, refresh: refreshGoals } = useGoals();
  const { toast } = useToast();
  const [pendingReview, setPendingReview] = useState<WeeklyReviewDTO | null>(null);

  useEffect(() => {
    fetch("/api/ai/review")
      .then((r) => r.json())
      .then((data) => setPendingReview(data.pending ?? null))
      .catch(() => {});
  }, [messages]);

  const handleSend = useCallback(
    async (message: string) => {
      if (isGoalCreationIntent(message)) {
        const res = await fetch("/api/ai/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast({
            variant: "error",
            title: data.upgradeRequired ? "Upgrade to Pro" : data.retryable ? "Try again" : "Could not create goal",
            message: data.error ?? "Something went wrong.",
            duration: 8000,
          });
          throw new Error(data.error ?? "Could not create goal");
        }

        await refreshGoals();
        await refreshChat();
        toast({
          variant: "success",
          title: "Goal created",
          message: `"${data.path?.title ?? "Your goal"}" is ready.`,
        });
        return {
          reply: data.reply,
          goalId: data.goalId,
          metadata: { type: "plan_created", goalId: data.goalId },
        };
      }

      const res = await fetch("/api/tasks/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "error",
          title: data.upgradeRequired ? "Upgrade to Pro" : "Could not send message",
          message: data.error ?? "Could not send message",
          duration: data.upgradeRequired ? 8000 : 5000,
        });
        throw new Error(data.error ?? "Could not send message");
      }
      await refreshChat();

      if (data.logsCreated > 0) {
        let toastMessage = data.reply;
        if (data.xpGain > 0 && !data.reply.includes(`${data.xpGain} XP`)) {
          toastMessage = `+${data.xpGain} XP · ${data.reply}`;
        }
        if (data.levelUp) toastMessage += " · Level up!";
        if (data.badgesEarned?.length) {
          toastMessage += ` · Badge: ${data.badgesEarned.map((b: { name: string }) => b.name).join(", ")}`;
        }
        toast({
          variant: "success",
          title: "Tasks logged",
          message: toastMessage,
        });
      }

      return {
        reply: data.reply,
        metadata:
          data.logsCreated > 0
            ? { type: "tasks_logged", logsCreated: data.logsCreated }
            : undefined,
      };
    },
    [refreshGoals, refreshChat, toast]
  );

  const acceptRecovery = useCallback(
    async (goalId: string) => {
      const res = await fetch("/api/ai/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, accept: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", message: data.error ?? "Could not accept plan." });
        throw new Error(data.error);
      }
      await refreshGoals();
      await refreshChat();
      toast({
        variant: "success",
        title: "Recovery plan accepted",
        message: "+25 XP · Your tasks are updated. Log your minimum step today.",
      });
    },
    [refreshChat, refreshGoals, toast]
  );

  const adjustRecovery = useCallback(
    async (goalId: string, userNote: string) => {
      const res = await fetch("/api/ai/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, adjust: true, userNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", message: data.error ?? "Could not adjust plan." });
        throw new Error(data.error);
      }
      await refreshGoals();
      await refreshChat();
      toast({
        variant: "success",
        message: "Plan adjusted based on your note.",
      });
    },
    [refreshChat, refreshGoals, toast]
  );

  const applyReview = useCallback(
    async (reviewId: string) => {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, accept: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", message: data.error ?? "Could not apply tweak." });
        throw new Error(data.error);
      }
      setPendingReview(null);
      await refreshChat();
      toast({
        variant: "success",
        message: data.pathVersion
          ? `Plan updated to v${data.pathVersion}.`
          : "Weekly tweak applied.",
      });
    },
    [refreshChat, toast]
  );

  const dismissReview = useCallback(
    async (reviewId: string) => {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, accept: false }),
      });
      if (!res.ok) {
        toast({ variant: "error", message: "Could not dismiss review." });
        throw new Error("Could not dismiss review");
      }
      setPendingReview(null);
      await refreshChat();
      toast({ variant: "info", message: "Keeping your current plan." });
    },
    [refreshChat, toast]
  );

  if (chatLoading) {
    return <StandardPageSkeleton cards={1} />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 max-md:-mx-1 max-md:flex-1">
      {recoveringGoal ? (
        <RecoveryBanner
          goalId={recoveringGoal.id}
          goalTitle={recoveringGoal.title}
          message={recoveringGoal.recoveryPlan?.empathyMessage}
          plan={recoveringGoal.recoveryPlan}
          accepted={recoveringGoal.recoveryPlan?.accepted}
          onAccept={acceptRecovery}
          onAdjust={adjustRecovery}
        />
      ) : null}

      {pendingReview ? (
        <WeeklyReviewBanner
          review={pendingReview}
          onApply={applyReview}
          onDismiss={dismissReview}
        />
      ) : null}

      <ChatInterface
        className="max-md:min-h-0 max-md:flex-1"
        initialMessages={messages}
        onSend={handleSend}
        recoveryGoalId={recoveringGoal?.id}
        onAcceptRecovery={acceptRecovery}
        onAdjustRecovery={adjustRecovery}
        onApplyReview={applyReview}
        onDismissReview={dismissReview}
      />
    </div>
  );
}
