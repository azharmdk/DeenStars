/**
 * Sponsor banners (Enhancement 5). Pure rules, no Firebase, so they can be unit tested.
 * - Banners appear only in the parent (Grown-ups) area. Never on child screens or in Bedtime.
 * - Plain static images only: png, jpg or webp from this site's /sponsors/ folder. No video, no
 *   animated formats, no third-party hosts, no scripts, no tracking pixels.
 * - The curated list lives in Firestore (`sponsors`), written by admins only.
 */
export interface Sponsor {
  id: string;
  brandName: string;
  headline: string;
  description?: string;
  /** Same-origin path, for example /sponsors/acme-june.webp */
  imageUrl: string;
  imageAlt: string;
  /** https only. Opens in a new tab. */
  linkUrl: string;
  ctaText?: string;
  /** YYYY-MM-DD, inclusive, UTC. */
  startDate: string;
  endDate: string;
  isActive: boolean;
  sortOrder: number;
  reviewedBy?: string;
  reviewedOn?: string;
}

export interface SponsorsConfig {
  enabled: boolean;
  disclosure: string;
  maxBanners: number;
}

const STATIC_IMAGE = /^\/sponsors\/[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function realDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Problems with one sponsor record. An invalid record is never shown. */
export function validateSponsor(s: Partial<Sponsor> | null | undefined): string[] {
  const e: string[] = [];
  if (!s) return ["missing"];
  const text = (k: keyof Sponsor, max: number, required = true) => {
    const v = s[k];
    if (v === undefined || v === null || v === "") {
      if (required) e.push(`${k} is required`);
    } else if (typeof v !== "string" || v.length > max) e.push(`${k} must be text of at most ${max} characters`);
  };
  text("brandName", 60);
  text("headline", 80);
  text("description", 160, false);
  text("imageAlt", 120);
  text("ctaText", 30, false);
  if (typeof s.imageUrl !== "string" || !STATIC_IMAGE.test(s.imageUrl)) e.push("imageUrl must be a static png, jpg or webp under /sponsors/");
  try {
    if (new URL(String(s.linkUrl)).protocol !== "https:") e.push("linkUrl must start with https://");
  } catch {
    e.push("linkUrl is not a valid URL");
  }
  if (!realDate(s.startDate)) e.push("startDate must be YYYY-MM-DD");
  if (!realDate(s.endDate)) e.push("endDate must be YYYY-MM-DD");
  if (realDate(s.startDate) && realDate(s.endDate) && s.endDate < s.startDate) e.push("endDate must be on or after startDate");
  if (typeof s.isActive !== "boolean") e.push("isActive must be true or false");
  if (typeof s.sortOrder !== "number") e.push("sortOrder must be a number");
  return e;
}

export function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Valid, switched on and inside its date window (preview shows valid ones regardless of dates). */
export function isLive(s: Sponsor, now: Date, preview = false): boolean {
  if (validateSponsor(s).length) return false;
  if (preview) return true;
  const t = todayUtc(now);
  return s.isActive && s.startDate <= t && t <= s.endDate;
}

/** Banners to show, in sort order, at most `maxBanners`. Empty when switched off. */
export function selectBanners(config: SponsorsConfig | null, list: Sponsor[], now: Date, preview = false): Sponsor[] {
  if (!config?.enabled && !preview) return [];
  return list
    .filter((s) => isLive(s, now, preview))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, config?.maxBanners ?? 0));
}

/**
 * Campaign tags so a sponsor can see visits came from DeenStars. They name the banner only:
 * no user, child, account or device identifier is ever added. Existing parameters are kept.
 */
export function sponsorLink(url: string, sponsorId: string): string {
  const u = new URL(url);
  const tags: Record<string, string> = { utm_source: "deenstars", utm_medium: "sponsored", utm_campaign: sponsorId };
  for (const [k, v] of Object.entries(tags)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString();
}
