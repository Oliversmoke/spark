"use client";

import { useAuth } from "@/lib/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { SettingsBar } from "@/components/arc/settings-bar";
import { useToast } from "@/components/arc/toast";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

function safeCallbackUrl(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/home";
  return raw;
}

export default function AuthForm({ defaultMode = "login" }: { defaultMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, status, login, signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    const queryMode = searchParams.get("mode");
    if (queryMode === "signup" || queryMode === "login") {
      setMode(queryMode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) router.replace(callbackUrl);
  }, [user, router, callbackUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const result =
      mode === "signup"
        ? await signup({
            email: normalizedEmail,
            name: name.trim(),
            password,
            confirmPassword,
          })
        : await login({
            email: normalizedEmail,
            password,
          });

    if (!result.ok) {
      toast({
        variant: "error",
        title: mode === "signup" ? "Sign up failed" : "Sign in failed",
        message: result.error ?? "Please check your details and try again.",
      });
      setLoading(false);
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
    setLoading(false);
  }

  if (status === "loading" || user) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg1">
        <div className="arc-shimmer h-12 w-48 rounded" />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-bg1 text-foreground">
      <div className="absolute top-6 right-6">
        <SettingsBar />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded border border-border-low bg-card shadow-[0_30px_90px_-60px_rgba(0,0,0,0.6)]">
            <PhoneCall className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to ComeBack.ai</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signup"
              ? "Create an account to start your journey"
              : "Sign in to continue where you left off"}
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle>{mode === "signup" ? "Create account" : "Sign in"}</CardTitle>
            <div className="grid grid-cols-2 gap-1 rounded border border-border-low bg-cream/30 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-semibold transition",
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                Sign up
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" ? (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-2"
                  />
                </div>
              ) : null}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-2"
                />
              </div>

              {mode === "signup" ? (
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="mt-2"
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? mode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New to ComeBack.ai?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Create an account
              </button>
            </>
          )}
          {" · "}
          <Link href="/" className="font-semibold underline-offset-2 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
