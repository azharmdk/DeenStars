import { useMemo, useState } from "react";
import { Child } from "../types";
import { speak } from "../components/common";

/**
 * Play & Learn UI prototype. Quiz questions are SAMPLE manners scenarios, not reviewed content,
 * and make no Quran or Hadith claims. No stars are awarded here yet: quiz and game stars need the
 * server-side submitQuizAttempt / submitGameResult functions (docs/QUIZ_ENGINE.md).
 */

interface Q {
  prompt: string;
  emoji: string;
  options: { text: string; emoji: string; correct?: boolean }[];
  explanation: string;
}

const SAMPLE_QUIZ: Q[] = [
  {
    prompt: "Your friend dropped their crayons. What is a kind thing to do?",
    emoji: "🖍️",
    options: [
      { text: "Help pick them up", emoji: "🤝", correct: true },
      { text: "Walk away", emoji: "🚶" },
      { text: "Laugh", emoji: "😆" },
      { text: "Take one", emoji: "✋" },
    ],
    explanation: "Helping others is kind. It makes everyone happy.",
  },
  {
    prompt: "Someone gives you a present. What can you say?",
    emoji: "🎁",
    options: [
      { text: "Thank you!", emoji: "😊", correct: true },
      { text: "Nothing", emoji: "😶" },
      { text: "I want more", emoji: "🙄" },
      { text: "Go away", emoji: "🙅" },
    ],
    explanation: "Saying thank you shows we are grateful.",
  },
  {
    prompt: "You finished playing with your toys. What should you do?",
    emoji: "🧸",
    options: [
      { text: "Put them away", emoji: "📦", correct: true },
      { text: "Leave them everywhere", emoji: "🌪️" },
      { text: "Hide them", emoji: "🙈" },
      { text: "Throw them", emoji: "💥" },
    ],
    explanation: "Tidying up helps our family and keeps our home nice.",
  },
  {
    prompt: "Your little brother wants to play too. What can you do?",
    emoji: "🧩",
    options: [
      { text: "Share and play together", emoji: "🤗", correct: true },
      { text: "Say no", emoji: "🚫" },
      { text: "Run away", emoji: "🏃" },
      { text: "Shout", emoji: "📢" },
    ],
    explanation: "Sharing is caring. Playing together is more fun.",
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

export function PlayTab({ child, onCelebrate }: { child: Child; onCelebrate: (text: string) => void }) {
  const [mode, setMode] = useState<"menu" | "quiz" | "match">("menu");
  if (mode === "quiz") return <Quiz child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;
  if (mode === "match") return <MatchGame child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;

  const soon = [
    { emoji: "🤲", title: "Dua Matching" },
    { emoji: "🕌", title: "Build the Masjid" },
    { emoji: "ا", title: "Arabic Letters" },
    { emoji: "📚", title: "Story Sequence" },
    { emoji: "🖐️", title: "Five Pillars" },
  ];
  return (
    <div className="screen">
      <h1>Play & Learn</h1>
      <div className="grid2">
        <button className="tile" style={{ background: "var(--lavender-soft)" }} onClick={() => setMode("quiz")}>
          <span className="icon" aria-hidden="true">❓</span>Kindness Quiz
        </button>
        <button className="tile" style={{ background: "var(--sky-soft)" }} onClick={() => setMode("match")}>
          <span className="icon" aria-hidden="true">🃏</span>Picture Matching
        </button>
        {soon.map((s) => (
          <div key={s.title} className="tile" style={{ background: "#fff", opacity: 0.6, cursor: "default" }}>
            <span className="icon" aria-hidden="true">{s.emoji}</span>
            {s.title}
            <span className="small muted">Coming soon</span>
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
      <div className="screen center">
        <span style={{ fontSize: 80 }} aria-hidden="true">🎉</span>
        <h1>You learned {questions.length} new things!</h1>
        <p className="muted small">Sample quiz. Quiz stars will come with the real question bank.</p>
        <button className="btn btn-primary btn-child" onClick={() => { setI(0); setPicked(null); setFinished(false); }}>
          Play again
        </button>
        <button className="btn btn-ghost" onClick={onExit}>Back</button>
      </div>
    );
  }

  const answered = picked !== null;
  const right = answered && q.options[picked!].correct;

  return (
    <div className="screen">
      <div className="row between">
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onExit} aria-label="Close quiz">✕</button>
        <div className="dots" aria-label={`Question ${i + 1} of ${questions.length}`}>
          {questions.map((_, k) => <span key={k} className={k <= i ? "on" : ""} />)}
        </div>
        <button className="btn btn-secondary" style={{ minWidth: 56 }} onClick={() => speak(q.prompt)} aria-label="Read the question">🔊</button>
      </div>
      <div className="big-pic" style={{ background: "var(--lavender-soft)" }} aria-hidden="true">{q.emoji}</div>
      <h2>{q.prompt}</h2>
      <div className="stack">
        {q.options.map((o, k) => {
          let cls = "option";
          if (answered && o.correct) cls += " correct";
          else if (answered && k === picked) cls += " gentle";
          return (
            <button key={o.text} className={cls} disabled={answered} onClick={() => { setPicked(k); if (q.options[k].correct) speak("Yes! Well done!"); else speak("Good try! Let's learn together."); }}>
              <span style={{ fontSize: 30 }} aria-hidden="true">{o.emoji}</span>
              {o.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="card stack" role="status">
          <h3>{right ? "⭐ Yes! Well done!" : "Good try! Let's learn together."}</h3>
          <p>{q.explanation}</p>
          <button
            className="btn btn-primary btn-child"
            onClick={() => {
              if (i + 1 < questions.length) { setI(i + 1); setPicked(null); }
              else { setFinished(true); onCelebrate("Quiz complete!"); }
            }}
          >
            {i + 1 < questions.length ? "Next" : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}

const PICTURES = [
  { id: "masjid", emoji: "🕌", label: "Masjid" },
  { id: "moon", emoji: "🌙", label: "Crescent moon" },
  { id: "lantern", emoji: "🏮", label: "Lantern" },
  { id: "dates", emoji: "🌴", label: "Date palm" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "book", emoji: "📖", label: "Book" },
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
        speak(a.label);
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
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onExit}>← Back</button>
        <span className="muted">{matched.length} of {pairs} pairs</span>
      </div>
      <h2>Find the matching pictures</h2>
      <div className="grid3">
        {cards.map((c) => {
          const show = flipped.includes(c.key) || matched.includes(c.id);
          return (
            <button
              key={c.key}
              className="tile"
              style={{ background: show ? "#fff" : "var(--emerald)", fontSize: 40, minHeight: 90 }}
              aria-label={show ? c.label : "Hidden card"}
              onClick={() => flip(c)}
            >
              <span aria-hidden="true">{show ? c.emoji : "✦"}</span>
            </button>
          );
        })}
      </div>
      {done && (
        <button className="btn btn-primary btn-child" onClick={() => { setMatched([]); setFlipped([]); setRound(round + 1); }}>
          Play again
        </button>
      )}
    </div>
  );
}
