"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InlineAlert } from "@/components/arc/inline-alert";
import { useToast } from "@/components/arc/toast";
import {
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/components/pwa-register";

type NotificationPrefs = {
  pushEnabled?: boolean;
  reminderTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  weeklyReviewDay?: number;
};

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function NotificationSettings({
  prefs,
  onSave,
}: {
  prefs?: NotificationPrefs;
  onSave: (updates: Partial<NotificationPrefs>) => Promise<void>;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    subscribed: boolean;
    pushEnabled: boolean;
    vapidConfigured: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reminderTime, setReminderTime] = useState(prefs?.reminderTime ?? "09:00");
  const [timezone, setTimezone] = useState(
    prefs?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
  );
  const [quietStart, setQuietStart] = useState(prefs?.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = useState(prefs?.quietHoursEnd ?? "07:00");
  const [weeklyReviewDay, setWeeklyReviewDay] = useState(prefs?.weeklyReviewDay ?? 0);

  useEffect(() => {
    setReminderTime(prefs?.reminderTime ?? "09:00");
    setTimezone(
      prefs?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
    );
    setQuietStart(prefs?.quietHoursStart ?? "22:00");
    setQuietEnd(prefs?.quietHoursEnd ?? "07:00");
    setWeeklyReviewDay(prefs?.weeklyReviewDay ?? 0);
  }, [prefs]);

  useEffect(() => {
    fetch("/api/notifications/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setStatus({
          subscribed: data.subscribed,
          pushEnabled: data.pushEnabled,
          vapidConfigured: data.vapidConfigured,
        });
      })
      .catch(() => {});
  }, []);

  async function saveReminderTime(value: string) {
    setReminderTime(value);
    await onSave({ reminderTime: value });
  }

  async function saveTimezone(value: string) {
    setTimezone(value);
    await onSave({ timezone: value });
  }

  async function saveQuietHours(start: string, end: string) {
    setQuietStart(start);
    setQuietEnd(end);
    await onSave({ quietHoursStart: start, quietHoursEnd: end });
  }

  async function enablePush() {
    if (!status?.vapidConfigured) {
      toast({
        variant: "error",
        message: "Push is not configured on this server yet (VAPID keys missing).",
      });
      return;
    }

    setBusy(true);
    try {
      const ok = await subscribeToPush();
      if (!ok) {
        const permission = getPushPermission();
        toast({
          variant: "error",
          message:
            permission === "denied"
              ? "Notifications are blocked in your browser settings."
              : "Could not enable push notifications.",
        });
        return;
      }
      await onSave({ pushEnabled: true });
      setStatus((s) =>
        s ? { ...s, subscribed: true, pushEnabled: true } : s
      );
      toast({ variant: "success", message: "Push notifications enabled." });
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      await onSave({ pushEnabled: false });
      setStatus((s) =>
        s ? { ...s, subscribed: false, pushEnabled: false } : s
      );
      toast({ variant: "info", message: "Push notifications disabled." });
    } finally {
      setBusy(false);
    }
  }

  const pushActive = status?.subscribed && status?.pushEnabled;

  return (
    <div className="space-y-4">
      {!status?.vapidConfigured ? (
        <InlineAlert variant="info">
          Push reminders require VAPID keys in the server environment. Daily reminders and
          offline Today view still work without them.
        </InlineAlert>
      ) : null}

      <div>
        <Label htmlFor="reminder">Daily reminder time</Label>
        <Input
          id="reminder"
          type="time"
          className="mt-2"
          value={reminderTime}
          onChange={(e) => saveReminderTime(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">
          Morning task reminder, plus at-risk and recovery nudges during the day.
        </p>
      </div>

      <div>
        <Label htmlFor="tz">Timezone</Label>
        <Input
          id="tz"
          className="mt-2"
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          list="timezone-options"
        />
        <datalist id="timezone-options">
          {[
            "UTC",
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Paris",
            "Africa/Lagos",
            "Asia/Tokyo",
          ].map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </div>

      <div>
        <Label htmlFor="weekly-review-day">Weekly review day</Label>
        <select
          id="weekly-review-day"
          className="mt-2 w-full rounded border border-border-low bg-card px-3 py-2 text-sm"
          value={weeklyReviewDay}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            setWeeklyReviewDay(value);
            onSave({ weeklyReviewDay: value });
          }}
        >
          {WEEKDAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          Automated review runs on this day when you have logs from the past week.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="quiet-start">Quiet hours start</Label>
          <Input
            id="quiet-start"
            type="time"
            className="mt-2"
            value={quietStart}
            onChange={(e) => saveQuietHours(e.target.value, quietEnd)}
          />
        </div>
        <div>
          <Label htmlFor="quiet-end">Quiet hours end</Label>
          <Input
            id="quiet-end"
            type="time"
            className="mt-2"
            value={quietEnd}
            onChange={(e) => saveQuietHours(quietStart, e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pushActive ? (
          <>
            <span className="rounded border border-border-low bg-cream/40 px-2 py-1 text-xs font-semibold">
              Push enabled
            </span>
            <Button variant="ghost" size="sm" onClick={disablePush} disabled={busy}>
              Disable push
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={enablePush} disabled={busy}>
            Enable push notifications
          </Button>
        )}
      </div>
    </div>
  );
}
