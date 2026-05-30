import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { UserRole } from "@/lib/models/User";
import { UserModel } from "@/lib/models/User";

export const runtime = "nodejs";

const ADMINS = ["admin", "superadmin"] as const;
const VALID_ROLES = new Set<UserRole>([
  "gamer",
  "developer",
  "creator",
  "admin",
  "superadmin",
  "moderator",
  "finance",
  "support",
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole([...ADMINS]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const nextStatus = body?.status;
  const nextRoles = body?.roles as UserRole[] | undefined;

  if (nextStatus === undefined && nextRoles === undefined) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  await connectDb();
  const user = await UserModel.findById(id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (id === auth.session.userId) {
    if (nextStatus === "banned") {
      return NextResponse.json({ error: "cannot_ban_self" }, { status: 400 });
    }
  }

  if (nextStatus !== undefined && nextStatus !== null) {
    if (nextStatus !== "active" && nextStatus !== "banned") {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    const prev = user.status;
    user.status = nextStatus;
    await appendAudit({
      actor: auth.session,
      action: "user.status",
      targetType: "user",
      targetId: id,
      metadata: { from: prev, to: nextStatus },
    });
  }

  if (Array.isArray(nextRoles)) {
    if (nextRoles.length === 0) {
      return NextResponse.json({ error: "roles_non_empty" }, { status: 400 });
    }
    for (const r of nextRoles) {
      if (!VALID_ROLES.has(r)) return NextResponse.json({ error: `invalid_role_${r}` }, { status: 400 });
    }
    if (nextRoles.includes("superadmin") && !auth.session.roles.includes("superadmin")) {
      return NextResponse.json({ error: "only_superadmin_can_grant_superadmin" }, { status: 403 });
    }
    const prevRoles = [...user.roles];
    user.roles = nextRoles;
    await appendAudit({
      actor: auth.session,
      action: "user.roles",
      targetType: "user",
      targetId: id,
      metadata: { from: prevRoles, to: nextRoles },
    });
  }

  await user.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user._id.toString(),
      walletAddress: user.primaryWalletAddress,
      roles: user.roles,
      status: user.status,
    },
  });
}
