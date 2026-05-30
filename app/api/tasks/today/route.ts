import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getTodayView,
  createLog,
  saveChatMessage,
} from "@/lib/services";
import { parseChatLog, chatReply } from "@/lib/ai/gemini";
import { parseTaskLogLocally } from "@/lib/logging/parse-task-log";
import { checkRateLimit, incrementAiCalls } from "@/lib/rate-limit";
import { aiRemainingHeader } from "@/lib/ai/guard";
import { getActiveCheckpoint, computeCheckpointProgress } from "@/lib/path-utils";
import { getGoal } from "@/lib/services";
import { Log, User } from "@/lib/db/models";
import { connectDb } from "@/lib/db";
import { BADGE_META } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const view = await getTodayView(session.user.id);
  return NextResponse.json(view);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === "chat") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    await saveChatMessage(session.user.id, "user", message);

    const { tasks } = await getTodayView(session.user.id);
    const { allowed } = await checkRateLimit(session.user.id);

    let reply = "";
    let logsCreated = 0;
    const loggedTasks: string[] = [];
    let xpGain = 0;
    let levelUp = false;
    const badgesEarned = new Set<string>();

    if (tasks.length === 0) {
      reply =
        "You don't have tasks due today yet. Create a goal first, then log progress here or on the Today tab.";
    } else if (allowed) {
      const parsed = await parseChatLog(
        message,
        JSON.stringify(tasks.map((t) => ({ id: t.taskId, title: t.taskTitle })))
      );
      await incrementAiCalls(session.user.id);

      let matches = parsed.matches;
      if (matches.length === 0) {
        matches = parseTaskLogLocally(message, tasks);
      }

      for (const match of matches) {
        const task = tasks.find((t) => t.taskId === match.taskId);
        if (task) {
          const result = await createLog(session.user.id, {
            goalId: task.goalId,
            taskId: task.taskId,
            checkpointId: task.checkpointId,
            status: match.status,
            note: match.note,
          });
          logsCreated++;
          loggedTasks.push(task.taskTitle);
          xpGain += result.xpGain;
          if (result.levelUp) levelUp = true;
          result.badgesEarned.forEach((id) => badgesEarned.add(id));
        }
      }

      if (logsCreated > 0) {
        reply = `Logged ${logsCreated} task${logsCreated > 1 ? "s" : ""}: ${loggedTasks.join(", ")}.`;
        if (xpGain > 0) reply += ` +${xpGain} XP`;
        if (levelUp) reply += " · Level up!";
        if (badgesEarned.size > 0) {
          reply += ` · Badge${badgesEarned.size > 1 ? "s" : ""}: ${Array.from(badgesEarned)
            .map((id) => BADGE_META[id as keyof typeof BADGE_META]?.name ?? id)
            .join(", ")}`;
        }
      } else if (parsed.unmatchedIntent) {
        reply = parsed.unmatchedIntent;
      } else {
        reply = await chatReply(
          [{ role: "user", content: message }],
          "You are ComeBack.ai, a habit coach. Help with goals, logging, recovery."
        );
      }
    } else {
      const localMatches = parseTaskLogLocally(message, tasks);
      for (const match of localMatches) {
        const task = tasks.find((t) => t.taskId === match.taskId);
        if (task) {
          const result = await createLog(session.user.id, {
            goalId: task.goalId,
            taskId: task.taskId,
            checkpointId: task.checkpointId,
            status: match.status,
            note: match.note,
          });
          logsCreated++;
          loggedTasks.push(task.taskTitle);
          xpGain += result.xpGain;
          if (result.levelUp) levelUp = true;
          result.badgesEarned.forEach((id) => badgesEarned.add(id));
        }
      }

      if (logsCreated > 0) {
        reply = `Logged ${logsCreated} task${logsCreated > 1 ? "s" : ""} locally.`;
        if (xpGain > 0) reply += ` +${xpGain} XP`;
      } else {
        reply =
          "You've used all 100 free AI coach messages. Upgrade to Pro for unlimited coaching, or use the Today tab to log tasks.";
      }
    }

    await saveChatMessage(session.user.id, "assistant", reply, undefined, {
      type: logsCreated > 0 ? "tasks_logged" : "chat",
      logsCreated,
      loggedTasks,
      xpGain,
      levelUp,
    });
    const quota = await checkRateLimit(session.user.id);
    return NextResponse.json(
      {
        reply,
        logsCreated,
        loggedTasks,
        xpGain,
        levelUp,
        badgesEarned: Array.from(badgesEarned).map((id) => ({
          id,
          name: BADGE_META[id as keyof typeof BADGE_META]?.name ?? id,
        })),
        aiRemaining: quota.remaining,
      },
      { headers: aiRemainingHeader(quota.remaining) }
    );
  }

  if (body.action === "coach") {
    const { tasks } = await getTodayView(session.user.id);
    const completed = tasks.filter((t) => t.loggedToday === "completed").length;
    const goalId = tasks[0]?.goalId;
    let percent = 0;
    let checkpointTitle = "your goal";

    if (goalId) {
      const goal = await getGoal(session.user.id, goalId);
      const cp = goal ? getActiveCheckpoint(goal.path) : null;
      if (cp && goal) {
        checkpointTitle = cp.title;
        await connectDb();
        const logs = await Log.find({
          userId: session.user.id,
          goalId: goal._id,
          checkpointId: cp.id,
          status: { $in: ["completed", "partial"] },
        });
        percent = computeCheckpointProgress(cp, new Set(logs.map((l) => l.taskId)));
      }
    }

    const { dailyCoachMessage } = await import("@/lib/ai/gemini");
    await connectDb();
    const user = await User.findById(session.user.id);
    const streakDays = user?.streak?.current ?? 0;
    const message = await dailyCoachMessage({
      completedCount: completed,
      totalCount: tasks.length,
      streakDays,
      checkpointTitle,
      percent,
    });

    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
