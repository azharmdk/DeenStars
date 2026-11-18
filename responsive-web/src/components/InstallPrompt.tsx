import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { safeStorage } from "../storage";

/**
 * "Add to Home Screen" (PWA) prompt for grown-ups, so the website can be kept on a phone like an app
 * without an app store. Shown on grown-up pages only (website pages and the parent area), never on
 * child screens. Dismissed for 30 days per device. Nothing is sent anywhere.
 *
 * - Chrome, Edge, Samsung Internet (Android, desktop): the browser's own install dialog.
 * - Safari on iPhone and iPad: there is no install dialog, so short instructions are shown.
 * - In-app browsers (Instagram, Facebook): installing is not possible there, so it suggests opening
 *   the page in the phone's browser.
 * - Already installed (standalone): nothing is shown.
 */
const KEY = "ds_install_dismissed_at";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // show our own button instead of the browser's mini bar
    deferred = e as InstallEvent;
    window.dispatchEvent(new Event("ds:installable"));
  });
}

export type InstallKind = "native" | "ios" | "in-app" | null;

export function installKind(ua: string, standalone: boolean, hasPrompt: boolean): InstallKind {
  if (standalone) return null;
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok/i.test(ua)) return "in-app";
  if (hasPrompt) return "native";
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  if (iOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) return "ios";
  return null;
}

function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function InstallPrompt() {
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(() => {
    const at = Number(safeStorage.getItem(KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_MS;
  });
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener("ds:installable", on);
    window.addEventListener("appinstalled", on);
    return () => {
      window.removeEventListener("ds:installable", on);
      window.removeEventListener("appinstalled", on);
    };
  }, []);
  const kind = installKind(navigator.userAgent, isStandalone(), !!deferred);
  if (hidden || !kind) return null;

  const dismiss = () => {
    safeStorage.setItem(KEY, String(Date.now()));
    setHidden(true);
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    deferred = null;
    dismiss();
  };

  return (
    <div className="install-prompt" role="region" aria-label="Add DeenStars to your home screen">
      <span className="install-text">
        {kind === "native" && <>Keep DeenStars on your phone or computer, like an app. Free, no app store.</>}
        {kind === "ios" && (
          <>
            Add DeenStars to your Home Screen: tap <Share size={15} aria-label="Share" style={{ verticalAlign: "-2px" }} /> then <strong>Add to Home Screen</strong>.
          </>
        )}
        {kind === "in-app" && <>To keep DeenStars on your phone, open this page in your browser (menu, then Open in browser).</>}
      </span>
      {kind === "native" && (
        <button type="button" className="btn btn-primary btn-sm" onClick={install}>
          <Download size={16} aria-hidden="true" /> Install
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="Not now" onClick={dismiss}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
