import { useEffect, useState } from "react";

export function PinPad({ length = 4, onComplete, disabled }: { length?: number; onComplete: (pin: string) => void; disabled?: boolean }) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pin.length === length) {
      onComplete(pin);
      setPin("");
    }
  }, [pin, length, onComplete]);

  function press(d: string) {
    if (disabled) return;
    setPin((p) => (p.length < length ? p + d : p));
  }

  return (
    <div className="stack" style={{ alignItems: "center", gap: 24 }}>
      <div className="pin-dots" aria-label={`${pin.length} of ${length} digits entered`} role="status">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <div className="pinpad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={disabled} aria-label={d}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press("0")} disabled={disabled} aria-label="0">
          0
        </button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} disabled={disabled} aria-label="Delete" style={{ fontSize: 22 }}>
          ⌫
        </button>
      </div>
    </div>
  );
}
