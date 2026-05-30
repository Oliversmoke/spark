import { connectDb } from "@/lib/db";
import { Goal, User } from "@/lib/db/models";
import { syncStreakRecord } from "@/lib/gamification";

export async function syncUserStreaks(userId: string) {
  await connectDb();
  const user = await User.findById(userId);
  if (!user) return null;

  const goals = await Goal.find({ userId, status: "active" });
  let anyRecovery = false;

  for (const goal of goals) {
    const synced = syncStreakRecord(
      {
        current: goal.streak?.current ?? 0,
        longest: goal.streak?.longest ?? 0,
        lastLogAt: goal.streak?.lastLogAt,
        graceDays: goal.streak?.graceDays ?? 1,
        state: goal.streak?.state ?? "active",
      },
      goal.inRecoveryMode ?? false
    );

    goal.streak.current = synced.current;
    goal.streak.longest = synced.longest;
    goal.streak.state = synced.state;
    if (goal.inRecoveryMode) anyRecovery = true;
    await goal.save();
  }

  const userSynced = syncStreakRecord(
    {
      current: user.streak?.current ?? 0,
      longest: user.streak?.longest ?? 0,
      lastLogAt: user.streak?.lastLogAt,
      graceDays: user.streak?.graceDays ?? 1,
      state: user.streak?.state ?? "active",
    },
    anyRecovery || user.streak?.state === "recovering"
  );

  user.streak.current = userSynced.current;
  user.streak.longest = userSynced.longest;
  user.streak.state = userSynced.state;
  await user.save();

  return user;
}

export async function syncAllActiveStreaks(limit = 200) {
  await connectDb();
  const users = await User.find({}).select("_id").limit(limit);
  let updated = 0;

  for (const user of users) {
    await syncUserStreaks(user._id.toString());
    updated++;
  }

  return { updated };
}
