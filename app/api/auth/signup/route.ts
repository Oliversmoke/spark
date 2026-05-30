import { NextResponse } from "next/server";
import { z } from "zod";
import { signupWithCredentials } from "@/lib/auth/credentials";
import { issueAuthResponse } from "@/lib/auth/issue-session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { enforceSignupRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request";

const bodySchema = z
  .object({
    email: z.string().email(),
    name: z.string().trim().min(1).max(80),
    password: z.string().min(PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid signup details" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const rateLimited = await enforceSignupRateLimit(ip);
    if (rateLimited) return rateLimited;

    const { email, name, password } = parsed.data;
    const result = await signupWithCredentials({ email, name, password });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return issueAuthResponse(result.user);
  } catch (err) {
    console.error("[auth/signup] error:", err);
    return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
  }
}
