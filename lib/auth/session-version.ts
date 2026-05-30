import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";
import {
  devUserProfile,
  incrementDevSessionVersion,
  isDevUserId,
} from "@/lib/auth/dev-user";

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

export async function getSessionVersion(userId: string): Promise<number | null> {
  if (isDevUserId(userId)) {
    if (!isDevelopment()) return null;
    return devUserProfile(userId).sessionVersion ?? 0;
  }

  try {
    await connectDb();
    const user = await User.findById(userId).select("sessionVersion");
    if (!user) return null;
    return user.sessionVersion ?? 0;
  } catch {
    if (isDevelopment() && isDevUserId(userId)) {
      return devUserProfile(userId).sessionVersion ?? 0;
    }
    return null;
  }
}

export async function incrementSessionVersion(userId: string) {
  if (isDevUserId(userId) && isDevelopment()) {
    return incrementDevSessionVersion(userId);
  }

  await connectDb();
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { sessionVersion: 1 } },
    { new: true }
  ).select("sessionVersion");

  return user?.sessionVersion ?? null;
}
