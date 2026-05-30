import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { AuthNonceModel } from "@/lib/models/AuthNonce";
import { UserModel } from "@/lib/models/User";
import {
  buildSignInMessage,
  isValidSolanaAddress,
  SIGN_IN_STATEMENT,
  verifySolanaMessageSignature,
} from "@/lib/auth/siws";
import { setSessionCookieAsync } from "@/lib/auth/session";
import { getSignInHost } from "@/lib/http/signInHost";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimitCheck(`verify:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rl.retryAfterSec) }
    );
  }

  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  const nonce = body?.nonce;
  const signatureBase64 = body?.signatureBase64;

  if (
    typeof walletAddress !== "string" ||
    typeof nonce !== "string" ||
    typeof signatureBase64 !== "string"
  ) {
    return NextResponse.json({ error: "walletAddress, nonce, signatureBase64 required" }, { status: 400 });
  }

  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "invalid_wallet" }, { status: 400 });
  }

  await connectDb();

  const nonceDoc = await AuthNonceModel.findOne({ walletAddress, nonce });
  if (!nonceDoc) return NextResponse.json({ error: "Invalid nonce" }, { status: 400 });
  if (nonceDoc.usedAt) return NextResponse.json({ error: "Nonce already used" }, { status: 400 });
  if (nonceDoc.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "Nonce expired" }, { status: 400 });

  const issuedAt =
    nonceDoc.issuedAt instanceof Date
      ? nonceDoc.issuedAt.toISOString()
      : ((nonceDoc as unknown as { createdAt?: Date }).createdAt instanceof Date
          ? (nonceDoc as unknown as { createdAt: Date }).createdAt.toISOString()
          : new Date().toISOString());

  const domain = getSignInHost(req);
  const message = buildSignInMessage({
    domain,
    walletAddress,
    nonce,
    issuedAt,
    expirationTime: nonceDoc.expiresAt.toISOString(),
    statement: SIGN_IN_STATEMENT,
  });

  const ok = verifySolanaMessageSignature({ walletAddress, message, signatureBase64 });
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  nonceDoc.usedAt = new Date();
  await nonceDoc.save();

  let user =
    (await UserModel.findOne({ primaryWalletAddress: walletAddress })) ??
    (await UserModel.create({ primaryWalletAddress: walletAddress, roles: ["gamer"] }));

  if (user.status === "banned") {
    return NextResponse.json({ error: "account_banned" }, { status: 403 });
  }

  const bootstrapRaw = process.env.ADMIN_BOOTSTRAP_WALLETS ?? "";
  const bootstrap = new Set(
    bootstrapRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const bootstrapAllowed =
    process.env.NODE_ENV !== "production" || process.env.ADMIN_BOOTSTRAP_ENABLED === "true";

  if (bootstrapAllowed && bootstrap.has(walletAddress)) {
    const nextRoles = new Set(user.roles);
    nextRoles.add("admin");
    nextRoles.add("superadmin");
    user.roles = [...nextRoles];
    await user.save();
  }

  await setSessionCookieAsync({
    userId: user._id.toString(),
    walletAddress: user.primaryWalletAddress,
    roles: user.roles,
  });

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      walletAddress: user.primaryWalletAddress,
      roles: user.roles,
      status: user.status,
      username: user.username ?? null,
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? null,
      profileVisibility: user.profileVisibility ?? "private",
    },
  });
}
