import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useConfig } from "../data";
import { testerToolsEnabled } from "../devFlags";
import { selectBanners, Sponsor, SponsorsConfig, sponsorLink } from "./rules";

/**
 * Static sponsor banners for the parent (Grown-ups) area only. Import this from ParentApp only;
 * test/sponsors-boundary.test.ts fails the build if a child screen imports it.
 */
let cache: Sponsor[] | null = null;

function useSponsorList(): Sponsor[] | null {
  const [list, setList] = useState<Sponsor[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    getDocs(collection(db, "sponsors"))
      .then((snap) => {
        cache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sponsor, "id">) }));
        setList(cache);
      })
      .catch(() => setList([]));
  }, []);
  return list;
}

/** Tester tools plus ?sponsorpreview=1 shows valid sponsors regardless of dates or the switch. */
function isPreview(): boolean {
  return testerToolsEnabled && new URLSearchParams(window.location.search).get("sponsorpreview") === "1";
}

function Banner({ s, preview }: { s: Sponsor; preview: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null; // a missing image removes the whole banner, leaving no gap
  return (
    <a
      className={`sponsor-banner${preview ? " is-preview" : ""}`}
      href={sponsorLink(s.linkUrl, s.id)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`Sponsored: ${s.brandName}. ${s.headline}. Opens in a new tab.`}
    >
      <img className="sponsor-image" src={s.imageUrl} alt={s.imageAlt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      <span className="sponsor-body">
        <span className="sponsor-label">{preview ? "Preview · " : ""}Sponsored</span>
        <span className="sponsor-brand">{s.brandName}</span>
        <span className="sponsor-headline">{s.headline}</span>
        {s.description && <span className="small muted">{s.description}</span>}
        <span className="sponsor-cta">
          {s.ctaText || "Visit website"}
          <ExternalLink size={15} aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}

/** Renders nothing at all when no sponsor is live. */
export function SponsorBanners() {
  const config = useConfig<SponsorsConfig>("sponsors");
  const list = useSponsorList();
  const preview = isPreview();
  if (!list) return null;
  const banners = selectBanners(config, list, new Date(), preview);
  if (banners.length === 0) return null;
  return (
    <section className="sponsors" aria-label="Sponsored">
      {banners.map((s) => (
        <Banner key={s.id} s={s} preview={preview} />
      ))}
      <p className="sponsor-disclosure" role="note">
        {config?.disclosure || "Sponsored banners are paid placements. Sponsors never see who you or your children are."}
      </p>
    </section>
  );
}
