"use client";

import { useEffect, useState } from "react";
import { OnboardingTour } from "@/components/arc/onboarding-tour";
import { useToast } from "@/components/arc/toast";
import {
  clearOnboardingPending,
  hasOnboardingPending,
  isOnboardingDoneLocal,
  markOnboardingDoneLocal,
} from "@/lib/onboarding";
import { useMe } from "@/lib/hooks/use-callback-data";

export function OnboardingGate() {
  const { user, loading, refresh, setUser } = useMe();
  const { toast } = useToast();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setShowTour(false);
      return;
    }

    if (user.onboardingCompleted || isOnboardingDoneLocal(user.id)) {
      setShowTour(false);
      return;
    }

    if (hasOnboardingPending(user.id)) {
      setShowTour(true);
    }
  }, [loading, user?.id, user?.onboardingCompleted]);

  async function completeOnboarding() {
    if (!user) return;

    setShowTour(false);
    clearOnboardingPending();
    markOnboardingDoneLocal(user.id);
    setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : prev));

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingCompleted: true }),
    });

    if (res.ok) {
      await refresh();
      toast({
        variant: "success",
        title: "You're set",
        message: "Describe a goal in chat or log tasks in Today.",
      });
      return;
    }

    toast({
      variant: "error",
      message: "Could not save onboarding progress. Try again later.",
    });
  }

  if (!showTour) return null;

  return <OnboardingTour onComplete={completeOnboarding} />;
}
