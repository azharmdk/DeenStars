/**
 * Day logic is always computed on the server in the child's IANA time zone.
 * dayKey: yyyy-MM-dd, weekKey: ISO week yyyy-Www (Monday start), monthKey: yyyy-MM.
 */

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

export function dayKeyFor(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function dateFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00Z`);
}

export function addDays(dayKey: string, n: number): string {
  const d = dateFromDayKey(dayKey);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Offset of the zone from UTC at a given instant, in milliseconds. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const p = zonedParts(new Date(instant), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant of local midnight at the start of dayKey in the given zone (DST-safe). */
export function startOfDayInstant(dayKey: string, timeZone: string): Date {
  const naive = dateFromDayKey(dayKey).getTime();
  let guess = naive - zoneOffsetMs(naive, timeZone);
  // A second pass corrects days where the offset changes near midnight.
  guess = naive - zoneOffsetMs(guess, timeZone);
  return new Date(guess);
}

export function weekKeyFromDayKey(dayKey: string): string {
  const d = dateFromDayKey(dayKey);
  // Move to the Thursday of this ISO week.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function monthKeyFromDayKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function isFridayDayKey(dayKey: string): boolean {
  return dateFromDayKey(dayKey).getUTCDay() === 5;
}

/** Pending approvals stay open through the next local day, then expire silently. */
export function approvalExpiresAt(dayKey: string, timeZone: string): Date {
  return startOfDayInstant(addDays(dayKey, 2), timeZone);
}
