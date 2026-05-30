"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearOnboardingPending, queueOnboarding } from "@/lib/onboarding";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  onboardingCompleted?: boolean;
};

type AuthResult = { ok: boolean; error?: string };

type AuthContextValue = {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<AuthResult>;
  signup: (input: {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
  }) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readAuthResponse(res: Response) {
  const data = (await res.json().catch(() => ({}))) as {
    user?: AuthUser;
    error?: string;
  };

  return { data, ok: res.ok };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      const data = (await res.json()) as { user?: AuthUser };
      if (data.user) {
        setUser(data.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyAuthSuccess = useCallback((nextUser?: AuthUser) => {
    if (nextUser) {
      setUser(nextUser);
      setStatus("authenticated");
      if (!nextUser.onboardingCompleted) {
        queueOnboarding(nextUser.id);
      }
      return;
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const { data, ok } = await readAuthResponse(res);
      if (!ok) {
        return { ok: false, error: data.error ?? "Sign in failed" };
      }

      applyAuthSuccess(data.user);
      return { ok: true };
    },
    [applyAuthSuccess]
  );

  const signup = useCallback(
    async (input: {
      email: string;
      name: string;
      password: string;
      confirmPassword: string;
    }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const { data, ok } = await readAuthResponse(res);
      if (!ok) {
        return { ok: false, error: data.error ?? "Sign up failed" };
      }

      applyAuthSuccess(data.user);
      return { ok: true };
    },
    [applyAuthSuccess]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearOnboardingPending();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, refresh, login, signup, logout }),
    [user, status, refresh, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
