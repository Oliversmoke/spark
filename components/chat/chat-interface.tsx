"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RecoveryPlanCard } from "@/components/recovery/recovery-plan-card";
import { WeeklyReviewCard } from "@/components/reviews/weekly-review-card";
import { Send, Loader2, Sparkles, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

const QUICK_PROMPTS = [
  { label: "New goal", text: "I want to learn React in 3 months", icon: Target },
  { label: "Log today", text: "I finished today's tasks", icon: CheckCircle2 },
] as const;

function planFromMetadata(metadata?: Record<string, unknown>) {
  const plan = metadata?.plan;
  if (!plan || typeof plan !== "object") return null;
  return plan as import("@/types").RecoveryPlan;
}

function reviewFromMetadata(metadata?: Record<string, unknown>) {
  const review = metadata?.review;
  if (!review || typeof review !== "object") return null;
  return review as import("@/types").WeeklyReviewDTO;
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

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { id: `temp-${Date.now()}`, role: "user", content: text }]);
    if (!textOverride) setInput("");
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
      if (!textOverride) setInput(text);
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
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border-low bg-card shadow-sm max-md:h-[calc(100dvh-17rem)] md:min-h-[520px]">
      <div
        className="arc-app-scroll flex-1 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="rounded-xl border border-border-low bg-linear-to-br from-cream/50 to-card p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-low bg-card">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">Hey — I&apos;m your ComeBack.ai coach</p>
                <p className="mt-1 text-sm text-muted">
                  Describe a goal, log what you finished today, or ask for help getting back on
                  track.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(({ label, text, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSend(text)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full border border-border-low bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-cream/60 active:scale-[0.98]"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
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
                "max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed transition",
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

      <div className="border-t border-border-low bg-card/80 p-3 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="flex items-end gap-2">
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
              className="min-h-[44px] flex-1 resize-none py-2.5"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="h-11 w-11 shrink-0 rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p id="chat-input-hint" className="mt-1.5 text-center text-[11px] text-muted">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
