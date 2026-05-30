import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserModel } from "@/lib/models/User";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDb();
  const user = await UserModel.findById(session.userId);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      walletAddress: user.primaryWalletAddress,
      roles: user.roles,
      status: user.status,
      username: user.username ?? null,
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? null,
      profileVisibility: user.profileVisibility ?? "private",
    },
  });
}

