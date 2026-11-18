/**
 * Hijri dates for Ramadan, Eid and other seasonal content.
 * Base calendar: Umm al-Qura from Unicode CLDR/ICU (built into Node and browsers).
 * Regional moon sighting differs, so each country has an admin-set day adjustment
 * (appConfiguration/hijri) and parents can shift by one day. The region is derived from the
 * child's time zone, never from location data (docs/CHILD_SAFETY.md).
 */
import { addDays } from "./time";

export interface HijriDate {
  year: number;
  month: number; // 1 = Muharram, 9 = Ramadan, 10 = Shawwal, 12 = Dhul Hijjah
  day: number;
}

const fmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
  timeZone: "UTC",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/** Hijri date for a Gregorian dayKey, shifted by `adjustDays` (negative = the region starts later). */
export function hijriForDayKey(dayKey: string, adjustDays = 0): HijriDate {
  const shifted = addDays(dayKey, adjustDays);
  const parts = fmt.formatToParts(new Date(`${shifted}T12:00:00Z`));
  const get = (t: string) => Number(parts.find((p) => (p.type as string) === t)?.value);
  return { year: get("year") || get("relatedYear"), month: get("month"), day: get("day") };
}

export type Season = { kind: "ramadan"; day: number } | { kind: "eidFitr"; day: number } | { kind: "eidAdha"; day: number } | { kind: "none" };

/** Seasonal state for a day. Eid al-Fitr is shown for 3 days, Eid al-Adha for the 4 days of Eid. */
export function seasonFor(h: HijriDate): Season {
  if (h.month === 9) return { kind: "ramadan", day: h.day };
  if (h.month === 10 && h.day <= 3) return { kind: "eidFitr", day: h.day };
  if (h.month === 12 && h.day >= 10 && h.day <= 13) return { kind: "eidAdha", day: h.day - 9 };
  return { kind: "none" };
}

/** Small mapping from IANA time zone to country, for regional moon-sighting defaults. */
const TZ_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP", "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Baghdad": "IQ", "Asia/Amman": "JO", "Asia/Jerusalem": "PS",
  "Asia/Gaza": "PS", "Asia/Hebron": "PS", "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Tehran": "IR",
  "Asia/Kabul": "AF", "Asia/Kuala_Lumpur": "MY", "Asia/Singapore": "SG", "Asia/Jakarta": "ID", "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID", "Asia/Manila": "PH", "Asia/Tashkent": "UZ", "Asia/Almaty": "KZ", "Asia/Baku": "AZ",
  "Europe/Istanbul": "TR", "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN", "Africa/Lagos": "NG", "Africa/Johannesburg": "ZA", "Africa/Nairobi": "KE",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Vienna": "AT", "Europe/Zurich": "CH",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU", "Australia/Brisbane": "AU",
  "Pacific/Auckland": "NZ", "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA",
};

export function countryForTimeZone(timeZone: string): string {
  if (TZ_COUNTRY[timeZone]) return TZ_COUNTRY[timeZone];
  if (timeZone.startsWith("America/")) return "US";
  return "XX";
}

export interface HijriConfig {
  defaultAdjust: number;
  adjustByCountry: Record<string, number>;
}

/** Total day adjustment: admin regional default plus parent adjustment (each limited to ±2 and ±1). */
export function totalAdjust(config: HijriConfig | undefined, country: string, parentAdjust = 0): number {
  const regional = config?.adjustByCountry?.[country] ?? config?.defaultAdjust ?? 0;
  const clamp = (n: number, m: number) => Math.max(-m, Math.min(m, n));
  return clamp(regional, 2) + clamp(parentAdjust, 1);
}
