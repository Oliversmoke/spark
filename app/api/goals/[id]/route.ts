import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGoal } from "@/lib/services";
import { getActiveCheckpoint, computeCheckpointProgress } from "@/lib/path-utils";
import { Log } from "@/lib/db/models";
import { connectDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await getGoal(session.user.id, id);
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDb();
  const cp = getActiveCheckpoint(goal.path);
  let checkpointProgress = 0;
  if (cp) {
    const logs = await Log.find({
      userId: session.user.id,
      goalId: goal._id,
      checkpointId: cp.id,
      status: { $in: ["completed", "partial"] },
    });
    checkpointProgress = computeCheckpointProgress(
      cp,
      new Set(logs.map((l) => l.taskId))
    );
  }

  return NextResponse.json({
    goal: {
      id: goal._id.toString(),
      title: goal.title,
      path: goal.path,
      pathVersion: goal.pathVersion,
      streak: goal.streak,
      recoveryPlan: goal.recoveryPlan,
      inRecoveryMode: goal.inRecoveryMode,
      status: goal.status,
      templateId: goal.templateId,
      activeCheckpoint: cp,
      checkpointProgress,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await getGoal(session.user.id, id);
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if (body.status) goal.status = body.status;
  await goal.save();

  return NextResponse.json({ ok: true });
}
