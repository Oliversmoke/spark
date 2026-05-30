import { GOAL_TEMPLATES } from "@/lib/templates";
import { assignPathIds } from "@/lib/path-utils";
import { PathSchema, RecoveryPlanSchema, WeeklyReviewSchema } from "@/types";
import type { Path, RecoveryPlan, WeeklyReview } from "@/types";

export { generatePathFromGoal, pathSummary } from "@/lib/ai/generate-path";
export type { GeneratePathResult } from "@/lib/ai/generate-path";

import { GEMINI_MODEL } from "@/lib/ai/config";

async function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(key);
}

async function generateJson<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: () => T
): Promise<T> {
  const client = await getGeminiClient();
  if (!client) return fallback();

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);
    const text = result.response.text();
    return JSON.parse(text) as T;
  } catch {
    return fallback();
  }
}

const RECOVERY_SYSTEM = `You are ComeBack.ai's recovery coach. Help the user restart without shame.
Never shame the user. Acknowledge context. Offer the smallest action to restart (minimum viable day).
Optionally compress timeline or simplify tasks. Ask one clarifying question if the miss reason is unknown.

Output JSON:
{
  "empathyMessage": "warm empathetic message",
  "reason": "brief non-judgmental summary of likely why they missed",
  "minimumViableDay": { "taskTitle": string, "durationMin": number, "instructions": string },
  "adjustedTasks": [{ "taskId": "exact id from missedTasks", "newTitle": string, "frequency": "daily"|"weekly"|"custom" }],
  "checkpointExtensionDays": number,
  "optionalQuestion": string | null
}

Use taskId values exactly from missedTasks. Prefer lighter versions of existing tasks over adding new ones.`;

export async function generateRecoveryPlan(context: {
  goalTitle: string;
  missedTasks: Array<{ id: string; title: string }> | string[];
  daysSilent: number;
  streakState: string;
  streakCurrent?: number;
  nextCheckpoint: string;
  daysRemaining: number;
  userNote?: string;
}): Promise<RecoveryPlan> {
  const missedTasks = Array.isArray(context.missedTasks)
    ? context.missedTasks.map((t) =>
        typeof t === "string" ? { id: "", title: t } : t
      )
    : [];

  const raw = await generateJson(
    RECOVERY_SYSTEM,
    JSON.stringify({ ...context, missedTasks }),
    () => {
      const first = missedTasks[0];
      return {
        empathyMessage:
          "Life happens — missing a day doesn't erase your progress. Let's take one small step today.",
        reason:
          context.daysSilent >= 2
            ? "A couple of quiet days — that's normal when life gets busy."
            : "You missed a check-in, and that's okay.",
        minimumViableDay: {
          taskTitle: first?.title || "10-minute review",
          durationMin: 10,
          instructions:
            "Do the smallest version of your task. Show up for 10 minutes — that's a win.",
        },
        adjustedTasks: first?.id
          ? [
              {
                taskId: first.id,
                newTitle: `${first.title} (lite — 10 min)`,
                frequency: "daily" as const,
              },
            ]
          : [],
        checkpointExtensionDays: context.daysRemaining < 3 ? 3 : 0,
        optionalQuestion: context.userNote
          ? null
          : "What got in the way? I can adjust your plan.",
      };
    }
  );

  let parsed = RecoveryPlanSchema.parse({
    ...raw,
    accepted: false,
    createdAt: new Date().toISOString(),
    triggeredAt: new Date().toISOString(),
  });

  if (parsed.adjustedTasks.length === 0 && missedTasks[0]?.id) {
    parsed = {
      ...parsed,
      adjustedTasks: [
        {
          taskId: missedTasks[0].id,
          newTitle: parsed.minimumViableDay.taskTitle,
          frequency: "daily" as const,
        },
      ],
    };
  }

  return parsed;
}

const REVIEW_SYSTEM = `You are ComeBack.ai's weekly review coach. Summarize the user's actual week using ONLY the log data provided.
Reference specific tasks, completion counts, and patterns from logsJson. Do not invent logs.

Output JSON:
{
  "wins": ["specific win tied to logs", "..."],
  "friction": ["specific friction tied to logs", "..."],
  "suggestion": {
    "type": "add" | "remove" | "resize" | "extend",
    "description": "clear actionable path tweak",
    "taskId": "optional — use exact id from tasksJson for remove/resize",
    "extendDays": 7
  },
  "encouragement": "warm closing line"
}

Suggestion types:
- add: new supporting habit
- remove: drop a non-essential task (requires taskId)
- resize: shorten an existing task duration (requires taskId)
- extend: push checkpoint deadline (extendDays, default 7)`;

export async function generateWeeklyReview(context: {
  goalTitle: string;
  logsJson: string;
  progressJson: string;
  tasksJson?: string;
}): Promise<WeeklyReview> {
  const logs = JSON.parse(context.logsJson) as unknown[];
  const progress = JSON.parse(context.progressJson) as {
    stats?: { completed?: number; total?: number };
  };

  const raw = await generateJson(
    REVIEW_SYSTEM,
    JSON.stringify(context),
    () => {
      const total = progress.stats?.total ?? logs.length;
      const completed = progress.stats?.completed ?? 0;
      return {
        wins: [
          total > 0
            ? `You logged ${total} check-in${total === 1 ? "" : "s"} this week`
            : "You kept your goal visible this week",
          completed > 0
            ? `You completed ${completed} task${completed === 1 ? "" : "s"}`
            : "Every partial effort still counts",
        ],
        friction: [
          total < 5
            ? "Consistency was lighter mid-week — that's normal"
            : "Some tasks were skipped when life got busy",
        ],
        suggestion: {
          type: "resize" as const,
          description:
            "Try reducing your heaviest daily task to 15 minutes to rebuild rhythm.",
        },
        encouragement: "Small steps compound — you're still in the game.",
      };
    }
  );

  return WeeklyReviewSchema.parse(raw);
}

export async function parseChatLog(
  userMessage: string,
  tasksJson: string
): Promise<{
  matches: Array<{
    taskId: string;
    status: "completed" | "partial" | "skipped";
    note: string;
  }>;
  unmatchedIntent: string | null;
}> {
  const tasks = JSON.parse(tasksJson) as Array<{ id: string; title: string }>;

  const raw = await generateJson(
    `Extract task completion from user message. Active tasks: ${tasksJson}. Output JSON: { "matches": [{ "taskId", "status", "note" }], "unmatchedIntent" }. status must be completed|partial|skipped. Match task ids exactly.`,
    userMessage,
    () => ({ matches: [], unmatchedIntent: null })
  );

  if (raw.matches?.length) {
    return raw;
  }

  const { parseTaskLogLocally } = await import("@/lib/logging/parse-task-log");
  const todayTasks = tasks.map((t) => ({
    taskId: t.id,
    taskTitle: t.title,
    goalId: "",
    goalTitle: "",
    checkpointId: "",
    checkpointTitle: "",
    durationMin: 0,
    frequency: "daily" as const,
  }));
  const local = parseTaskLogLocally(userMessage, todayTasks);

  return {
    matches: local,
    unmatchedIntent: local.length === 0 ? null : null,
  };
}

export async function dailyCoachMessage(context: {
  completedCount: number;
  totalCount: number;
  streakDays: number;
  checkpointTitle: string;
  percent: number;
}): Promise<string> {
  const client = await getGeminiClient();
  if (!client) {
    if (context.completedCount === context.totalCount) {
      return `All ${context.totalCount} tasks done! Your ${context.streakDays}-day streak is building momentum.`;
    }
    return `${context.completedCount}/${context.totalCount} done today. One more push on "${context.checkpointTitle}" — you're at ${context.percent}%.`;
  }

  try {
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(
      `User completed ${context.completedCount}/${context.totalCount} tasks. Streak: ${context.streakDays} days. Checkpoint: ${context.checkpointTitle} (${context.percent}%). Reply in 2-3 sentences, max 280 chars, encouraging not preachy.`
    );
    return result.response.text().slice(0, 280);
  } catch {
    return "Keep going — every task logged is progress!";
  }
}

export async function chatReply(
  messages: Array<{ role: string; content: string }>,
  systemContext: string
): Promise<string> {
  const client = await getGeminiClient();
  if (!client) {
    return "I'm your ComeBack.ai coach! Tell me about your goal, log tasks, or ask for help getting back on track.";
  }

  try {
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    const history = messages
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const result = await model.generateContent(
      `${systemContext}\n\nConversation:\n${history}\n\nReply as ComeBack.ai coach, concise and helpful.`
    );
    return result.response.text();
  } catch {
    return "I'm here to help you stay on track. What would you like to work on today?";
  }
}

export function pathFromTemplate(templateId: string): Path | null {
  const template = GOAL_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  return assignPathIds(structuredClone(template.path));
}
