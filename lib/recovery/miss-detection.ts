import { connectDb } from "@/lib/db";
import { Goal, User } from "@/lib/db/models";
import { daysSinceLastLog } from "@/lib/gamification";
import { syncAllActiveStreaks } from "@/lib/gamification/streak-sync";
import { trackEvent } from "@/lib/rate-limit";
import { triggerRecoveryForGoal } from "@/lib/recovery";

export async function runMissDetection(limit = 50) {
  await syncAllActiveStreaks();
  await connectDb();

  const activeGoals = await Goal.find({ status: "active" }).limit(limit);
  let atRiskCount = 0;

  for (const goal of activeGoals) {
    const lastLogAt = goal.streak?.lastLogAt ?? null;
    const graceDays = goal.streak?.graceDays ?? 1;
    const days = daysSinceLastLog(lastLogAt);

    if (!lastLogAt || days <= 0) continue;

    if (days === graceDays && goal.streak?.state === "at-risk") {
      atRiskCount++;
      await trackEvent(goal.userId.toString(), "recovery_at_risk", {
        goalId: goal._id.toString(),
        daysSilent: days,
      });
    }
  }

  const goalsNeedingRecovery = await detectGoalsForRecovery(limit);
  const triggered: string[] = [];

  for (const goal of goalsNeedingRecovery) {
    const plan = await triggerRecoveryForGoal(goal._id.toString());
    if (plan) triggered.push(goal._id.toString());
  }

  return {
    atRiskCount,
    recoveryTriggered: triggered.length,
    goalIds: triggered,
  };
}

export async function detectGoalsForRecovery(limit = 50) {
  await connectDb();
  const goals = await Goal.find({
    status: "active",
    inRecoveryMode: false,
  }).limit(limit * 2);

  return goals
    .filter((goal) => {
      const lastLogAt = goal.streak?.lastLogAt;
      if (!lastLogAt) return false;
      const graceDays = goal.streak?.graceDays ?? 1;
      const days = daysSinceLastLog(lastLogAt);
      return days > graceDays;
    })
    .slice(0, limit);
}

export async function detectMissedUsers() {
  return detectGoalsForRecovery();
}

export async function simulateMissForGoal(userId: string, goalId: string) {
  await connectDb();
  const goal = await Goal.findOne({ _id: goalId, userId, status: "active" });
  if (!goal) throw new Error("Goal not found");

  const missDate = new Date();
  missDate.setDate(missDate.getDate() - 3);
  missDate.setHours(12, 0, 0, 0);

  goal.streak.lastLogAt = missDate;
  goal.streak.state = "broken";
  goal.streak.current = 0;
  goal.inRecoveryMode = false;
  goal.recoveryPlan = undefined;
  await goal.save();

  const user = await User.findById(userId);
  if (user) {
    user.streak.lastLogAt = missDate;
    user.streak.state = "broken";
    user.streak.current = 0;
    user.lastMissAt = missDate;
    await user.save();
  }

  const plan = await triggerRecoveryForGoal(goalId);
  return { goalId, plan };
}
