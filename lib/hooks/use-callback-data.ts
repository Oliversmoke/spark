"use client";

import { useCallback, useEffect, useState } from "react";

import type { RecoveryPlan } from "@/types";

export interface GoalSummary {
  id: string;
  title: string;
  inRecoveryMode?: boolean;
  recoveryPlan?: RecoveryPlan;
}

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  onboardingCompleted?: boolean;
  subscriptionTier?: string;
  notificationPrefs?: Record<string, string>;
}

export function useMe() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh, setUser };
}

export function useGoals() {
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) return;
      const data = await res.json();
      setGoals(data.goals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recoveringGoal = goals.find((g) => g.inRecoveryMode);

  return { goals, loading, refresh, recoveringGoal };
}

export function useChatHistory() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      metadata?: Record<string, unknown>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { messages, loading, refresh, setMessages };
}
