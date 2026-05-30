import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions, verifyAccessToken } from "@/lib/auth/jwt";
import { incrementSessionVersion } from "@/lib/auth/session-version";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      if (payload.sub) {
        await incrementSessionVersion(payload.sub);
      }
    } catch {
      // Token already invalid — still clear the cookie below.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
