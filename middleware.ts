import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyAccessToken } from "@/lib/auth/jwt";

const publicPaths = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/api/health",
  "/api/auth",
  "/api/templates",
];

function safeCallbackUrl(raw: string | null, fallback = "/chat") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

async function redirectIfAuthenticated(req: NextRequest, pathname: string) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    await verifyAccessToken(token);
  } catch {
    return null;
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  if (pathname === "/login" || pathname === "/signup") {
    const dest = safeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isCron = pathname.startsWith("/api/cron");
  const isStripeWebhook = pathname === "/api/stripe/webhook";
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest";

  if (isPublic || isCron || isStripeWebhook || isStatic) {
    const authRedirect = await redirectIfAuthenticated(req, pathname);
    if (authRedirect) return authRedirect;
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifyAccessToken(token);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
