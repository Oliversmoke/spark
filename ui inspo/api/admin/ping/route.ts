import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRole(["admin", "superadmin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );
  return NextResponse.json({ ok: true, role: "admin" });
}

