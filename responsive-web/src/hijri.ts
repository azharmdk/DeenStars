// Mirrors functions/src/lib/hijri.ts. The server stays authoritative for completions.
import { addDays } from "./time";

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

const fmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", { timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric" });

export function hijriForDayKey(dayKey: string, adjustDays = 0): HijriDate {
  const parts = fmt.formatToParts(new Date(`${addDays(dayKey, adjustDays)}T12:00:00Z`));
  const get = (t: string) => Number(parts.find((p) => (p.type as string) === t)?.value);
  return { year: get("year") || get("relatedYear"), month: get("month"), day: get("day") };
}

export type Season =
  | { kind: "ramadan"; day: number }
  | { kind: "eidFitr"; day: number }
  | { kind: "eidAdha"; day: number }
  | { kind: "none" };

export function seasonFor(h: HijriDate): Season {
  if (h.month === 9) return { kind: "ramadan", day: h.day };
  if (h.month === 10 && h.day <= 3) return { kind: "eidFitr", day: h.day };
  if (h.month === 12 && h.day >= 10 && h.day <= 13) return { kind: "eidAdha", day: h.day - 9 };
  return { kind: "none" };
}

/** Days until 1 Ramadan, looking ahead up to 400 days. */
export function daysUntilRamadan(dayKey: string, adjust: number): number | null {
  for (let i = 1; i < 400; i++) {
    const h = hijriForDayKey(addDays(dayKey, i), adjust);
    if (h.month === 9 && h.day === 1) return i;
  }
  return null;
}

const HIJRI_MONTHS = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhul Qadah", "Dhul Hijjah"];
export function formatHijri(h: HijriDate): string {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

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

export function countryForTimeZone(tz: string): string {
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  if (tz.startsWith("America/")) return "US";
  return "XX";
}

export const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", NP: "Nepal", SA: "Saudi Arabia", AE: "United Arab Emirates",
  QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", IQ: "Iraq", JO: "Jordan", PS: "Palestine", LB: "Lebanon", SY: "Syria",
  IR: "Iran", AF: "Afghanistan", MY: "Malaysia", SG: "Singapore", ID: "Indonesia", PH: "Philippines", UZ: "Uzbekistan",
  KZ: "Kazakhstan", AZ: "Azerbaijan", TR: "Turkey", EG: "Egypt", MA: "Morocco", DZ: "Algeria", TN: "Tunisia", NG: "Nigeria",
  ZA: "South Africa", KE: "Kenya", GB: "United Kingdom", IE: "Ireland", FR: "France", DE: "Germany", NL: "Netherlands",
  BE: "Belgium", SE: "Sweden", NO: "Norway", DK: "Denmark", ES: "Spain", IT: "Italy", AT: "Austria", CH: "Switzerland",
  AU: "Australia", NZ: "New Zealand", CA: "Canada", US: "United States", XX: "Other",
};

export function totalAdjust(config: { defaultAdjust?: number; adjustByCountry?: Record<string, number> } | null, country: string, parentAdjust = 0) {
  const regional = config?.adjustByCountry?.[country] ?? config?.defaultAdjust ?? 0;
  const clamp = (n: number, m: number) => Math.max(-m, Math.min(m, n));
  return clamp(regional, 2) + clamp(parentAdjust, 1);
}
