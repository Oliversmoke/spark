import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { AppealModel } from "@/lib/models/Appeal";
import { serializeAppealForStaff } from "@/lib/appeals/serialize";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator", "support"] as const;

export async function GET(req: Request) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));

  await connectDb();

  const filter =
    status === "all"
      ? {}
      : status === "queue"
        ? { status: { $in: ["open", "under_review"] } }
        : { status };

  const rows = await AppealModel.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    items: rows.map((r) =>
      serializeAppealForStaff(r as unknown as import("@/lib/models/Appeal").AppealDoc)
    ),
  });
}
