import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/templates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = getTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const checkpointCount = template.path.phases.reduce(
    (n, p) => n + p.checkpoints.length,
    0
  );
  const taskCount = template.path.phases.reduce(
    (n, p) => n + p.checkpoints.reduce((m, cp) => m + cp.tasks.length, 0),
    0
  );

  return NextResponse.json({
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      durationWeeks: template.path.durationWeeks,
      phaseCount: template.path.phases.length,
      checkpointCount,
      taskCount,
      path: template.path,
    },
  });
}
