import { NextResponse } from "next/server";
import { AUTH_COOKIE, authCookieOptions, signAccessToken } from "@/lib/auth/jwt";

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  onboardingCompleted?: boolean;
  sessionVersion?: number;
};

export async function issueAuthResponse(user: AuthUserPayload) {
  const token = await signAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    sessionVersion: user.sessionVersion ?? 0,
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: Boolean(user.onboardingCompleted),
    },
  });
  res.cookies.set(AUTH_COOKIE, token, authCookieOptions());
  return res;
}
