import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { incrementAiCalls, trackEvent } from "@/lib/rate-limit";
import { requireAiQuota, aiRemainingHeader } from "@/lib/ai/guard";
import { generatePathFromGoal, pathSummary } from "@/lib/ai/generate-path";
import { connectDb } from "@/lib/db";
import { Goal } from "@/lib/db/models";
import { saveChatMessage } from "@/lib/services";
import { countActiveGoals } from "@/lib/services";
import { User } from "@/lib/db/models";

const bodySchema = z.object({
  message: z.string().trim().min(8, "Describe your goal in more detail"),
  preview: z.boolean().optional(),
  replaceGoalId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request", retryable: true },
      { status: 400 }
    );
  }

  const { message, preview, replaceGoalId } = parsed.data;

  const quota = await requireAiQuota(session.user.id);
  if (!quota.allowed) return quota.response;
  const { remaining } = quota;

  await connectDb();
  const user = await User.findById(session.user.id);
  const activeCount = await countActiveGoals(session.user.id);
  if (user?.subscriptionTier !== "pro" && activeCount >= 1 && !replaceGoalId && !preview) {
    return NextResponse.json(
      { error: "Free tier allows 1 active goal.", retryable: false },
      { status: 403 }
    );
  }

  const generated = await generatePathFromGoal(message);
  if (!generated.ok) {
    return NextResponse.json(
      { error: generated.error, retryable: generated.retryable },
      { status: generated.retryable ? 422 : 503 }
    );
  }

  await incrementAiCalls(session.user.id);

  const { path, source } = generated;
  const summary = pathSummary(path);

  if (preview) {
    return NextResponse.json(
      {
        preview: true,
        path,
        source,
        summary,
        aiRemaining: remaining - 1,
      },
      { headers: aiRemainingHeader(remaining - 1) }
    );
  }

  if (!replaceGoalId && user?.subscriptionTier !== "pro" && activeCount >= 1) {
    return NextResponse.json(
      { error: "Free tier allows 1 active goal.", retryable: false },
      { status: 403 }
    );
  }

  await saveChatMessage(session.user.id, "user", message);

  let goal;
  if (replaceGoalId) {
    goal = await Goal.findOneAndUpdate(
      { _id: replaceGoalId, userId: session.user.id },
      { title: path.title, path, pathVersion: 1, status: "active" },
      { new: true }
    );
  } else {
    goal = await Goal.create({
      userId: session.user.id,
      title: path.title,
      path,
      status: "active",
    });
  }

  const goalId = goal?._id.toString();
  const reply = `I've created your path "${path.title}" — ${summary.phaseCount} phases, ${summary.checkpointCount} checkpoints, ${summary.taskCount} tasks. View your plan or head to Today for your first tasks.`;

  await saveChatMessage(session.user.id, "assistant", reply, goalId, {
    type: "plan_created",
    goalId,
    pathTitle: path.title,
  });

  await trackEvent(session.user.id, "ai_plan_generated", { source });

  return NextResponse.json(
    {
      path,
      goalId,
      reply,
      source,
      summary,
      aiRemaining: remaining - 1,
    },
    { headers: aiRemainingHeader(remaining - 1) }
  );
}
