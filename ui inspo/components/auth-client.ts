"use client";

import { withBasePath } from "./base-path";

type WalletSessionLike = {
  account: { address: { toString(): string } };
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

function b64FromBytes(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildClientSignInMessage(args: {
  domain: string;
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
}) {
  const { domain, walletAddress, nonce, issuedAt, expirationTime, statement } = args;
  return [
    `${domain} wants you to sign in with your Solana account:`,
    walletAddress,
    "",
    statement ?? "Sign in to 9thArc.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ].join("\n");
}

export async function arcFetchMe() {
  const res = await fetch(withBasePath("/api/me"), { method: "GET" });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.user ?? null) as null | {
    id: string;
    roles: string[];
    status: string;
    walletAddress: string;
    username?: string | null;
    displayName?: string;
    bio?: string;
    avatarUrl?: string | null;
    profileVisibility?: string;
  };
}

export async function arcLogout() {
  await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
}

export async function arcSignInWithWalletSession(wallet: WalletSessionLike) {
  const walletAddress = wallet.account.address.toString();
  if (!walletAddress) throw new Error("No wallet address");
  if (typeof wallet.signMessage !== "function") {
    throw new Error("Wallet does not support message signing.");
  }

  const nonceRes = await fetch(withBasePath("/api/auth/nonce"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  const nonceJson = await nonceRes.json();
  if (!nonceRes.ok) throw new Error(nonceJson?.error ?? "Failed to get nonce");

  const domain = window.location.host;
  const issuedAt =
    typeof nonceJson.issuedAt === "string"
      ? nonceJson.issuedAt
      : new Date().toISOString();
  const expirationTime =
    typeof nonceJson.expiresAt === "string"
      ? nonceJson.expiresAt
      : new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const statement = "Sign in to 9thArc.";

  const message = buildClientSignInMessage({
    domain,
    walletAddress,
    nonce: nonceJson.nonce,
    issuedAt,
    expirationTime,
    statement,
  });

  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await wallet.signMessage(messageBytes);
  const signatureBase64 = b64FromBytes(signatureBytes);

  const verifyRes = await fetch(withBasePath("/api/auth/verify"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      nonce: nonceJson.nonce,
      signatureBase64,
    }),
  });
  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyJson?.error ?? "Sign-in failed");

  return await arcFetchMe();
}

