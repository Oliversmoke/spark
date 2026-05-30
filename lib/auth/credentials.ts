import { devLogin, devSignup } from "@/lib/auth/dev-store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export type CredentialUser = {
  id: string;
  email: string;
  name: string;
  onboardingCompleted: boolean;
  sessionVersion: number;
};

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

async function tryDevSignup(input: {
  email: string;
  name: string;
  password: string;
}) {
  const result = await devSignup(input);
  if (!result.ok) {
    return { ok: false as const, error: result.error, status: 409 };
  }
  return { ok: true as const, user: result.user };
}

async function tryDevLogin(input: { email: string; password: string }) {
  const result = await devLogin(input);
  if (!result.ok) {
    return { ok: false as const, error: result.error, status: 401 };
  }
  return { ok: true as const, user: result.user };
}

export async function signupWithCredentials(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ ok: true; user: CredentialUser } | { ok: false; error: string; status: number }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  try {
    const { connectDb } = await import("@/lib/db");
    const { User } = await import("@/lib/db/models");
    const { trackEvent } = await import("@/lib/rate-limit");
    await connectDb();

    const existing = await User.findOne({ email }).select("+passwordHash");
    if (existing?.passwordHash) {
      return { ok: false, error: "An account with this email already exists", status: 409 };
    }

    const passwordHash = await hashPassword(input.password);

    let user;
    if (existing) {
      existing.name = name;
      existing.passwordHash = passwordHash;
      await existing.save();
      user = existing;
    } else {
      user = await User.create({ email, name, passwordHash });
      await trackEvent(user._id.toString(), "signup", { method: "credentials" });
    }

    return {
      ok: true,
      user: {
        id: user._id.toString(),
        email,
        name: user.name ?? name,
        onboardingCompleted: Boolean(user.onboardingCompleted),
        sessionVersion: user.sessionVersion ?? 0,
      },
    };
  } catch (err) {
    if (!isDevelopment()) {
      console.error("[auth/signup] database error:", err);
      return { ok: false, error: "Database unavailable", status: 503 };
    }
    return tryDevSignup({ email, name, password: input.password });
  }
}

export async function loginWithCredentials(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; user: CredentialUser } | { ok: false; error: string; status: number }> {
  const email = input.email.trim().toLowerCase();

  try {
    const { connectDb } = await import("@/lib/db");
    const { User } = await import("@/lib/db/models");
    await connectDb();

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user?.passwordHash) {
      if (isDevelopment()) {
        return tryDevLogin({ email, password: input.password });
      }
      return { ok: false, error: "Invalid email or password", status: 401 };
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return { ok: false, error: "Invalid email or password", status: 401 };
    }

    return {
      ok: true,
      user: {
        id: user._id.toString(),
        email,
        name: user.name ?? "User",
        onboardingCompleted: Boolean(user.onboardingCompleted),
        sessionVersion: user.sessionVersion ?? 0,
      },
    };
  } catch (err) {
    if (!isDevelopment()) {
      console.error("[auth/login] database error:", err);
      return { ok: false, error: "Database unavailable", status: 503 };
    }
    return tryDevLogin({ email, password: input.password });
  }
}
