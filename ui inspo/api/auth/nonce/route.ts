import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDb } from "@/lib/db";
import { AuthNonceModel } from "@/lib/models/AuthNonce";
import { isValidSolanaAddress } from "@/lib/auth/siws";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rlIp = rateLimitCheck(`nonce:ip:${ip}`, 40, 10 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlIp.retryAfterSec) }
    );
  }

  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  if (typeof walletAddress !== "string" || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  const rlWallet = rateLimitCheck(`nonce:wallet:${walletAddress}`, 15, 10 * 60 * 1000);
  if (!rlWallet.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlWallet.retryAfterSec) }
    );
  }

  await connectDb();

  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

  await AuthNonceModel.create({
    walletAddress,
    nonce,
    issuedAt,
    expiresAt,
  });

  return NextResponse.json({
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}
