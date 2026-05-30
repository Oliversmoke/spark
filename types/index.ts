import { z } from "zod";

export const TaskFrequencySchema = z.enum(["daily", "weekly", "custom"]);
export type TaskFrequency = z.infer<typeof TaskFrequencySchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  frequency: TaskFrequencySchema,
  durationMin: z.number().int().positive(),
  isMinimumViable: z.boolean().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CheckpointSchema = z.object({
  id: z.string(),
  title: z.string(),
  criteria: z.string(),
  dueInDays: z.number().int().positive(),
  dueDate: z.string().datetime().optional(),
  tasks: z.array(TaskSchema).min(1),
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const PhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  checkpoints: z.array(CheckpointSchema).min(1),
});
export type Phase = z.infer<typeof PhaseSchema>;

export const PathSchema = z.object({
  title: z.string(),
  durationWeeks: z.number().int().positive(),
  phases: z.array(PhaseSchema).min(1).max(5),
});
export type Path = z.infer<typeof PathSchema>;

export const LogStatusSchema = z.enum([
  "completed",
  "partial",
  "skipped",
  "failed",
]);
export type LogStatus = z.infer<typeof LogStatusSchema>;

export const StreakStateSchema = z.enum([
  "active",
  "at-risk",
  "broken",
  "recovering",
]);
export type StreakState = z.infer<typeof StreakStateSchema>;

export const RecoveryPlanSchema = z.object({
  empathyMessage: z.string(),
  reason: z.string().optional(),
  minimumViableDay: z.object({
    taskTitle: z.string(),
    durationMin: z.number().int().positive(),
    instructions: z.string(),
  }),
  adjustedTasks: z
    .array(
      z.object({
        taskId: z.string(),
        newTitle: z.string(),
        frequency: TaskFrequencySchema,
      })
    )
    .default([]),
  checkpointExtensionDays: z.number().int().nonnegative().default(0),
  newDeadline: z.string().datetime().optional(),
  optionalQuestion: z.string().nullable().optional(),
  accepted: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  triggeredAt: z.string().datetime().optional(),
});
export type RecoveryPlan = z.infer<typeof RecoveryPlanSchema>;

export const WeeklyReviewSchema = z.object({
  wins: z.array(z.string()).min(1),
  friction: z.array(z.string()).min(1),
  suggestion: z.object({
    type: z.enum(["add", "remove", "resize", "extend"]),
    description: z.string(),
    taskId: z.string().optional(),
    checkpointId: z.string().optional(),
    extendDays: z.number().int().positive().optional(),
  }),
  encouragement: z.string(),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

export type WeeklyReviewDTO = WeeklyReview & {
  id: string;
  goalId: string;
  goalTitle: string;
  status?: "pending" | "accepted" | "rejected";
  weekStats?: {
    completed: number;
    partial: number;
    skipped: number;
    failed: number;
    total: number;
    weekStart: string;
    weekEnd: string;
  };
};

export const BadgeIdSchema = z.enum([
  "first_log",
  "streak_7",
  "first_checkpoint",
  "recovery_hero",
  "level_5",
]);
export type BadgeId = z.infer<typeof BadgeIdSchema>;

export const BADGE_META: Record<
  BadgeId,
  { name: string; description: string; icon: string }
> = {
  first_log: {
    name: "First Log",
    description: "Logged your first task",
    icon: "🎯",
  },
  streak_7: {
    name: "7-Day Streak",
    description: "Maintained a 7-day active streak",
    icon: "🔥",
  },
  first_checkpoint: {
    name: "First Checkpoint",
    description: "Completed your first checkpoint",
    icon: "🏁",
  },
  recovery_hero: {
    name: "Recovery Hero",
    description: "Bounced back within 72 hours of a miss",
    icon: "💪",
  },
  level_5: {
    name: "Level 5",
    description: "Reached level 5",
    icon: "⭐",
  },
};

export interface TodayTask {
  taskId: string;
  taskTitle: string;
  goalId: string;
  goalTitle: string;
  checkpointId: string;
  checkpointTitle: string;
  durationMin: number;
  frequency: TaskFrequency;
  loggedToday?: LogStatus;
  logId?: string;
}

export interface TodayGoalSummary {
  goalId: string;
  goalTitle: string;
  checkpointId: string;
  checkpointTitle: string;
  checkpointProgress: number;
  checkpointCriteria: string;
  tasksDueToday: number;
  tasksLoggedToday: number;
}

export interface LogEntryDTO {
  id: string;
  goalId: string;
  goalTitle: string;
  taskId: string;
  taskTitle: string;
  checkpointTitle?: string;
  status: LogStatus;
  note?: string;
  loggedAt: string;
}

export interface TodayViewResponse {
  tasks: TodayTask[];
  goals: TodayGoalSummary[];
}

export interface ProgressSummary {
  xp: number;
  level: number;
  xpToNextLevel: number;
  xpProgress: number;
  badges: BadgeId[];
  streak: {
    current: number;
    longest: number;
    state: StreakState;
    graceDays: number;
  };
  goals: Array<{
    id: string;
    title: string;
    checkpointProgress: number;
    activeCheckpoint: string;
    streakState: StreakState;
    inRecovery: boolean;
  }>;
  weeklyReview?: WeeklyReviewDTO;
}

export interface ChatMessageDTO {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
