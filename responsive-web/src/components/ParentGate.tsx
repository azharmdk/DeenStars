import { useState } from "react";
import { BackLink } from "./common";
import { Art } from "./ui";
/** Parental gate: an adult reading-and-arithmetic check that young children can't easily pass. */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function makeGate() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const answer = a + b;
  const options = new Set([answer]);
  while (options.size < 4) options.add(answer + Math.floor(Math.random() * 9) - 4);
  return { a, b, answer, options: [...options].sort((x, y) => x - y) };
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [gate, setGate] = useState(makeGate);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="screen no-tabs">
      <BackLink onClick={onCancel} />
      <div className="stack center" style={{ gap: 12, marginTop: 24 }}>
        <Art name="lock" size={96} />
        <h1>For grown-ups</h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 320 }}>
          Tap the number that is <strong style={{ color: "var(--ink)" }}>{WORDS[gate.a]}</strong> plus{" "}
          <strong style={{ color: "var(--ink)" }}>{WORDS[gate.b]}</strong>.
        </p>
      </div>
      <div className="grid2" style={{ marginTop: 8 }}>
        {gate.options.map((n) => (
          <button
            key={n}
            className="btn btn-secondary btn-child"
            style={{ fontSize: 22 }}
            onClick={() => {
              if (n === gate.answer) onPass();
              else {
                setWrong(true);
                setGate(makeGate());
              }
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {wrong && <p className="muted small" style={{ textAlign: "center" }}>Not quite. Here's a new question.</p>}
    </div>
  );
}
