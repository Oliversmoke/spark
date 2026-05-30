import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getSessionVersion } from "@/lib/auth/session-version";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type Session = {
  user: SessionUser;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("callback-token")?.value;
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    const userId = payload.sub!;
    const tokenVersion = typeof payload.sv === "number" ? payload.sv : 0;
    const currentVersion = await getSessionVersion(userId);

    if (currentVersion === null || currentVersion !== tokenVersion) {
      return null;
    }

    return {
      user: {
        id: userId,
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : "User",
      },
    };
  } catch {
    return null;
  }
}
