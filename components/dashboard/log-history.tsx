"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogEntryDTO } from "@/types";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  completed: "Done",
  partial: "Partial",
  skipped: "Skipped",
  failed: "Failed",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LogHistory({
  logs,
  days = 14,
  loading,
}: {
  logs: LogEntryDTO[];
  days?: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Last {days} days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="arc-shimmer h-12 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last {days} days</CardTitle>
        <p className="text-sm text-muted">Your recent task logs across all goals.</p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">No logs yet. Complete a task above to start your history.</p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-3 rounded border border-border-low p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{log.taskTitle}</p>
                  <p className="truncate text-xs text-muted">
                    {log.goalTitle}
                    {log.checkpointTitle ? ` · ${log.checkpointTitle}` : ""}
                  </p>
                  {log.note ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">&quot;{log.note}&quot;</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      "inline-flex rounded border border-border-low bg-card px-2 py-0.5 text-xs font-semibold capitalize"
                    )}
                  >
                    {statusLabel[log.status] ?? log.status}
                  </span>
                  <p className="mt-1 text-xs text-muted">{formatWhen(log.loggedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
