import { ReactNode, useEffect } from "react";

export function PrototypeBanner() {
  return (
    <div className="proto-banner" role="note">
      Prototype for testing · sample content, not reviewed · use test data only
    </div>
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
        <div className="big" aria-hidden="true">🌟</div>
        <h2>{text}</h2>
        {stars ? <p className="star-count" style={{ color: "var(--gold)" }}>+{stars} ⭐</p> : null}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      {message}
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

/** Speaks text with the browser voice (UI prompts only, never Quran or duas). */
export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

export function ListenButton({ text }: { text: string }) {
  return (
    <button className="btn btn-secondary" onClick={() => speak(text)} aria-label={`Listen: ${text}`}>
      🔊 Listen
    </button>
  );
}
