import { useMemo, useState } from "react";
import { Puzzle, Sparkles, X } from "lucide-react";
import { Child } from "../types";
import { BackLink } from "../components/common";
import { Art, ArtName, Banner, PageTitle, SectionHeader, Tone } from "../components/ui";

/**
 * Play & Learn UI prototype. Quiz questions are SAMPLE manners scenarios, not reviewed content,
 * and make no Quran or Hadith claims. No stars are awarded here yet: quiz and game stars need the
 * server-side submitQuizAttempt / submitGameResult functions (docs/QUIZ_ENGINE.md).
 */

interface Q {
  prompt: string;
  art: ArtName;
  options: { text: string; correct?: boolean }[];
  explanation: string;
}

const SAMPLE_QUIZ: Q[] = [
  {
    prompt: "Your friend dropped their crayons. What is a kind thing to do?",
    art: "heart",
    options: [{ text: "Help pick them up", correct: true }, { text: "Walk away" }, { text: "Laugh at them" }, { text: "Take one" }],
    explanation: "Helping others is kind, and it makes everyone happy.",
  },
  {
    prompt: "Someone gives you a present. What can you say?",
    art: "gift",
    options: [{ text: "Thank you!", correct: true }, { text: "Nothing" }, { text: "I want more" }, { text: "Go away" }],
    explanation: "Saying thank you shows we are grateful.",
  },
  {
    prompt: "You finished playing with your toys. What should you do?",
    art: "teddy",
    options: [{ text: "Put them away", correct: true }, { text: "Leave them everywhere" }, { text: "Hide them" }, { text: "Throw them" }],
    explanation: "Tidying up helps our family and keeps our home nice.",
  },
  {
    prompt: "Your little brother wants to play too. What can you do?",
    art: "sparkling-heart",
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

const SOON: { title: string; art: ArtName; tone: Tone }[] = [
  { title: "Dua Matching", art: "palms-up", tone: "gold" },
  { title: "Build the Masjid", art: "mosque", tone: "blue" },
  { title: "Arabic Letters", art: "bulb", tone: "green" },
  { title: "Story Sequence", art: "books", tone: "pink" },
  { title: "Five Pillars", art: "sparkles", tone: "teal" },
];

export function PlayTab({ child, onCelebrate }: { child: Child; onCelebrate: (text: string) => void }) {
  const [mode, setMode] = useState<"menu" | "quiz" | "match">("menu");
  if (mode === "quiz") return <Quiz child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;
  if (mode === "match") return <MatchGame child={child} onExit={() => setMode("menu")} onCelebrate={onCelebrate} />;

  return (
    <div className="screen">
      <PageTitle title="Play & Learn" />
      <Banner tone="blue" art="question" wide badge="Quiz" title="Kindness Quiz" sub="4 questions" onClick={() => setMode("quiz")} />
      <Banner tone="pink" art="cards" wide badge="Game" title="Picture Matching" sub="Find the pairs" onClick={() => setMode("match")} />
      <SectionHeader title="Coming soon" />
      <div className="grid2">
        {SOON.map((g) => (
          <Banner key={g.title} tone={g.tone} art={g.art} title={g.title} sub="Coming soon" locked />
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
        <Art name="trophy" size={140} className="float" />
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
        <Art name={q.art} size={112} />
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

const PICTURES: { id: string; label: string; art: ArtName }[] = [
  { id: "masjid", label: "Masjid", art: "mosque" },
  { id: "moon", label: "Crescent moon", art: "moon" },
  { id: "camel", label: "Camel", art: "camel" },
  { id: "palm", label: "Date palm", art: "palm" },
  { id: "star", label: "Star", art: "glowing-star" },
  { id: "book", label: "Book", art: "book" },
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
              {show ? <Art name={c.art} size={64} /> : <Sparkles size={28} color="rgba(255,255,255,0.7)" aria-hidden="true" />}
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
