import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { incrementAiCalls } from "@/lib/rate-limit";
import { requireAiQuota } from "@/lib/ai/guard";
import { generateRecoveryPlan } from "@/lib/ai/gemini";
import {
  getGoal,
  saveChatMessage,
  acceptRecoveryPlan,
  listGoals,
} from "@/lib/services";
import {
  applyRecoveryPlanToGoal,
  buildRecoveryContext,
  regenerateRecoveryPlan,
} from "@/lib/recovery";
import { getActiveCheckpoint } from "@/lib/path-utils";
import { z } from "zod";

const postSchema = z.object({
  goalId: z.string().min(1).optional(),
  accept: z.boolean().optional(),
  adjust: z.boolean().optional(),
  userNote: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await listGoals(session.user.id);
  const recovering = goals
    .filter((g) => g.inRecoveryMode && g.recoveryPlan)
    .map((g) => ({
      goalId: g._id.toString(),
      title: g.title,
      streak: g.streak,
      recoveryPlan: g.recoveryPlan,
    }));

  return NextResponse.json({ recovering });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { goalId, accept, adjust, userNote } = parsed.data;

  if (accept && goalId) {
    try {
      const goal = await acceptRecoveryPlan(session.user.id, goalId);
      return NextResponse.json({
        ok: true,
        recoveryPlan: goal.recoveryPlan,
        pathVersion: goal.pathVersion,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not accept plan" },
        { status: 400 }
      );
    }
  }

  if (adjust && goalId) {
    if (!userNote?.trim()) {
      return NextResponse.json(
        { error: "Tell the coach what got in the way so we can adjust." },
        { status: 400 }
      );
    }

    const quota = await requireAiQuota(session.user.id);
    if (!quota.allowed) return quota.response;

    try {
      const plan = await regenerateRecoveryPlan(
        session.user.id,
        goalId,
        userNote.trim()
      );
      await incrementAiCalls(session.user.id);
      return NextResponse.json({ plan });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not adjust plan" },
        { status: 400 }
      );
    }
  }

  if (!goalId) {
    return NextResponse.json({ error: "goalId required" }, { status: 400 });
  }

  const quota = await requireAiQuota(session.user.id);
  if (!quota.allowed) return quota.response;

  const goal = await getGoal(session.user.id, goalId);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const context = buildRecoveryContext(goal, userNote);
  const cp = getActiveCheckpoint(goal.path);
  const plan = await generateRecoveryPlan(context);

  if (plan.checkpointExtensionDays > 0 && cp?.dueDate && !plan.newDeadline) {
    const d = new Date(cp.dueDate);
    d.setDate(d.getDate() + plan.checkpointExtensionDays);
    plan.newDeadline = d.toISOString();
  }

  await incrementAiCalls(session.user.id);
  await applyRecoveryPlanToGoal(goalId, plan, {
    userId: session.user.id,
    track: true,
  });

  if (userNote?.trim()) {
    await saveChatMessage(session.user.id, "user", userNote.trim(), goalId);
  }

  return NextResponse.json({ plan });
}
