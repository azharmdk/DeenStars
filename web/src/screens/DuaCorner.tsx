import { useState } from "react";
import { Child } from "../types";
import { Sheet } from "../components/common";

/**
 * Dua Corner UI prototype. No dua text is included: Arabic, transliteration, translation and
 * source must come from reviewed content (docs/ISLAMIC_CONTENT_POLICY.md). Learning state is kept
 * on this device only until the updateDuaProgress function is built.
 */
const SAMPLE_DUAS = [
  { id: "eat_before", title: "Before eating", emoji: "🍽️", when: "Before you start eating" },
  { id: "eat_after", title: "After eating", emoji: "😋", when: "When you finish eating" },
  { id: "sleep", title: "Before sleeping", emoji: "😴", when: "When you get into bed" },
  { id: "wake", title: "After waking up", emoji: "🌅", when: "When you wake up" },
  { id: "bathroom", title: "Entering the bathroom", emoji: "🚿", when: "Before you go into the bathroom" },
  { id: "home", title: "Leaving home", emoji: "🏡", when: "When you go out of the house" },
];

const STATES = ["notStarted", "learning", "practising", "learned"] as const;
type DuaState = (typeof STATES)[number];
const LABEL: Record<DuaState, string> = {
  notStarted: "Not started",
  learning: "Learning",
  practising: "Practising",
  learned: "Learned",
};

function key(childId: string) {
  return `ds_dua_progress_${childId}`;
}

export function DuaCorner({ child, onBack }: { child: Child; onBack: () => void }) {
  const [progress, setProgress] = useState<Record<string, DuaState>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key(child.id)) ?? "{}");
    } catch {
      return {};
    }
  });
  const [open, setOpen] = useState<(typeof SAMPLE_DUAS)[number] | null>(null);

  function setState(id: string, s: DuaState) {
    const next = { ...progress, [id]: s };
    setProgress(next);
    localStorage.setItem(key(child.id), JSON.stringify(next));
  }

  const learnedCount = Object.values(progress).filter((s) => s === "learned").length;

  return (
    <div className="screen">
      <button className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={onBack}>
        ← Back
      </button>
      <h1>Dua Corner 🤲</h1>
      <p className="muted">My progress: {learnedCount} of {SAMPLE_DUAS.length} learned</p>
      <div className="grid2">
        {SAMPLE_DUAS.map((d) => {
          const s = progress[d.id] ?? "notStarted";
          return (
            <button key={d.id} className="tile" style={{ background: s === "learned" ? "var(--mint)" : "var(--lavender-soft)" }} onClick={() => setOpen(d)}>
              <span className="icon" aria-hidden="true">{d.emoji}</span>
              <span>{d.title}</span>
              <span className="small muted">{LABEL[s]}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet label={open.title} onClose={() => setOpen(null)}>
          <div className="stack">
            <div className="big-pic" style={{ background: "var(--lavender-soft)" }} aria-hidden="true">{open.emoji}</div>
            <h2>{open.title}</h2>
            <div className="card stack center" style={{ minHeight: 120, justifyContent: "center" }}>
              <p dir="rtl" lang="ar" style={{ fontSize: 26, color: "var(--ink-soft)" }}>
                — Arabic text —
              </p>
              <p className="small muted">The reviewed Arabic text, transliteration, meaning and audio will appear here.</p>
            </div>
            <div className="gentle-box small">When: {open.when}</div>
            <div className="small muted">Source: added after scholar review</div>
            <div className="stack" style={{ gap: 6 }}>
              <span style={{ fontWeight: 700 }}>How am I doing?</span>
              <div className="chips">
                {STATES.map((s) => (
                  <button key={s} className="chip" aria-pressed={(progress[open.id] ?? "notStarted") === s} onClick={() => setState(open.id, s)}>
                    {LABEL[s]}
                  </button>
                ))}
              </div>
              <span className="small muted">A grown-up can confirm when you know it by heart.</span>
            </div>
            <button className="btn btn-ghost" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
