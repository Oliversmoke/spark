import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { normalizeUsername } from "@/lib/username/validate";

export const runtime = "nodejs";

/** Public profile: lookup by username first, then by Mongo id. */
export async function GET(_req: Request, ctx: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await ctx.params;
  const raw = identifier.trim();
  if (!raw) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDb();

  const byName = await UserModel.findOne({ username: normalizeUsername(raw) }).lean();
  let user = byName;

  if (!user && mongoose.Types.ObjectId.isValid(raw)) {
    user = await UserModel.findById(raw).lean();
  }

  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (user.profileVisibility !== "public") {
    return NextResponse.json({ error: "private_profile" }, { status: 403 });
  }

  return NextResponse.json({
    profile: {
      id: String(user._id),
      username: user.username ?? null,
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? null,
    },
  });
}
