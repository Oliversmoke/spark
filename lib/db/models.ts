import mongoose, { Schema, models, model } from "mongoose";
import type { BadgeId, Path, RecoveryPlan, StreakState } from "@/types";

const NotificationPrefsSchema = new Schema(
  {
    emailEnabled: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: "09:00" },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "07:00" },
    weeklyReviewDay: { type: Number, default: 0 },
    timezone: { type: String, default: "UTC" },
    lastPushDate: { type: String },
    lastAtRiskPushDate: { type: String },
    lastRecoveryPushDate: { type: String },
  },
  { _id: false }
);

const PushSubscriptionSchema = new Schema(
  {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    passwordHash: { type: String, select: false },
    image: { type: String },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String }],
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastLogAt: { type: Date },
      graceDays: { type: Number, default: 1 },
      state: {
        type: String,
        enum: ["active", "at-risk", "broken", "recovering"],
        default: "active",
      },
    },
    notificationPrefs: { type: NotificationPrefsSchema, default: () => ({}) },
    pushSubscriptions: [PushSubscriptionSchema],
    subscriptionTier: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    stripeCustomerId: { type: String },
    aiCallsToday: { type: Number, default: 0 },
    aiCallsTotal: { type: Number, default: 0 },
    aiCallsResetAt: { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    lastRecoveryAt: { type: Date },
    lastMissAt: { type: Date },
  },
  { timestamps: true }
);

export type IUser = mongoose.InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User =
  models.User || model("User", UserSchema);

const TaskSchema = new Schema(
  {
    id: String,
    title: String,
    frequency: { type: String, enum: ["daily", "weekly", "custom"] },
    durationMin: Number,
    isMinimumViable: Boolean,
  },
  { _id: false }
);

const CheckpointSchema = new Schema(
  {
    id: String,
    title: String,
    criteria: String,
    dueInDays: Number,
    dueDate: String,
    tasks: [TaskSchema],
    completed: { type: Boolean, default: false },
    completedAt: String,
  },
  { _id: false }
);

const PhaseSchema = new Schema(
  {
    id: String,
    name: String,
    checkpoints: [CheckpointSchema],
  },
  { _id: false }
);

const PathSchema = new Schema(
  {
    title: String,
    durationWeeks: Number,
    phases: [PhaseSchema],
  },
  { _id: false }
);

const RecoveryPlanSchema = new Schema(
  {
    empathyMessage: String,
    reason: String,
    minimumViableDay: {
      taskTitle: String,
      durationMin: Number,
      instructions: String,
    },
    adjustedTasks: [
      {
        taskId: String,
        newTitle: String,
        frequency: String,
      },
    ],
    checkpointExtensionDays: { type: Number, default: 0 },
    newDeadline: String,
    optionalQuestion: String,
    accepted: { type: Boolean, default: false },
    createdAt: String,
    triggeredAt: String,
  },
  { _id: false }
);

const GoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    path: { type: PathSchema, required: true },
    pathVersion: { type: Number, default: 1 },
    templateId: { type: String },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
    },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastLogAt: { type: Date },
      graceDays: { type: Number, default: 1 },
      state: {
        type: String,
        enum: ["active", "at-risk", "broken", "recovering"],
        default: "active",
      },
    },
    recoveryPlan: RecoveryPlanSchema,
    inRecoveryMode: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type IGoal = mongoose.InferSchemaType<typeof GoalSchema> & {
  _id: mongoose.Types.ObjectId;
  path: Path;
  streak: {
    current: number;
    longest: number;
    lastLogAt?: Date;
    graceDays: number;
    state: StreakState;
  };
  recoveryPlan?: RecoveryPlan;
};

export const Goal = models.Goal || model("Goal", GoalSchema);

const LogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", index: true },
    taskId: { type: String, required: true },
    checkpointId: { type: String },
    status: {
      type: String,
      enum: ["completed", "partial", "skipped", "failed"],
      required: true,
    },
    note: { type: String },
    value: { type: Schema.Types.Mixed },
    loggedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export type ILog = mongoose.InferSchemaType<typeof LogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Log = models.Log || model("Log", LogSchema);

const ChatMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type IChatMessage = mongoose.InferSchemaType<typeof ChatMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChatMessage =
  models.ChatMessage || model("ChatMessage", ChatMessageSchema);

const WeeklyReviewRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", index: true },
    review: {
      wins: [String],
      friction: [String],
      suggestion: {
        type: { type: String },
        description: String,
        taskId: String,
        checkpointId: String,
      },
      encouragement: String,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    weekStart: { type: Date },
    weekEnd: { type: Date },
  },
  { timestamps: true }
);

export const WeeklyReviewRecord =
  models.WeeklyReviewRecord ||
  model("WeeklyReviewRecord", WeeklyReviewRecordSchema);

const AnalyticsEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    event: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AnalyticsEvent =
  models.AnalyticsEvent || model("AnalyticsEvent", AnalyticsEventSchema);

const AuthRateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    windowStart: { type: Date, required: true },
  },
  { timestamps: true }
);

export const AuthRateLimit =
  models.AuthRateLimit || model("AuthRateLimit", AuthRateLimitSchema);

export type { BadgeId };
