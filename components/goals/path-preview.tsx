import type { Path } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PathPreview({ path }: { path: Path }) {
  const checkpointCount = path.phases.reduce((n, p) => n + p.checkpoints.length, 0);
  const taskCount = path.phases.reduce(
    (n, p) => n + p.checkpoints.reduce((m, cp) => m + cp.tasks.length, 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="rounded border border-border-low bg-cream/30 px-4 py-3 text-sm">
        <p className="font-semibold">{path.title}</p>
        <p className="mt-1 text-muted">
          {path.durationWeeks} weeks · {path.phases.length} phases · {checkpointCount}{" "}
          checkpoints · {taskCount} tasks
        </p>
      </div>

      {path.phases.map((phase) => (
        <Card key={phase.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{phase.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phase.checkpoints.map((cp) => (
              <div key={cp.id} className="rounded border border-border-low p-3">
                <p className="font-semibold">{cp.title}</p>
                <p className="mt-1 text-xs text-muted">{cp.criteria}</p>
                <p className="mt-1 text-xs text-muted">Due in {cp.dueInDays} days</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {cp.tasks.map((t) => (
                    <li key={t.id}>
                      • {t.title} ({t.frequency}, {t.durationMin}m)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
