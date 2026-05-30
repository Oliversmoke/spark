import { connectDb } from "@/lib/db";
import { Goal, User } from "@/lib/db/models";
import { generateRecoveryPlan } from "@/lib/ai/gemini";
import { getActiveCheckpoint } from "@/lib/path-utils";
import { saveChatMessage } from "@/lib/services";
import { trackEvent } from "@/lib/rate-limit";
import { buildRecoveryContext } from "@/lib/recovery/context";
import type { RecoveryPlan } from "@/types";

export { buildRecoveryContext } from "@/lib/recovery/context";
export {
  runMissDetection,
  detectGoalsForRecovery,
  detectMissedUsers,
  simulateMissForGoal,
} from "@/lib/recovery/miss-detection";

export async function applyRecoveryPlanToGoal(
  goalId: string,
  plan: RecoveryPlan,
  options?: { userId?: string; track?: boolean }
) {
  await connectDb();
  const goal = await Goal.findById(goalId);
  if (!goal) throw new Error("Goal not found");

  const now = new Date().toISOString();
  goal.recoveryPlan = {
    ...plan,
    accepted: false,
    createdAt: plan.createdAt ?? now,
    triggeredAt: plan.triggeredAt ?? now,
  };
  goal.inRecoveryMode = true;
  goal.streak.state = "recovering";
  await goal.save();

  if (options?.userId) {
    const user = await User.findById(options.userId);
    if (user) {
      user.lastMissAt = new Date();
      user.streak.state = "recovering";
      await user.save();
    }
  }

  if (options?.track !== false) {
    await trackEvent(goal.userId.toString(), "recovery_triggered", {
      goalId: goal._id.toString(),
      daysSilent: buildRecoveryContext(goal).daysSilent,
    });
  }

  await saveChatMessage(
    goal.userId.toString(),
    "assistant",
    plan.empathyMessage,
    goal._id.toString(),
    { type: "recovery", plan: goal.recoveryPlan, goalId: goal._id.toString() }
  );

  return goal;
}

export async function triggerRecoveryForGoal(goalId: string) {
  await connectDb();
  const goal = await Goal.findById(goalId);
  if (!goal || goal.inRecoveryMode) return null;

  const context = buildRecoveryContext(goal);
  const cp = getActiveCheckpoint(goal.path);
  const plan = await generateRecoveryPlan(context);

  if (plan.checkpointExtensionDays > 0 && cp?.dueDate && !plan.newDeadline) {
    const d = new Date(cp.dueDate);
    d.setDate(d.getDate() + plan.checkpointExtensionDays);
    plan.newDeadline = d.toISOString();
  }

  await applyRecoveryPlanToGoal(goalId, plan, {
    userId: goal.userId.toString(),
  });

  return plan;
}

export async function regenerateRecoveryPlan(
  userId: string,
  goalId: string,
  userNote: string
) {
  await connectDb();
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new Error("Goal not found");

  const context = buildRecoveryContext(goal, userNote);
  const cp = getActiveCheckpoint(goal.path);
  const plan = await generateRecoveryPlan(context);

  if (plan.checkpointExtensionDays > 0 && cp?.dueDate && !plan.newDeadline) {
    const d = new Date(cp.dueDate);
    d.setDate(d.getDate() + plan.checkpointExtensionDays);
    plan.newDeadline = d.toISOString();
  }

  plan.accepted = false;
  plan.createdAt = new Date().toISOString();
  plan.triggeredAt = goal.recoveryPlan?.triggeredAt ?? plan.createdAt;

  goal.recoveryPlan = plan;
  goal.inRecoveryMode = true;
  goal.streak.state = "recovering";
  await goal.save();

  await trackEvent(userId, "recovery_adjusted", { goalId, userNote });

  await saveChatMessage(userId, "assistant", plan.empathyMessage, goalId, {
    type: "recovery",
    plan,
    goalId,
    adjusted: true,
  });

  return plan;
}
