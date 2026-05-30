import { devUserIdFromEmail, devUserProfile } from "@/lib/auth/dev-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

type DevUserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

const devUsersByEmail = new Map<string, DevUserRecord>();

export async function devSignup(input: {
  email: string;
  name: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (devUsersByEmail.has(email)) {
    return { ok: false as const, error: "An account with this email already exists" };
  }

  const user: DevUserRecord = {
    id: devUserIdFromEmail(email),
    email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
  };

  devUsersByEmail.set(email, user);
  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: false,
      sessionVersion: 0,
    },
  };
}

export async function devLogin(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = devUsersByEmail.get(email);

  if (!user) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: devUserProfile(user.id, user.email, user.name).onboardingCompleted,
      sessionVersion: devUserProfile(user.id, user.email, user.name).sessionVersion ?? 0,
    },
  };
}
