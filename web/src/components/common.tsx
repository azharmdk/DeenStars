import { ReactNode, useEffect } from "react";
import { AlertCircle, ChevronLeft, Info, Star, Volume2 } from "lucide-react";

export function PrototypeBanner() {
  return (
    <div className="proto-banner" role="note">
      Test build · sample content, not yet reviewed · please use made-up details
    </div>
  );
}

export function BackLink({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="back-link" onClick={onClick}>
      <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </button>
  );
}

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

export function Celebration({ stars, text, onDone }: { stars?: number; text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="celebrate" role="status" aria-live="polite">
      <div className="burst">
        <div className="ring" aria-hidden="true">
          <Star size={36} fill="currentColor" strokeWidth={1.5} />
        </div>
        <h2>{text}</h2>
        {stars ? <p className="metric-sm" style={{ color: "var(--accent)" }}>+{stars} stars</p> : null}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={18} aria-hidden="true" style={{ marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "calm" }) {
  return (
    <div className={`notice ${tone}`} role="status">
      <Info size={18} aria-hidden="true" style={{ marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="screen no-tabs center" aria-busy="true">
      <p className="muted">{label}…</p>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StarCount({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="row" style={{ gap: 4, display: "inline-flex" }}>
      <Star size={size} fill="var(--accent)" color="var(--accent)" aria-hidden="true" />
      <span className="strong">{n}</span>
    </span>
  );
}

/** Speaks text with the browser voice (UI prompts only, never Quran or duas). */
export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

export function ListenButton({ text, compact }: { text: string; compact?: boolean }) {
  if (compact) {
    return (
      <button className="icon-btn" onClick={() => speak(text)} aria-label={`Listen: ${text}`}>
        <Volume2 size={20} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button className="btn btn-secondary" onClick={() => speak(text)} aria-label={`Listen: ${text}`}>
      <Volume2 size={18} aria-hidden="true" /> Listen
    </button>
  );
}
