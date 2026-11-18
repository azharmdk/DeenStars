import { ReactNode, useEffect, useState } from "react";
import { BrandMark } from "./icons";

/** True while the viewport matches the media query. Safe where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return match;
}

/**
 * Responsive frame for signed-in screens.
 * Below 1024 px: sticky top header and the bottom tab bar (the `nav`).
 * 1024 px and up: the same `nav` becomes a left sidebar and the header is hidden.
 */
export function Shell(props: { nav: ReactNode; title?: string; header?: boolean; children: ReactNode; overlays?: ReactNode }) {
  return (
    <div className="with-nav">
      {props.header !== false && (
        <header className="app-header">
          <BrandMark size={28} />
          <span className="app-header-name">DeenStars</span>
          {props.title && <span className="app-header-title">{props.title}</span>}
        </header>
      )}
      <aside className="side">
        <div className="side-brand">
          <BrandMark size={36} />
          <span>DeenStars</span>
        </div>
        {props.nav}
      </aside>
      <div className="main">{props.children}</div>
      {props.overlays}
    </div>
  );
}