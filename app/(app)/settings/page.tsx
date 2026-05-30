"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/arc/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { InlineAlert } from "@/components/arc/inline-alert";
import { useToast } from "@/components/arc/toast";
import Link from "next/link";

interface UserPrefs {
  email?: string;
  name?: string;
  subscriptionTier?: string;
  aiRemaining?: number;
  aiLimit?: number;
  aiUpgradeRequired?: boolean;
  notificationPrefs?: {
    pushEnabled?: boolean;
    reminderTime?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  };
}

function SettingsContent() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState<UserPrefs | null>(null);
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "1";

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function savePrefs(updates: Partial<UserPrefs["notificationPrefs"]>) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationPrefs: updates,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      toast({ variant: "success", message: "Preferences saved." });
      return;
    }
    toast({ variant: "error", message: "Could not save preferences." });
  }

  async function exportData() {
    const res = await fetch("/api/export");
    if (!res.ok) {
      toast({ variant: "error", message: "Could not export your data." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comeback-ai-export.json";
    a.click();
    toast({ variant: "success", message: "Export downloaded." });
  }

  return (
    <>
      <PageHeader
        label="Account"
        title="Settings"
        description="Push reminders, quiet hours, and data export."
      />

      {upgraded ? (
        <InlineAlert variant="success" className="mb-4">
          Welcome to ComeBack.ai Pro! You now have unlimited active goals.
        </InlineAlert>
      ) : null}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-muted">{user?.email}</p>
            <span className="inline-block rounded border border-border-low bg-cream px-2 py-0.5 text-xs font-semibold capitalize">
              {user?.subscriptionTier ?? "free"} plan
            </span>
            {user?.subscriptionTier !== "pro" && (
              <div className="pt-2 space-y-2">
                {typeof user?.aiRemaining === "number" ? (
                  <p className="text-muted text-xs">
                    AI coach: {user.aiRemaining} of {user.aiLimit ?? 100} messages left
                  </p>
                ) : null}
                <Link href="/pricing">
                  <Button size="sm">Upgrade to Pro</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <p className="text-sm text-muted">
              Push reminders only — email alerts coming later.
            </p>
          </CardHeader>
          <CardContent>
            <NotificationSettings
              prefs={user?.notificationPrefs}
              onSave={savePrefs}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Install app</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            <p>
              On iPhone: Safari → Share → Add to Home Screen. On Android: use the
              install banner or browser menu → Install app.
            </p>
            <p>
              Installed apps cache your Today view for offline access after your first visit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={exportData}>
              Export my data (JSON)
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => logout().then(() => (window.location.href = "/"))}
        >
          Sign out
        </Button>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
