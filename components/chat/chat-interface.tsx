"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RecoveryPlanCard } from "@/components/recovery/recovery-plan-card";
import { WeeklyReviewCard } from "@/components/reviews/weekly-review-card";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecoveryPlan, WeeklyReviewDTO } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  goalId?: string;
}

interface SendResult {
  reply: string;
  goalId?: string;
  metadata?: Record<string, unknown>;
}

interface ChatInterfaceProps {
  initialMessages?: Message[];
  onSend: (message: string) => Promise<SendResult>;
  placeholder?: string;
  recoveryGoalId?: string;
  onAcceptRecovery?: (goalId: string) => Promise<void>;
  onAdjustRecovery?: (goalId: string, userNote: string) => Promise<void>;
  onApplyReview?: (reviewId: string) => Promise<void>;
  onDismissReview?: (reviewId: string) => Promise<void>;
}

function planFromMetadata(metadata?: Record<string, unknown>): RecoveryPlan | null {
  const plan = metadata?.plan;
  if (!plan || typeof plan !== "object") return null;
  return plan as RecoveryPlan;
}

function reviewFromMetadata(metadata?: Record<string, unknown>): WeeklyReviewDTO | null {
  const review = metadata?.review;
  if (!review || typeof review !== "object") return null;
  return review as WeeklyReviewDTO;
}

function messageGoalId(msg: Message) {
  if (typeof msg.metadata?.goalId === "string") return msg.metadata.goalId;
  if (msg.goalId) return msg.goalId;
  return null;
}

export function ChatInterface({
  initialMessages = [],
  onSend,
  placeholder = "Tell me your goal or log progress…",
  onAcceptRecovery,
  onAdjustRecovery,
  onApplyReview,
  onDismissReview,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvedReviews, setResolvedReviews] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { id: `temp-${Date.now()}`, role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { reply, goalId, metadata } = await onSend(text);
      setMessages((m) => [
        ...m,
        {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: reply,
          goalId,
          metadata: metadata ?? (goalId ? { type: "plan_created", goalId } : undefined),
        },
      ]);
    } catch {
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyReview(reviewId: string) {
    if (!onApplyReview) return;
    await onApplyReview(reviewId);
    setResolvedReviews((prev) => new Set(prev).add(reviewId));
  }

  async function handleDismissReview(reviewId: string) {
    if (!onDismissReview) return;
    await onDismissReview(reviewId);
    setResolvedReviews((prev) => new Set(prev).add(reviewId));
  }

  return (
    <div className="flex min-h-[420px] flex-col rounded border border-border-low bg-card max-md:h-[calc(100dvh-17rem)] md:min-h-[520px]">
      <div
        className="arc-app-scroll flex-1 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="rounded border border-border-low bg-cream/40 p-4 text-sm">
            <p className="font-semibold">Hey — I&apos;m your ComeBack.ai coach.</p>
            <p className="mt-1 text-muted">
              Tell me a goal like &quot;I want to learn React in 3 months&quot; or log
              tasks like &quot;finished my workout today&quot;.
            </p>
          </div>
        )}
        {messages.map((msg, index) => {
          const createdGoalId =
            msg.metadata?.type === "plan_created" && typeof msg.metadata.goalId === "string"
              ? msg.metadata.goalId
              : null;
          const recoveryPlan = planFromMetadata(msg.metadata);
          const weeklyReview = reviewFromMetadata(msg.metadata);
          const msgGoalId = messageGoalId(msg);
          const isRecoveryMessage =
            msg.metadata?.type === "recovery" ||
            msg.metadata?.type === "recovery_accepted";
          const isWeeklyReviewMessage =
            msg.metadata?.type === "weekly_review" ||
            msg.metadata?.type === "weekly_review_accepted" ||
            msg.metadata?.type === "weekly_review_dismissed";
          const planAccepted =
            recoveryPlan?.accepted === true ||
            msg.metadata?.type === "recovery_accepted";
          const reviewResolved =
            msg.metadata?.type === "weekly_review_accepted" ||
            msg.metadata?.type === "weekly_review_dismissed" ||
            (weeklyReview ? resolvedReviews.has(weeklyReview.id) : false);

          return (
            <div
              key={msg.id}
              className={cn(
                "max-w-[92%] rounded px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-foreground text-background"
                  : "border border-border-low bg-bg1"
              )}
              role="article"
              aria-label={`${msg.role === "user" ? "You" : "Coach"}: message ${index + 1}`}
            >
              {isRecoveryMessage && recoveryPlan && msgGoalId ? (
                <RecoveryPlanCard
                  plan={recoveryPlan}
                  goalId={msgGoalId}
                  accepted={planAccepted}
                  onAccept={onAcceptRecovery}
                  onAdjust={onAdjustRecovery}
                />
              ) : isWeeklyReviewMessage && weeklyReview ? (
                <WeeklyReviewCard
                  review={weeklyReview}
                  onApply={onApplyReview ? handleApplyReview : undefined}
                  onDismiss={onDismissReview ? handleDismissReview : undefined}
                  resolved={reviewResolved}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {createdGoalId ? (
                <Link href={`/goals/${createdGoalId}`}>
                  <Button
                    size="sm"
                    className="mt-3"
                    variant={msg.role === "user" ? "secondary" : "default"}
                  >
                    View plan
                  </Button>
                </Link>
              ) : null}
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border-low p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={2}
              aria-label="Message"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              aria-describedby="chat-input-hint"
              className="min-h-[44px] resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p id="chat-input-hint" className="sr-only">
            Enter to send, Shift+Enter for a new line
          </p>
        </form>
      </div>
    </div>
  );
}
