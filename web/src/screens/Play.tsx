import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleHelp,
  Gift,
  Hand,
  HandHeart,
  Lamp,
  Landmark,
  Layers,
  Library,
  Moon,
  Puzzle,
  Shapes,
  Star,
  ToyBrick,
  TreePalm,
  Users,
  X,
} from "lucide-react";
import { Child } from "../types";
import { BackLink } from "../components/common";

/**
 * Play & Learn UI prototype. Quiz questions are SAMPLE manners scenarios, not reviewed content,
 * and make no Quran or Hadith claims. No stars are awarded here yet: quiz and game stars need the
 * server-side submitQuizAttempt / submitGameResult functions (docs/QUIZ_ENGINE.md).
 */

interface Q {
  prompt: string;
  Icon: LucideIcon;
  options: { text: string; correct?: boolean }[];
  explanation: string;
}

const SAMPLE_QUIZ: Q[] = [
  {
    prompt: "Your friend dropped their crayons. What is a kind thing to do?",
    Icon: HandHeart,
    options: [{ text: "Help pick them up", correct: true }, { text: "Walk away" }, { text: "Laugh at them" }, { text: "Take one" }],
    explanation: "Helping others is kind, and it makes everyone happy.",
  },
  {
    prompt: "Someone gives you a present. What can you say?",
    Icon: Gift,
    options: [{ text: "Thank you!", correct: true }, { text: "Nothing" }, { text: "I want more" }, { text: "Go away" }],
    explanation: "Saying thank you shows we are grateful.",
  },
  {
    prompt: "You finished playing with your toys. What should you do?",
    Icon: ToyBrick,
    options: [{ text: "Put them away", correct: true }, { text: "Leave them everywhere" }, { text: "Hide them" }, { text: "Throw them" }],
    explanation: "Tidying up helps our family and keeps our home nice.",
  },
  {
    prompt: "Your little brother wants to play too. What can you do?",
    Icon: Users,
    options: [{ text: "Share and play together", correct: true }, { text: "Say no" }, { text: "Run away" }, { text: "Shout" }],
    explanation: "Sharing is caring, and playing together is more fun.",
  },
];

function optionCount(child: Child) {
  return child.ageGroup === "3-4" ? 2 : child.ageGroup === "5" ? 3 : 4;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SOON: { title: string; Icon?: LucideIcon; arabic?: string; fg: string; bg: string }[] = [
  { title: "Dua Matching", Icon: HandHeart, fg: "var(--c-dua)", bg: "var(--c-dua-bg)" },
  { title: "Build the Masjid", Icon: Landmark, fg: "var(--c-salah)", bg: "var(--c-salah-bg)" },
  { title: "Arabic Letters", arabic: "أ ب", fg: "var(--c-habit)", bg: "var(--c-habit-bg)" },
  { title: "Story Sequence", Icon: Library, fg: "var(--c-manners)", bg: "var(--c-manners-bg)" },
  { title: "Five Pillars", Icon: Hand, fg: "var(--c-deed)", bg: "var(--c-deed-bg)" },
];

export function PlayTab({ child, onCelebrate }: { child: Child; onCelebrate: (text: string) => void }) {
  const [mode, setMode] = useState<"menu" | "quiz" | "match">("menu");
  if (mode === "quiz") return <Quiz child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;
  if (mode === "match") return <MatchGame child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;

  return (
    <div className="screen">
      <h1>Play & Learn</h1>
      <div className="grid2">
        <button className="tile" onClick={() => setMode("quiz")}>
          <span className="icon-chip" style={{ background: "var(--c-quran-bg)", color: "var(--c-quran)" }} aria-hidden="true">
            <CircleHelp size={22} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Kindness Quiz
            <span className="sub">4 questions</span>
          </span>
        </button>
        <button className="tile" onClick={() => setMode("match")}>
          <span className="icon-chip" style={{ background: "var(--c-salah-bg)", color: "var(--c-salah)" }} aria-hidden="true">
            <Layers size={22} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Picture Matching
            <span className="sub">Memory game</span>
          </span>
        </button>
      </div>
      <span className="section-title">Coming soon</span>
      <div className="grid2">
        {SOON.map((s) => (
          <div key={s.title} className="tile disabled" aria-disabled="true">
            <span className="icon-chip" style={{ background: s.bg, color: s.fg }} aria-hidden="true">
              {s.arabic ? (
                <span className="arabic" dir="rtl" lang="ar" style={{ fontSize: 19, fontWeight: 700 }}>{s.arabic}</span>
              ) : s.Icon ? (
                <s.Icon size={22} />
              ) : null}
            </span>
            <span className="stack" style={{ gap: 2 }}>
              {s.title}
              <span className="sub">Coming soon</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quiz({ child, onExit, onCelebrate }: { child: Child; onExit: () => void; onCelebrate: (t: string) => void }) {
  const questions = useMemo(() => {
    const n = optionCount(child);
    const count = child.ageGroup === "3-4" ? 3 : 4;
    return SAMPLE_QUIZ.slice(0, count).map((q) => {
      const correct = q.options.filter((o) => o.correct);
      const wrong = q.options.filter((o) => !o.correct).slice(0, n - 1);
      return { ...q, options: shuffle([...correct, ...wrong]) };
    });
  }, [child]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const q = questions[i];

  if (finished) {
    return (
      <div className="screen center" style={{ gap: 16 }}>
        <span className="icon-chip lg" style={{ width: 88, height: 88, borderRadius: 28, background: "var(--accent-soft)", color: "var(--accent)" }} aria-hidden="true">
          <Star size={44} fill="currentColor" />
        </span>
        <h1>You learned {questions.length} new things!</h1>
        <p className="muted small">Sample quiz. Quiz stars will come with the reviewed question bank.</p>
        <button className="btn btn-primary btn-child" onClick={() => { setI(0); setPicked(null); setFinished(false); }}>
          Play again
        </button>
        <button className="btn btn-ghost" onClick={onExit}>Back to Play & Learn</button>
      </div>
    );
  }

  const answered = picked !== null;
  const right = answered && q.options[picked!].correct;
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="screen">
      <div className="row between">
        <button className="icon-btn" onClick={onExit} aria-label="Close quiz"><X size={20} aria-hidden="true" /></button>
        <div className="dots" aria-label={`Question ${i + 1} of ${questions.length}`}>
          {questions.map((_, k) => <span key={k} className={k <= i ? "on" : ""} />)}
        </div>
        <span style={{ width: 44 }} aria-hidden="true" />
      </div>
      <div className="feature-panel" style={{ backgroundColor: "var(--c-quran-bg)", color: "var(--c-quran)" }} aria-hidden="true">
        <q.Icon size={60} strokeWidth={1.6} />
      </div>
      <span className="eyebrow">Question {i + 1} of {questions.length}</span>
      <h2 style={{ marginTop: -8 }}>{q.prompt}</h2>
      <div className="stack">
        {q.options.map((o, k) => {
          let cls = "option";
          if (answered && o.correct) cls += " correct";
          else if (answered && k === picked) cls += " gentle";
          return (
            <button
              key={o.text}
              className={cls}
              disabled={answered}
              onClick={() => {
                setPicked(k);
              }}
            >
              <span className="letter" aria-hidden="true">{letters[k]}</span>
              {o.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="card stack" role="status">
          <h3>{right ? "Yes, well done!" : "Good try! Let's learn together."}</h3>
          <p className="muted">{q.explanation}</p>
          <button
            className="btn btn-primary btn-child"
            onClick={() => {
              if (i + 1 < questions.length) { setI(i + 1); setPicked(null); }
              else { setFinished(true); onCelebrate("Quiz complete"); }
            }}
          >
            {i + 1 < questions.length ? "Next question" : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}

const PICTURES: { id: string; label: string; Icon: LucideIcon; fg: string }[] = [
  { id: "masjid", label: "Masjid", Icon: Landmark, fg: "var(--c-salah)" },
  { id: "moon", label: "Crescent moon", Icon: Moon, fg: "var(--c-jummah)" },
  { id: "lantern", label: "Lantern", Icon: Lamp, fg: "var(--c-dua)" },
  { id: "palm", label: "Date palm", Icon: TreePalm, fg: "var(--c-habit)" },
  { id: "star", label: "Star", Icon: Star, fg: "var(--accent)" },
  { id: "book", label: "Book", Icon: BookOpen, fg: "var(--c-quran)" },
];

function MatchGame({ child, onExit, onCelebrate }: { child: Child; onExit: () => void; onCelebrate: (t: string) => void }) {
  const pairs = child.ageGroup === "3-4" ? 3 : child.ageGroup === "5" ? 4 : 6;
  const [round, setRound] = useState(0);
  const cards = useMemo(
    () => shuffle(PICTURES.slice(0, pairs).flatMap((p) => [{ ...p, key: `${p.id}-a` }, { ...p, key: `${p.id}-b` }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs, round],
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const done = matched.length === pairs;

  function flip(card: (typeof cards)[number]) {
    if (flipped.length === 2 || flipped.includes(card.key) || matched.includes(card.id)) return;
    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length === 2) {
      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      if (a.id === b.id) {
        setTimeout(() => {
          const m = [...matched, a.id];
          setMatched(m);
          setFlipped([]);
          if (m.length === pairs) onCelebrate("You matched them all!");
        }, 350);
      } else {
        // No penalty: cards just turn back over.
        setTimeout(() => setFlipped([]), 900);
      }
    }
  }

  return (
    <div className="screen">
      <div className="row between">
        <BackLink onClick={onExit} />
        <span className="muted small strong">{matched.length} of {pairs} pairs</span>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Picture Matching</h1>
        <p className="muted">Find the two cards that match.</p>
      </div>
      <div className="grid3">
        {cards.map((c) => {
          const isMatched = matched.includes(c.id);
          const show = flipped.includes(c.key) || isMatched;
          return (
            <button
              key={c.key}
              className={`memory-card ${isMatched ? "matched" : show ? "shown" : "hidden"}`}
              aria-label={show ? c.label : "Hidden card"}
              onClick={() => flip(c)}
            >
              {show ? <c.Icon size={40} color={c.fg} strokeWidth={1.8} aria-hidden="true" /> : <Shapes size={26} color="rgba(255,255,255,0.55)" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {done && (
        <button className="btn btn-primary btn-child" onClick={() => { setMatched([]); setFlipped([]); setRound(round + 1); }}>
          <Puzzle size={20} aria-hidden="true" /> Play again
        </button>
      )}
    </div>
  );
}
