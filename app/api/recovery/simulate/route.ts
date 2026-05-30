import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { simulateMissForGoal } from "@/lib/recovery";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_RECOVERY_SIMULATE) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json();
  const goalId = body.goalId?.trim();
  if (!goalId) {
    return NextResponse.json({ error: "goalId required" }, { status: 400 });
  }

  try {
    const result = await simulateMissForGoal(session.user.id, goalId);
    return NextResponse.json({
      ok: true,
      goalId: result.goalId,
      plan: result.plan,
      message:
        "Simulated 3-day silence. Recovery plan generated — check Chat or Today.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Simulation failed" },
      { status: 400 }
    );
  }
}
