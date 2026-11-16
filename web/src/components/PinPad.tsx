import { useEffect, useRef, useState } from "react";

/**
 * PIN entry. While the parent screen checks the PIN (busy), the dots stay filled and a
 * "Checking…" message shows, so the pad never looks frozen. The pad clears when busy ends
 * (wrong PIN) or when the parent remounts it with a new key.
 */
export function PinPad({ length = 4, onComplete, busy }: { length?: number; onComplete: (pin: string) => void; busy?: boolean }) {
  const [pin, setPin] = useState("");
  const wasBusy = useRef(false);

  useEffect(() => {
    if (wasBusy.current && !busy) setPin("");
    wasBusy.current = !!busy;
  }, [busy]);

  function press(d: string) {
    if (busy || pin.length >= length) return;
    const next = pin + d;
    setPin(next);
    if (next.length === length) {
      onComplete(next);
      // If the parent did not start a check (e.g. first entry of a new PIN), clear for the next entry.
      setTimeout(() => {
        if (!wasBusy.current) setPin("");
      }, 150);
    }
  }

  const full = pin.length === length;
  return (
    <div className="stack" style={{ alignItems: "center", gap: 24 }}>
      <div className="pin-dots" aria-hidden="true">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <p className="muted small" role="status" aria-live="polite" style={{ minHeight: 20 }}>
        {busy && full ? "Checking…" : `${pin.length} of ${length} digits entered`}
      </p>
      <div className="pinpad" style={{ opacity: busy ? 0.6 : 1 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={busy} aria-label={d}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press("0")} disabled={busy} aria-label="0">
          0
        </button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy} aria-label="Delete" style={{ fontSize: 22 }}>
          ⌫
        </button>
      </div>
    </div>
  );
}
