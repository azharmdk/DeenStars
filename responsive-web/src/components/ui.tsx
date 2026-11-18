/**
 * v0.3 building blocks: illustrated art, banner cards, horizontal rails and section headers.
 * Art: Microsoft Fluent Emoji 3D (MIT), self-hosted in public/art. See public/art/LICENSE.txt.
 */
import { ReactNode } from "react";
import { ChevronRight, Lock } from "lucide-react";

export type ArtName =
  | "star" | "glowing-star" | "moon" | "night" | "mosque" | "book" | "books" | "puzzle" | "trophy" | "medal"
  | "sparkles" | "seedling" | "heart" | "sparkling-heart" | "sun" | "sunrise" | "bed" | "gift" | "party" | "teddy"
  | "camel" | "palm" | "rainbow" | "rocket" | "question" | "cards" | "plate" | "house" | "soap" | "droplet"
  | "calendar" | "check" | "lock" | "shield" | "clipboard" | "wastebasket" | "eyes" | "cat" | "bird" | "fish"
  | "flower" | "clover" | "dove" | "hourglass" | "smile" | "door" | "bulb" | "palms-up";

/** Decorative by default (hidden from VoiceOver). Pass `alt` when the picture carries meaning. */
export function Art({ name, size = 48, alt, className, style }: { name: ArtName; size?: number; alt?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={`/art/${name}.png`}
      width={size}
      height={size}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`art ${className ?? ""}`}
      style={style}
    />
  );
}

export type Tone = "green" | "blue" | "purple" | "orange" | "pink" | "teal" | "gold" | "night";

/** Explore-style card: gradient, bold white title, large art bleeding off the corner. */
export function Banner(props: {
  title: string;
  sub?: string;
  tone: Tone;
  art: ArtName;
  onClick?: () => void;
  wide?: boolean;
  locked?: boolean;
  badge?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="banner-text">
        {props.badge && <span className="banner-badge">{props.badge}</span>}
        <span className="banner-title">{props.title}</span>
        {props.sub && <span className="banner-sub">{props.sub}</span>}
        {props.children}
      </span>
      <Art name={props.art} size={props.wide ? 112 : 88} className="banner-art" />
      {props.locked && (
        <span className="banner-lock" aria-hidden="true">
          <Lock size={14} strokeWidth={2.6} />
        </span>
      )}
    </>
  );
  const cls = `banner g-${props.tone}${props.wide ? " wide" : ""}${props.locked ? " locked" : ""}`;
  if (!props.onClick) {
    return (
      <div className={cls} aria-disabled={props.locked || undefined}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" className={cls} onClick={props.onClick}>
      {body}
    </button>
  );
}

export function SectionHeader({ title, onMore, moreLabel }: { title: string; onMore?: () => void; moreLabel?: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {onMore && (
        <button type="button" className="section-more" onClick={onMore} aria-label={moreLabel ?? `See all ${title}`}>
          <ChevronRight size={22} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Horizontal scroll row with snap. Children should be `.rail-card` items. */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="rail" role="list" aria-label={label}>
      {children}
    </div>
  );
}

/** Page title bar used at the top of child screens. */
export function PageTitle({ title, sub, art, right }: { title: string; sub?: string; art?: ArtName; right?: ReactNode }) {
  return (
    <div className="page-title">
      {art && <Art name={art} size={44} />}
      <span className="stack" style={{ gap: 0, flex: 1 }}>
        <h1>{title}</h1>
        {sub && <span className="muted small">{sub}</span>}
      </span>
      {right}
    </div>
  );
}
