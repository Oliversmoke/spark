import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const AUTH_COOKIE = "callback-token";
const JWT_ISSUER = "callback";
const JWT_AUDIENCE = "callback-app";
const JWT_EXPIRY = "7d";

export type TokenPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  sv?: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(user: {
  id: string;
  email: string;
  name: string;
  sessionVersion?: number;
}) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    sv: user.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }

  return payload as TokenPayload;
}

export function authCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
