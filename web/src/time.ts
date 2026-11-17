// Mirrors functions/src/lib/time.ts for display. The server stays authoritative.
export function dayKeyFor(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(dayKey: string, n: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday to Sunday day keys of the ISO week containing dayKey. */
export function daysOfWeek(dayKey: string): string[] {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const offset = (d.getUTCDay() || 7) - 1;
  const monday = addDays(dayKey, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function relativeDayLabel(dayKey: string, today: string): string {
  if (dayKey === today) return "Today";
  if (dayKey === addDays(today, -1)) return "Yesterday";
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

export function weekKeyFromDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function isFridayDayKey(dayKey: string): boolean {
  return new Date(`${dayKey}T00:00:00Z`).getUTCDay() === 5;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
