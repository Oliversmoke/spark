import { NextResponse } from "next/server";

import { getSessionUserIfNotDeleted } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { AppealModel } from "@/lib/models/Appeal";
import { serializeAppealForAppellant } from "@/lib/appeals/serialize";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUserIfNotDeleted();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDb();
  const rows = await AppealModel.find({ appellantUserId: session.userId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    items: rows.map((r) => serializeAppealForAppellant(r as unknown as import("@/lib/models/Appeal").AppealDoc)),
  });
}
