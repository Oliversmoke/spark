import type { TodayTask } from "@/types";

type ParsedMatch = {
  taskId: string;
  status: "completed" | "partial" | "skipped";
  note: string;
};

function inferStatus(message: string): ParsedMatch["status"] {
  const lower = message.toLowerCase();
  if (/\b(skip|skipped|missed|couldn't|could not)\b/.test(lower)) return "skipped";
  if (/\b(partial|half|some progress|started but)\b/.test(lower)) return "partial";
  return "completed";
}

function taskMentioned(message: string, taskTitle: string) {
  const lower = message.toLowerCase();
  const title = taskTitle.toLowerCase();

  if (lower.includes(title)) return true;

  const keywords = title
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 4);

  return keywords.some((word) => lower.includes(word));
}

export function parseTaskLogLocally(message: string, tasks: TodayTask[]): ParsedMatch[] {
  if (!message.trim() || tasks.length === 0) return [];

  const status = inferStatus(message);
  const lower = message.toLowerCase();
  const matches: ParsedMatch[] = [];

  for (const task of tasks) {
    if (taskMentioned(message, task.taskTitle)) {
      matches.push({
        taskId: task.taskId,
        status,
        note: message.slice(0, 200),
      });
    }
  }

  if (
    matches.length === 0 &&
    /\b(all tasks|everything|today'?s tasks|done for today|finished today)\b/.test(lower)
  ) {
    for (const task of tasks.filter((t) => t.loggedToday !== "completed")) {
      matches.push({ taskId: task.taskId, status, note: "" });
    }
  }

  if (matches.length === 0 && tasks.length === 1 && /\b(done|finished|completed|logged)\b/.test(lower)) {
    matches.push({
      taskId: tasks[0].taskId,
      status,
      note: message.slice(0, 200),
    });
  }

  return matches;
}
