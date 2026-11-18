import { useEffect, useState } from "react";

/** Tiny path router for the public website. No dependency. Hosting rewrites every path to index.html. */
const EVENT = "ds:navigate";

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const [path, hash] = to.split("#");
  // Keep the query string (for example ?adpreview=1) so preview settings survive page changes.
  const url = path + window.location.search + (hash ? `#${hash}` : "");
  if (url !== window.location.pathname + window.location.search + window.location.hash) {
    if (opts.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }
  window.dispatchEvent(new Event(EVENT));
  requestAnimationFrame(() => {
    const el = hash ? document.getElementById(hash) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo(0, 0);
  });
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  return path;
}

/** Click handler for <a href>: keeps normal browser behaviour for new-tab clicks. */
export function linkTo(to: string) {
  return (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
}