import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { ProfileVisibility } from "@/lib/models/User";
import { UserModel } from "@/lib/models/User";
import { normalizeUsername, validateUsernameFormat } from "@/lib/username/validate";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : undefined;
  const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 2000) : undefined;
  const visibility = body?.profileVisibility as ProfileVisibility | undefined;
  const clearAvatar = body?.clearAvatar === true;
  const clearUsername = body?.clearUsername === true;
  const usernameRaw = body?.username;

  const wantsUsernameUpdate = usernameRaw !== undefined || clearUsername;

  if (
    displayName === undefined &&
    bio === undefined &&
    visibility === undefined &&
    !clearAvatar &&
    !wantsUsernameUpdate
  ) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  if (visibility !== undefined && visibility !== "public" && visibility !== "private") {
    return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
  }

  if (clearUsername && typeof usernameRaw === "string" && usernameRaw.trim()) {
    return NextResponse.json({ error: "clear_username_conflict" }, { status: 400 });
  }

  await connectDb();
  const user = await UserModel.findById(session.userId);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  if (displayName !== undefined) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (visibility !== undefined) user.profileVisibility = visibility;
  if (clearAvatar) user.avatarUrl = null;

  if (clearUsername) {
    user.username = null;
  } else if (typeof usernameRaw === "string") {
    const normalized = normalizeUsername(usernameRaw);
    const current = user.username ?? null;

    if (!normalized) {
      if (current) {
        return NextResponse.json({ error: "username_use_clear_username_flag" }, { status: 400 });
      }
      // no-op: empty handle when none set yet
    } else if (normalized !== current) {
      const v = validateUsernameFormat(normalized);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

      const taken = await UserModel.findOne({
        username: normalized,
        _id: { $ne: user._id },
      }).lean();
      if (taken) return NextResponse.json({ error: "username_taken" }, { status: 400 });

      user.username = normalized;
    }
  }

  try {
    await user.save();
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "username_taken" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({
    ok: true,
    profile: {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      profileVisibility: user.profileVisibility,
    },
  });
}
