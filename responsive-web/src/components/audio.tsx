import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Plays human recordings only (qari recitation and Hisn al-Muslim audio) from DeenStars hosting.
 * There is no text-to-speech anywhere in the app (product decision 2026-11).
 * One sound plays at a time across the whole app.
 */
let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

export function stopAllAudio() {
  current?.stop();
  current = null;
}

export function useAudioQueue() {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopAllAudio();
    };
  }, []);

  function play(key: string, srcs: string[]) {
    stopAllAudio();
    if (srcs.length === 0) return;
    let i = 0;
    const audio = new Audio(srcs[0]);
    const stop = () => {
      audio.pause();
      audio.src = "";
      if (mounted.current) setPlayingKey(null);
    };
    current = { audio, stop };
    audio.onended = () => {
      i++;
      if (i < srcs.length) {
        audio.src = srcs[i];
        if (mounted.current) setIndex(i);
        audio.play().catch(stop);
      } else stop();
    };
    audio.onerror = stop;
    setPlayingKey(key);
    setIndex(0);
    audio.play().catch(stop);
  }

  return {
    playingKey,
    index,
    play,
    stop: () => {
      stopAllAudio();
      setPlayingKey(null);
    },
  };
}

export function AudioButton({
  srcs,
  label,
  reciter,
  queue,
  id,
  variant = "secondary",
}: {
  srcs: string[];
  label: string;
  reciter?: string;
  queue: ReturnType<typeof useAudioQueue>;
  id: string;
  variant?: "secondary" | "primary" | "night";
}) {
  const playing = queue.playingKey === id;
  if (srcs.length === 0) return null;
  const cls = variant === "primary" ? "btn btn-primary" : variant === "night" ? "btn btn-night" : "btn btn-secondary";
  return (
    <div className="stack" style={{ gap: 4 }}>
      <button className={`${cls} btn-block`} onClick={() => (playing ? queue.stop() : queue.play(id, srcs))} aria-pressed={playing}>
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        {playing ? "Stop" : label}
      </button>
      {reciter && <span className="tiny faint" style={{ textAlign: "center" }}>Recited by {reciter}</span>}
    </div>
  );
}
