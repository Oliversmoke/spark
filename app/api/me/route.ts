import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";
import { devUserProfile, isDevUserId, patchDevUserProfile } from "@/lib/auth/dev-user";
import { checkRateLimit } from "@/lib/rate-limit";

function devProfileResponse(
  userId: string,
  email?: string | null,
  name?: string | null
) {
  return NextResponse.json({
    user: devUserProfile(userId, email, name),
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDb();
    const user = await User.findById(session.user.id).select("-pushSubscriptions");
    if (!user) {
      if (process.env.NODE_ENV === "development" && isDevUserId(session.user.id)) {
        return devProfileResponse(
          session.user.id,
          session.user.email,
          session.user.name
        );
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const aiQuota = await checkRateLimit(session.user.id);

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        xp: user.xp,
        level: user.level,
        badges: user.badges,
        streak: user.streak,
        notificationPrefs: user.notificationPrefs,
        subscriptionTier: user.subscriptionTier,
        onboardingCompleted: user.onboardingCompleted,
        aiRemaining: aiQuota.remaining,
        aiLimit: aiQuota.limit,
        aiUpgradeRequired: aiQuota.upgradeRequired,
      },
    });
  } catch {
    if (process.env.NODE_ENV === "development" && isDevUserId(session.user.id)) {
      return devProfileResponse(
        session.user.id,
        session.user.email,
        session.user.name
      );
    }
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.onboardingCompleted === "boolean") {
    update.onboardingCompleted = body.onboardingCompleted;
  }
  if (body.name) update.name = body.name;

  try {
    await connectDb();
    const existing = await User.findById(session.user.id);
    if (!existing) {
      if (process.env.NODE_ENV === "development" && isDevUserId(session.user.id)) {
        patchDevUserProfile(session.user.id, {
          onboardingCompleted:
            typeof body.onboardingCompleted === "boolean"
              ? body.onboardingCompleted
              : undefined,
          name: typeof body.name === "string" ? body.name : undefined,
          notificationPrefs: body.notificationPrefs,
        });
        return devProfileResponse(
          session.user.id,
          session.user.email,
          session.user.name
        );
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.notificationPrefs) {
      update.notificationPrefs = {
        ...(existing.notificationPrefs ?? {}),
        ...body.notificationPrefs,
      };
    }

    const user = await User.findByIdAndUpdate(session.user.id, update, {
      new: true,
    });

    if (user) {
      return NextResponse.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          notificationPrefs: user.notificationPrefs,
          subscriptionTier: user.subscriptionTier,
          onboardingCompleted: user.onboardingCompleted,
        },
      });
    }
  } catch {
    // fall through to dev handling below
  }

  if (process.env.NODE_ENV === "development" && isDevUserId(session.user.id)) {
    patchDevUserProfile(session.user.id, {
      onboardingCompleted:
        typeof body.onboardingCompleted === "boolean"
          ? body.onboardingCompleted
          : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      notificationPrefs: body.notificationPrefs,
    });
    return devProfileResponse(
      session.user.id,
      session.user.email,
      session.user.name
    );
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
