import { NextResponse } from "next/server";
import { z } from "zod";
import { loginWithCredentials } from "@/lib/auth/credentials";
import { issueAuthResponse } from "@/lib/auth/issue-session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { enforceLoginRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/request";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  }),
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid email or password" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const rateLimited = await enforceLoginRateLimit(ip, parsed.data.email);
    if (rateLimited) return rateLimited;

    const result = await loginWithCredentials(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return issueAuthResponse(result.user);
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
