import { NextResponse } from "next/server";
import { clearSessionCookieAsync } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookieAsync();
  return NextResponse.json({ ok: true });
}

