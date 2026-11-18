import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { BackLink } from "../components/common";
import { Art } from "../components/ui";
import { HINT_AFTER, makeRound, MOSQUE_LEVELS, starsForLevel } from "../games/mosque";

/**
 * Find the Mosque. Tap the masjid among the pictures. Stars here are collected in this game only
 * (one per round). They are not added to the account star ledger yet: that needs the server
 * function described in docs/WEBSITE_IMPROVEMENTS.md.
 * Wrong taps are never punished: the picture fades, and after two the masjid gently glows.
 */
export function FindTheMosque(props: { level: number; onExit: () => void; onFinished: (level: number) => void; onNextLevel?: () => void; unlocksNext: boolean }) {
  const lvl = MOSQUE_LEVELS[props.level];
  // Decided when this level starts: finishing it must not change what the result screen says.
  const [unlocksNew] = useState(props.unlocksNext);
  const [round, setRound] = useState(0);
  const [play, setPlay] = useState(0); // bumps on "Play again" to build new rounds
  const [wrong, setWrong] = useState<string[]>([]);
  const [found, setFound] = useState(false);
  const [done, setDone] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spots = useMemo(() => makeRound(lvl), [lvl, round, play]);
  const hint = wrong.length >= HINT_AFTER;
  const last = props.level === MOSQUE_LEVELS.length - 1;

  if (done) {
    const stars = starsForLevel(lvl);
    return (
      <div className="screen reading center" style={{ gap: 16 }}>
        <Art name="trophy" size={140} className="float" />
        <span className="banner-badge quiz-done" role="status">{lvl.label} complete</span>
        <h1>You found the masjid {lvl.rounds} times!</h1>
        <p className="stars-row" aria-label={`${stars} stars`}>
          {Array.from({ length: stars }, (_, i) => <Star key={i} size={30} fill="currentColor" aria-hidden="true" />)}
        </p>
        {unlocksNew && <p className="unlock-note">New level unlocked: {MOSQUE_LEVELS[props.level + 1].label}!</p>}
        {!last && props.onNextLevel && (
          <button className="btn btn-primary btn-child" onClick={props.onNextLevel}>
            Try {MOSQUE_LEVELS[props.level + 1].label}
          </button>
        )}
        <button
          className={`btn btn-child ${last ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            setRound(0);
            setWrong([]);
            setFound(false);
            setDone(false);
            setPlay((p) => p + 1);
          }}
        >
          Play again
        </button>
        <button className="btn btn-ghost" onClick={props.onExit}>Back to Play & Learn</button>
      </div>
    );
  }

  function tap(target: boolean, key: string) {
    if (found) return;
    if (target) setFound(true);
    else setWrong((w) => (w.includes(key) ? w : [...w, key]));
  }
  function next() {
    if (round + 1 < lvl.rounds) {
      setRound(round + 1);
      setWrong([]);
      setFound(false);
    } else {
      setDone(true);
      props.onFinished(props.level);
    }
  }

  return (
    <div className="screen reading">
      <div className="row between">
        <BackLink onClick={props.onExit} label="Back" />
        <span className="band-pill">{lvl.label}</span>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Find the Mosque</h1>
        <p className="muted">Tap the masjid.</p>
      </div>
      <div className="stars-row" role="img" aria-label={`${round + (found ? 1 : 0)} of ${lvl.rounds} stars`}>
        {Array.from({ length: lvl.rounds }, (_, i) => (
          <Star key={i} size={24} fill={i < round + (found ? 1 : 0) ? "currentColor" : "none"} aria-hidden="true" />
        ))}
      </div>
      <div className="mosque-map" style={{ gridTemplateColumns: `repeat(${lvl.columns}, minmax(0, 1fr))` }}>
        {spots.map((s) => {
          let cls = "mosque-spot";
          if (found && s.target) cls += " found";
          else if (wrong.includes(s.key)) cls += " faded";
          else if (hint && s.target) cls += " hint";
          return (
            <button key={s.key} className={cls} aria-label={s.label} disabled={wrong.includes(s.key) || (found && !s.target)} onClick={() => tap(s.target, s.key)}>
              <Art name={s.art} size={lvl.spots > 6 ? 52 : 72} />
            </button>
          );
        })}
      </div>
      <div className="card stack" role="status" aria-live="polite" style={{ minHeight: 64 }}>
        {found ? (
          <>
            <h3>You found it! Well done.</h3>
            <button className="btn btn-primary btn-child" onClick={next}>{round + 1 < lvl.rounds ? "Next" : "Finish"}</button>
          </>
        ) : wrong.length > 0 ? (
          <p className="muted">{hint ? "Look for the glow. You can do it!" : "Not this one. Try another!"}</p>
        ) : (
          <p className="muted">Which one is the masjid?</p>
        )}
      </div>
    </div>
  );
}
