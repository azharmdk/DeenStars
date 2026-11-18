import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, Puzzle, Sparkles, X } from "lucide-react";
import { Child, isGuest } from "../types";
import { BackLink, Celebration } from "../components/common";
import { Art, ArtName, Banner, PageTitle, SectionHeader, Tone } from "../components/ui";
import { useProgressSummary } from "../data";
import { safeStorage } from "../storage";
import {
  betterTime,
  Difficulty,
  formatTime,
  MATCH_LEVELS,
  MatchLevel,
  matchUnlocked,
  QUIZ_LEVELS,
  unlockedQuizIndex,
  UNLOCK_STREAK_DAYS,
} from "../games/levels";

/**
 * Play & Learn. Quiz questions are SAMPLE manners scenarios, not reviewed content, and make no Quran
 * or Hadith claims. No stars are awarded here: quiz and game stars need the server-side functions
 * in docs/QUIZ_ENGINE.md. Levels and best times are kept on this device only (Enhancement 6a).
 */

interface Q {
  prompt: string;
  art: ArtName;
  /** First option is the correct one. The others are clearly not kind or helpful. */
  options: { text: string; correct?: boolean }[];
  explanation: string;
  /** Questions 5 to 8 were drafted with AI help for the Standard and Challenge levels. Reviewer to check. */
  draft?: "ai-assisted";
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
  {
    prompt: "Your friend looks sad. What can you do?",
    art: "smile",
    options: [{ text: "Say something kind", correct: true }, { text: "Laugh at them" }, { text: "Ignore them" }, { text: "Tease them" }],
    explanation: "Kind words help a sad friend feel better.",
    draft: "ai-assisted",
  },
  {
    prompt: "You bumped into someone by accident. What can you say?",
    art: "heart",
    options: [{ text: "Sorry!", correct: true }, { text: "Nothing" }, { text: "Move!" }, { text: "It was your fault" }],
    explanation: "Saying sorry shows we care about other people.",
    draft: "ai-assisted",
  },
  {
    prompt: "It is time to eat. What do you do first?",
    art: "soap",
    options: [{ text: "Wash my hands", correct: true }, { text: "Jump on the table" }, { text: "Throw the food" }, { text: "Run away" }],
    explanation: "Clean hands help keep us healthy.",
    draft: "ai-assisted",
  },
  {
    prompt: "Someone is talking to you. What should you do?",
    art: "eyes",
    options: [{ text: "Listen to them", correct: true }, { text: "Shout over them" }, { text: "Walk away" }, { text: "Cover my ears" }],
    explanation: "Listening shows we respect the person talking.",
    draft: "ai-assisted",
  },
];

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

// ---------- family-only progress, on this device ----------
const quizKey = (c: Child) => `ds_quiz_finished_${c.id}`;
const matchKey = (c: Child) => `ds_match_finished_${c.id}`;
const bestKey = (c: Child, level: number) => `ds_match_best_${c.id}_${level}`;
const unlockSeenKey = (c: Child) => `ds_unlock_seen_${c.id}`;
const readNum = (k: string): number | null => {
  const v = safeStorage.getItem(k);
  return v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
};

function LevelPicker<T extends string | number>(props: { label: string; value: T; options: { id: T; label: string; locked: boolean; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="label">{props.label}</span>
      <div className="segmented level-picker" role="group" aria-label={props.label}>
        {props.options.map((o) => (
          <button key={String(o.id)} aria-pressed={props.value === o.id} disabled={o.locked} title={o.locked ? o.hint : undefined} onClick={() => props.onChange(o.id)}>
            {o.locked && <Lock size={14} aria-hidden="true" />} {o.label}
            {o.locked && <span className="sr-only"> (locked{o.hint ? `: ${o.hint}` : ""})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Game results show on the result screen itself; no overlay covers the heading or buttons (Fix 1.3). */
export function PlayTab({ child }: { child: Child }) {
  const [mode, setMode] = useState<"menu" | "quiz" | "match">("menu");
  const [quizFinished, setQuizFinished] = useState(() => readNum(quizKey(child)));
  const [matchFinished, setMatchFinished] = useState(() => readNum(matchKey(child)) ?? 0);
  const summary = useProgressSummary(child.id);
  const longest = summary?.longestDayRun ?? 0;

  const maxQuiz = unlockedQuizIndex(child.difficulty as Difficulty, quizFinished);
  const [quizLevel, setQuizLevel] = useState(() => Math.min(maxQuiz, unlockedQuizIndex(child.difficulty as Difficulty, null)));
  const matchOptions = MATCH_LEVELS.map((l) => ({ ...l, locked: !matchUnlocked(l, matchFinished, longest) }));
  const [matchLevel, setMatchLevel] = useState<number>(1);

  // "New game unlocked" once, when the 7-day streak first unlocks Super Matching (Enhancement 6a.3).
  const [unlockCheer, setUnlockCheer] = useState(false);
  const endCheer = useCallback(() => setUnlockCheer(false), []);
  useEffect(() => {
    if (isGuest(child) || longest < UNLOCK_STREAK_DAYS || safeStorage.getItem(unlockSeenKey(child))) return;
    safeStorage.setItem(unlockSeenKey(child), "1");
    setUnlockCheer(true);
  }, [child, longest]);

  if (mode === "quiz") {
    return (
      <Quiz
        key={quizLevel}
        level={quizLevel}
        onExit={() => setMode("menu")}
        onFinished={(lvl) => {
          const best = Math.max(quizFinished ?? -1, lvl);
          safeStorage.setItem(quizKey(child), String(best));
          setQuizFinished(best);
        }}
        maxUnlocked={maxQuiz}
        onNextLevel={() => setQuizLevel((l) => Math.min(QUIZ_LEVELS.length - 1, l + 1))}
      />
    );
  }
  if (mode === "match") {
    const lvl = MATCH_LEVELS.find((l) => l.level === matchLevel)!;
    return (
      <MatchGame
        key={lvl.level}
        child={child}
        level={lvl}
        onExit={() => setMode("menu")}
        onFinished={() => {
          const best = Math.max(matchFinished, lvl.level);
          safeStorage.setItem(matchKey(child), String(best));
          setMatchFinished(best);
        }}
      />
    );
  }

  const q = QUIZ_LEVELS[quizLevel];
  return (
    <div className="screen">
      <PageTitle title="Play & Learn" />
      <Banner tone="blue" art="question" wide badge="Quiz" title="Kindness Quiz" sub={`${q.label} · ${q.questions} questions`} onClick={() => setMode("quiz")} />
      <LevelPicker
        label="Quiz level"
        value={quizLevel}
        onChange={setQuizLevel}
        options={QUIZ_LEVELS.map((l, i) => ({ id: i, label: l.label, locked: i > maxQuiz, hint: "Finish the level before to unlock" }))}
      />
      <Banner tone="pink" art="cards" wide badge="Game" title="Picture Matching" sub={`${MATCH_LEVELS[matchLevel - 1].label} · ${MATCH_LEVELS[matchLevel - 1].pairs} pairs`} onClick={() => setMode("match")} />
      <LevelPicker
        label="Matching level"
        value={matchLevel}
        onChange={setMatchLevel}
        options={matchOptions.map((l) => ({
          id: l.level,
          label: l.label,
          locked: l.locked,
          hint: l.unlock === "streak" ? `Unlocks after ${UNLOCK_STREAK_DAYS} days in a row` : "Finish the level before to unlock",
        }))}
      />
      {matchOptions[2].locked && <p className="small faint">Super Matching unlocks after {UNLOCK_STREAK_DAYS} days in a row of good deeds.</p>}
      <SectionHeader title="Coming soon" />
      <div className="grid2">
        {SOON.map((g) => (
          <Banner key={g.title} tone={g.tone} art={g.art} title={g.title} sub="Coming soon" locked />
        ))}
      </div>
      {unlockCheer && <Celebration text="New game unlocked: Super Matching!" onDone={endCheer} />}
    </div>
  );
}

function Quiz({ level, onExit, onFinished, maxUnlocked, onNextLevel }: { level: number; onExit: () => void; onFinished: (level: number) => void; maxUnlocked: number; onNextLevel: () => void }) {
  const lvl = QUIZ_LEVELS[level];
  const last = QUIZ_LEVELS.length - 1;
  // Decided when this quiz starts: finishing it unlocks a level that was locked before.
  const [unlocksNew] = useState(() => level === maxUnlocked && level < last);
  const unlocksNext = unlocksNew;
  // "Try the next level" is offered whenever the next level is open (newly or from before).
  const canTryNext = level < last && (unlocksNew || level + 1 <= maxUnlocked);
  const [round, setRound] = useState(0);
  const questions = useMemo(
    () =>
      SAMPLE_QUIZ.slice(0, lvl.questions).map((q) => {
        const correct = q.options.filter((o) => o.correct);
        const wrong = q.options.filter((o) => !o.correct).slice(0, lvl.options - 1);
        return { ...q, options: shuffle([...correct, ...wrong]) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lvl, round],
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  // Score = questions answered correctly (Fix 1). Each question can only be answered once.
  const [correct, setCorrect] = useState(0);
  const q = questions[i];

  if (finished) {
    return (
      <div className="screen reading center" style={{ gap: 16 }}>
        <Art name="trophy" size={140} className="float" />
        <span className="banner-badge quiz-done" role="status">
          Quiz complete · {lvl.label} level
        </span>
        <h1>
          You got {correct} out of {questions.length} right!
        </h1>
        <p className="quiz-learned">
          {correct > 0 ? `You learned ${correct} new ${correct === 1 ? "thing" : "things"}!` : "Good try! Let's play again and learn together."}
        </p>
        {unlocksNext && <p className="unlock-note">New level unlocked: {QUIZ_LEVELS[level + 1].label}!</p>}
        <p className="muted small">Sample quiz. Quiz stars will come with the reviewed question bank.</p>
        {canTryNext && (
          <button className="btn btn-primary btn-child" onClick={onNextLevel}>
            Try {QUIZ_LEVELS[level + 1].label}
          </button>
        )}
        <button
          className={`btn btn-child ${canTryNext ? "btn-secondary" : "btn-primary"}`}
          onClick={() => {
            setI(0);
            setPicked(null);
            setCorrect(0);
            setFinished(false);
            setRound((r) => r + 1);
          }}
        >
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
    <div className="screen reading">
      <div className="row between">
        <button className="icon-btn" onClick={onExit} aria-label="Close quiz"><X size={20} aria-hidden="true" /></button>
        <div className="dots" aria-label={`Question ${i + 1} of ${questions.length}`}>
          {questions.map((_, k) => <span key={k} className={k <= i ? "on" : ""} />)}
        </div>
        <span className="band-pill">{lvl.label}</span>
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
                if (o.correct) setCorrect((c) => c + 1);
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
              if (i + 1 < questions.length) {
                setI(i + 1);
                setPicked(null);
              } else {
                setFinished(true);
                onFinished(level);
              }
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
  { id: "rainbow", label: "Rainbow", art: "rainbow" },
  { id: "flower", label: "Flower", art: "flower" },
];

function MatchGame({ child, level, onExit, onFinished }: { child: Child; level: MatchLevel; onExit: () => void; onFinished: () => void }) {
  const pairs = level.pairs;
  const [round, setRound] = useState(0);
  const cards = useMemo(
    () => shuffle(PICTURES.slice(0, pairs).flatMap((p) => [{ ...p, key: `${p.id}-a` }, { ...p, key: `${p.id}-b` }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs, round],
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const started = useRef<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(() => readNum(bestKey(child, level.level)));
  const done = matched.length === pairs;

  function flip(card: (typeof cards)[number]) {
    if (flipped.length === 2 || flipped.includes(card.key) || matched.includes(card.id)) return;
    started.current ??= Date.now();
    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length === 2) {
      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      if (a.id === b.id) {
        setTimeout(() => {
          const m = [...matched, a.id];
          setMatched(m);
          setFlipped([]);
          if (m.length === pairs) {
            const t = Date.now() - (started.current ?? Date.now());
            const b2 = betterTime(best, t);
            safeStorage.setItem(bestKey(child, level.level), String(b2));
            setTime(t);
            setBest(b2);
            onFinished();
          }
        }, 350);
      } else {
        // No penalty: cards just turn back over.
        setTimeout(() => setFlipped([]), 900);
      }
    }
  }

  return (
    <div className="screen reading">
      <div className="row between">
        <BackLink onClick={onExit} />
        <span className="muted small strong">{matched.length} of {pairs} pairs</span>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Picture Matching</h1>
        <p className="muted">{level.label}. Find the two cards that match.</p>
      </div>
      <div className={`memory-grid pairs-${pairs}`}>
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
              {show ? <Art name={c.art} size={56} /> : <Sparkles size={26} color="rgba(255,255,255,0.7)" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {done && (
        <p className="quiz-learned" role="status" style={{ textAlign: "center" }}>
          You matched them all!
          {time !== null && <span className="match-time"> Time {formatTime(time)}{best !== null && ` · Best ${formatTime(best)}`}</span>}
        </p>
      )}
      {done && (
        <button
          className="btn btn-primary btn-child"
          onClick={() => {
            setMatched([]);
            setFlipped([]);
            setTime(null);
            started.current = null;
            setRound(round + 1);
          }}
        >
          <Puzzle size={20} aria-hidden="true" /> Play again
        </button>
      )}
    </div>
  );
}
