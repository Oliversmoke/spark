import { NextResponse } from "next/server";
import { GOAL_TEMPLATES } from "@/lib/templates";

export async function GET() {
  return NextResponse.json({
    templates: GOAL_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      durationWeeks: t.path.durationWeeks,
      phaseCount: t.path.phases.length,
    })),
  });
}
