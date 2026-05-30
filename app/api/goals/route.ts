import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listGoals, countActiveGoals } from "@/lib/services";
import { connectDb } from "@/lib/db";
import { Goal } from "@/lib/db/models";
import { pathFromTemplate } from "@/lib/ai/gemini";
import { assignPathIds } from "@/lib/path-utils";
import { PathSchema } from "@/types";
import { User } from "@/lib/db/models";
import { trackEvent } from "@/lib/rate-limit";
import { FREE_ACTIVE_GOAL_LIMIT } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await listGoals(session.user.id);
  return NextResponse.json({
    goals: goals.map((g) => ({
      id: g._id.toString(),
      title: g.title,
      status: g.status,
      templateId: g.templateId,
      streak: g.streak,
      inRecoveryMode: g.inRecoveryMode,
      recoveryPlan: g.recoveryPlan,
      pathVersion: g.pathVersion,
      createdAt: g.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  await connectDb();

  const user = await User.findById(session.user.id);
  const activeCount = await countActiveGoals(session.user.id);
  const isPro = user?.subscriptionTier === "pro";

  if (!isPro && activeCount >= FREE_ACTIVE_GOAL_LIMIT && body.status !== "archived") {
    return NextResponse.json(
      {
        error: `Free tier allows ${FREE_ACTIVE_GOAL_LIMIT} active goals. Upgrade to Pro for unlimited.`,
      },
      { status: 403 }
    );
  }

  let path = body.path;
  if (body.templateId) {
    path = pathFromTemplate(body.templateId);
    if (!path) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  }

  if (path) {
    path = PathSchema.parse(assignPathIds(path));
  } else {
    return NextResponse.json({ error: "Path or templateId required" }, { status: 400 });
  }

  const goal = await Goal.create({
    userId: session.user.id,
    title: body.title || path.title,
    path,
    templateId: body.templateId,
    status: "active",
  });

  await trackEvent(session.user.id, body.templateId ? "template_goal_created" : "goal_created", {
    templateId: body.templateId,
  });

  return NextResponse.json({ goal: { id: goal._id.toString(), title: goal.title } });
}
