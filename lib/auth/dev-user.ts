/** In-memory profile overrides for dev users when MongoDB is unavailable. */
const devProfileOverrides = new Map<
  string,
  {
    onboardingCompleted?: boolean;
    name?: string;
    sessionVersion?: number;
    notificationPrefs?: Record<string, string | number | boolean>;
  }
>();

export function patchDevUserProfile(
  userId: string,
  patch: {
    onboardingCompleted?: boolean;
    name?: string;
    sessionVersion?: number;
    notificationPrefs?: Record<string, string | number | boolean>;
  }
) {
  const current = devProfileOverrides.get(userId) ?? {};
  devProfileOverrides.set(userId, { ...current, ...patch });
}

export function incrementDevSessionVersion(userId: string) {
  const current = devProfileOverrides.get(userId)?.sessionVersion ?? 0;
  const next = current + 1;
  patchDevUserProfile(userId, { sessionVersion: next });
  return next;
}

/** Stable dev user id when MongoDB is unavailable (development only). */
export function devUserIdFromEmail(email: string) {
  return `dev-${Buffer.from(email.trim().toLowerCase()).toString("base64url").slice(0, 24)}`;
}

export function isDevUserId(userId: string) {
  return userId.startsWith("dev-");
}

export function devUserProfile(userId: string, email?: string | null, name?: string | null) {
  const overrides = devProfileOverrides.get(userId);

  return {
    id: userId,
    email: email ?? "dev@localhost",
    name: overrides?.name ?? name ?? "Dev User",
    image: null,
    xp: 0,
    level: 1,
    badges: [] as string[],
    streak: {
      current: 0,
      longest: 0,
      state: "active" as const,
    },
    notificationPrefs: {
      emailEnabled: true,
      pushEnabled: false,
      reminderTime: "09:00",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      weeklyReviewDay: 0,
      timezone: "UTC",
      ...(overrides?.notificationPrefs ?? {}),
    },
    subscriptionTier: "free" as const,
    onboardingCompleted: overrides?.onboardingCompleted ?? false,
    sessionVersion: overrides?.sessionVersion ?? 0,
  };
}
