import { useState } from "react";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { Child } from "../types";
import { BackLink, ProgressBar, Sheet } from "../components/common";
import { DUA_ICONS } from "../components/icons";

/**
 * Dua Corner UI prototype. No dua text is included: Arabic, transliteration, translation and
 * source must come from reviewed content (docs/ISLAMIC_CONTENT_POLICY.md). Learning state is kept
 * on this device only until the updateDuaProgress function is built.
 */
const SAMPLE_DUAS = [
  { id: "eat_before", title: "Before eating", when: "Before you start eating" },
  { id: "eat_after", title: "After eating", when: "When you finish eating" },
  { id: "sleep", title: "Before sleeping", when: "When you get into bed" },
  { id: "wake", title: "After waking up", when: "When you wake up" },
  { id: "bathroom", title: "Entering the bathroom", when: "Before you go into the bathroom" },
  { id: "home", title: "Leaving home", when: "When you go out of the house" },
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
      <BackLink onClick={onBack} />
      <div className="stack" style={{ gap: 10 }}>
        <h1>Dua Corner</h1>
        <div className="row between">
          <span className="muted small">{learnedCount} of {SAMPLE_DUAS.length} learned</span>
        </div>
        <ProgressBar value={learnedCount / SAMPLE_DUAS.length} label="Duas learned" />
      </div>
      <div className="list">
        {SAMPLE_DUAS.map((d) => {
          const s = progress[d.id] ?? "notStarted";
          const Icon = DUA_ICONS[d.id];
          return (
            <button key={d.id} className="list-item" onClick={() => setOpen(d)}>
              <span className="icon-chip" style={{ background: "var(--c-dua-bg)", color: "var(--c-dua)" }} aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="stack" style={{ gap: 2, flex: 1 }}>
                <span className="strong">{d.title}</span>
                <span className="small faint">{LABEL[s]}</span>
              </span>
              {s === "learned" ? (
                <span className="check-circle done" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
              ) : (
                <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet label={open.title} onClose={() => setOpen(null)}>
          <div className="stack" style={{ gap: 14 }}>
            <span className="eyebrow" style={{ color: "var(--c-dua)" }}>Dua · sample</span>
            <h2>{open.title}</h2>
            <div className="card stack center" style={{ minHeight: 150, justifyContent: "center", gap: 8 }}>
              <p className="arabic" dir="rtl" lang="ar" style={{ fontSize: 28, color: "var(--ink-3)" }}>
                ـــــــــ
              </p>
              <p className="small muted" style={{ maxWidth: 300 }}>
                The Arabic text, transliteration, meaning and audio will appear here once a scholar has reviewed them.
              </p>
            </div>
            <div className="row small muted" style={{ gap: 8 }}>
              <span className="strong" style={{ color: "var(--ink)" }}>When:</span> {open.when}
            </div>
            <div className="row tiny faint" style={{ gap: 6 }}>
              <ShieldCheck size={16} aria-hidden="true" /> Source reference added after review
            </div>
            <div className="field">
              <span className="label">How am I doing?</span>
              <div className="segmented" role="group" aria-label="Learning progress">
                {STATES.map((s) => (
                  <button key={s} aria-pressed={(progress[open.id] ?? "notStarted") === s} onClick={() => setState(open.id, s)} style={{ fontSize: 13 }}>
                    {LABEL[s]}
                  </button>
                ))}
              </div>
              <span className="tiny faint">A grown-up can confirm when you know it by heart.</span>
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
