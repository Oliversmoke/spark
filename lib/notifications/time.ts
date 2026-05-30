export type LocalTimeParts = {
  hours: number;
  minutes: number;
  dateKey: string;
};

export function parseTimeValue(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map((part) => parseInt(part, 10));
  return {
    hours: Number.isFinite(h) ? h : 9,
    minutes: Number.isFinite(m) ? m : 0,
  };
}

export function getLocalTimeParts(
  timezone: string,
  reference = new Date()
): LocalTimeParts {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(reference);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

    const year = read("year");
    const month = read("month");
    const day = read("day");
    const hours = read("hour") % 24;
    const minutes = read("minute");

    return {
      hours,
      minutes,
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  } catch {
    return {
      hours: reference.getUTCHours(),
      minutes: reference.getUTCMinutes(),
      dateKey: reference.toISOString().slice(0, 10),
    };
  }
}

export function isInQuietHours(
  quietStart: string,
  quietEnd: string,
  timezone: string,
  reference = new Date()
): boolean {
  const { hours, minutes } = getLocalTimeParts(timezone, reference);
  const nowMinutes = hours * 60 + minutes;
  const start = parseTimeValue(quietStart);
  const end = parseTimeValue(quietEnd);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/** True when local time is within the reminder hour (for hourly cron). */
export function isReminderHour(
  reminderTime: string,
  local: LocalTimeParts
): boolean {
  const reminder = parseTimeValue(reminderTime);
  return local.hours === reminder.hours;
}

/** True when local time is within N minutes after reminder time. */
export function isWithinMinutesAfterReminder(
  reminderTime: string,
  local: LocalTimeParts,
  windowMinutes: number
): boolean {
  const reminder = parseTimeValue(reminderTime);
  const nowMinutes = local.hours * 60 + local.minutes;
  const targetMinutes = reminder.hours * 60 + reminder.minutes;
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}
