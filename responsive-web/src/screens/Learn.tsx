import { useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, MoonStar, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { useConfig, useLearningProgress, useLibrary } from "../data";
import { ArabicText, cleanMeaning, cleanTransliteration, translationCredit } from "../components/ArabicText";
import { AudioButton, useAudioQueue } from "../components/audio";
import { BackLink, Busy, Notice } from "../components/common";
import { DUA_CATEGORY_ART } from "../components/icons";
import { Art, Banner, SectionHeader } from "../components/ui";
import { BedtimeScene, Scene } from "../components/scenes";
import { duaSlug, quranOrder, storyPageCount, surahSlug } from "../content";
import { AGE_BAND_LABEL, ageBandFor, Child, Dua, isGuest, LEARN_LABEL, LearnState, Story, Surah } from "../types";

const DUA_GROUPS: { id: Dua["category"]; label: string }[] = [
  { id: "sleep", label: "Sleeping" },
  { id: "wake", label: "Waking up" },
  { id: "eating", label: "Eating" },
  { id: "bathroom", label: "Bathroom" },
  { id: "home", label: "Home and dressing" },
  { id: "rabbana", label: "Duas from the Quran" },
];

function ReviewBanner() {
  return <div className="review-banner" role="note">Sourced text, pending scholar review</div>;
}

/** Child-side progress: Learning and Practising. "Learned" is confirmed by a grown-up in the parent area. */
function ProgressPicker(props: { childId: string; kind: "dua" | "surah"; itemId: string; state: LearnState }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  if (props.state === "learned") {
    return (
      <div className="notice calm" role="status">
        <Check size={18} aria-hidden="true" style={{ marginTop: 1 }} />
        <span>Learned! A grown-up confirmed it. Well done.</span>
      </div>
    );
  }
  async function set(state: LearnState) {
    setBusy(true);
    setProblem(false);
    try {
      await api.updateLearningProgress({ childId: props.childId, kind: props.kind, itemId: props.itemId, state });
    } catch {
      setProblem(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="field">
      <span className="label">How am I doing?</span>
      <div className="segmented" role="group" aria-label="Learning progress">
        {(["notStarted", "learning", "practising"] as LearnState[]).map((s) => (
          <button key={s} aria-pressed={props.state === s} disabled={busy} onClick={() => set(s)}>
            {LEARN_LABEL[s]}
          </button>
        ))}
      </div>
      {busy ? <Busy /> : <span className="tiny faint">When you know it by heart, a grown-up can confirm it in the parent area.</span>}
      {problem && <Notice>Let's try again in a moment.</Notice>}
    </div>
  );
}

function sourceLine(d: Dua): string {
  if (d.source.type === "quran") return `Quran, Surah ${d.source.surahName} ${d.source.surahNumber}:${d.source.ayahStart}. Translation: ${translationCredit(d.source.translationSource)}.`;
  return `${d.source.work ?? "Hisn al-Muslim"}, item ${d.source.itemId}. Hadith reference to be added by the reviewer.`;
}

// ---------------- Dua Corner ----------------

/**
 * Dua Corner. On the website the open dua follows the URL (/duas/before-sleeping): pass `selected`
 * and `onSelect`. Inside the signed-in app it keeps its own state, as before.
 */
export function DuaCorner({ child, onBack, selected, onSelect }: { child: Child; onBack: () => void; selected?: string | null; onSelect?: (slug: string | null) => void }) {
  const { items, error } = useLibrary<Dua>("duaLibrary");
  const progress = useLearningProgress(child.id, "dua");
  const [local, setLocal] = useState<Dua | null>(null);
  const open = onSelect ? items?.find((d) => duaSlug(d.id) === selected) ?? null : local;
  const setOpen = (d: Dua | null) => (onSelect ? onSelect(d ? duaSlug(d.id) : null) : setLocal(d));
  const queue = useAudioQueue();

  if (open) {
    const state = progress[open.id] ?? "notStarted";
    return (
      <div className="screen reading">
        <BackLink onClick={() => { queue.stop(); setOpen(null); }} label="Dua Corner" />
        <ReviewBanner />
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow" style={{ color: "var(--c-dua)" }}>{DUA_GROUPS.find((g) => g.id === open.category)?.label}</span>
          <h1>{open.title}</h1>
          <span className="muted small">{open.whenToRecite}</span>
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <ArabicText text={open.arabic} quran={open.source.type === "quran"} highlightFromWord={open.highlightFromWord} size={28} />
          {open.transliteration && <p className="small muted transliteration">{cleanTransliteration(open.transliteration)}</p>}
          <p style={{ textAlign: "center" }}>{cleanMeaning(open.translation)}</p>
          {open.repeat > 1 && <span className="tiny faint" style={{ textAlign: "center" }}>Say it {open.repeat} times</span>}
        </div>
        {open.audio && (
          <AudioButton id={open.id} queue={queue} srcs={[open.audio.path]} label="Listen to the dua" reciter={open.audio.reciter} variant="primary" />
        )}
        {!isGuest(child) && <ProgressPicker childId={child.id} kind="dua" itemId={open.id} state={state} />}
        <div className="row tiny faint" style={{ gap: 6, alignItems: "flex-start" }}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Source: {sourceLine(open)}</span>
        </div>
      </div>
    );
  }

  const learned = items ? items.filter((d) => progress[d.id] === "learned").length : 0;
  return (
    <div className="screen">
      <BackLink onClick={onBack} />
      <Banner tone="gold" art="palms-up" wide title="Dua Corner" sub={isGuest(child) ? "Learn a dua" : `${learned} of ${items?.length ?? 0} learned`}>
        {!isGuest(child) && <span className="progress" style={{ background: "rgba(255,255,255,0.28)", marginTop: 8 }}>
          <span style={{ display: "block", height: "100%", borderRadius: 999, background: "#fff", width: `${items?.length ? (learned / items.length) * 100 : 0}%` }} />
        </span>}
      </Banner>
      {error && <Notice>We couldn't load the duas. Let's try again in a moment.</Notice>}
      {!items && !error && <p className="muted">Loading…</p>}
      {items &&
        DUA_GROUPS.map((g) => {
          const list = items.filter((d) => d.category === g.id);
          if (list.length === 0) return null;
          const art = DUA_CATEGORY_ART[g.id] ?? "palms-up";
          return (
            <div key={g.id} className="stack" style={{ gap: 8 }}>
              <SectionHeader title={g.label} />
              <div className="list">
                {list.map((d) => {
                  const s = progress[d.id] ?? "notStarted";
                  return (
                    <button key={d.id} className="list-item" onClick={() => setOpen(d)}>
                      <span className="art-chip" style={{ background: "var(--c-dua-bg)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true">
                        <Art name={art} size={36} />
                      </span>
                      <span className="stack" style={{ gap: 2, flex: 1 }}>
                        <span className="strong">{d.title}</span>
                        {!isGuest(child) && <span className="small faint">{LEARN_LABEL[s]}</span>}
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
            </div>
          );
        })}
    </div>
  );
}

// ---------------- Surah learning ----------------

/** Surah learning. On the website the open surah follows the URL (/surahs/al-ikhlaas). */
export function SurahLearning({ child, onBack, selected, onSelect }: { child: Child; onBack: () => void; selected?: string | null; onSelect?: (slug: string | null) => void }) {
  const { items, error } = useLibrary<Surah>("surahLibrary");
  const progress = useLearningProgress(child.id, "surah");
  const [local, setLocal] = useState<Surah | null>(null);
  const open = onSelect ? items?.find((s) => surahSlug(s) === selected) ?? null : local;
  const setOpen = (s: Surah | null) => (onSelect ? onSelect(s ? surahSlug(s) : null) : setLocal(s));
  const queue = useAudioQueue();

  if (open) {
    const state = progress[open.id] ?? "notStarted";
    const ayahSrcs = open.ayahs.map((a) => a.audio?.path).filter(Boolean) as string[];
    return (
      <div className="screen reading">
        <BackLink onClick={() => { queue.stop(); setOpen(null); }} label="Surahs" />
        <ReviewBanner />
        <div className="stack center" style={{ gap: 4 }}>
          <ArabicText text={open.nameArabic} quran size={34} />
          <h1>Surah {open.nameTransliterated}</h1>
          <span className="muted small">{open.meaning} · {open.ayahs.length} ayahs</span>
        </div>
        {open.childrenRecitation && (
          <AudioButton id={`${open.id}-children`} queue={queue} srcs={[open.childrenRecitation.path]} label="Listen and repeat with children" reciter={open.childrenRecitation.reciter} variant="primary" />
        )}
        <AudioButton id={`${open.id}-all`} queue={queue} srcs={ayahSrcs} label="Listen to the whole Surah" reciter={open.ayahs[0]?.audio?.reciter} />
        {open.bismillah && (
          <div className="card stack bismillah" style={{ gap: 6 }}>
            <ArabicText text={open.bismillah.arabic} quran size={26} />
            <p className="small muted transliteration">{open.bismillah.transliteration}</p>
            <p className="small" style={{ textAlign: "center" }}>{open.bismillah.translation}</p>
          </div>
        )}
        <div className="list">
          {open.ayahs.map((a, i) => {
            const playingThis = queue.playingKey === `${open.id}-all` && queue.index === i;
            return (
              <div key={a.ref} className="list-item" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8, background: playingThis ? "var(--accent-soft)" : undefined }}>
                <div className="row between">
                  <span className="band-pill">Ayah {a.ayahNumber}</span>
                  {a.audio && (
                    <button className="btn btn-soft btn-sm" onClick={() => queue.play(`${open.id}-${a.ref}`, [a.audio!.path])}>
                      {queue.playingKey === `${open.id}-${a.ref}` ? "Playing…" : "Play"}
                    </button>
                  )}
                </div>
                <ArabicText text={a.arabic} quran size={26} />
                <p className="small muted transliteration">{a.transliteration}</p>
                <p className="small" style={{ textAlign: "center" }}>{a.translation}</p>
              </div>
            );
          })}
        </div>
        {!isGuest(child) && <ProgressPicker childId={child.id} kind="surah" itemId={open.id} state={state} />}
        <div className="row tiny faint" style={{ gap: 6, alignItems: "flex-start" }}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Arabic: Tanzil Project (Uthmani). Translation: {translationCredit(open.source?.translationSource) || "see sources"}. Transliteration: AlQuran Cloud.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackLink onClick={onBack} />
      <Banner tone="teal" art="book" wide title="Short Surahs" sub="Listen and repeat" />
      {error && <Notice>We couldn't load the Surahs. Let's try again in a moment.</Notice>}
      {!items && !error && <p className="muted">Loading…</p>}
      <div className="list">
        {items?.map((s) => {
          const st = progress[s.id] ?? "notStarted";
          return (
            <button key={s.id} className="list-item" onClick={() => setOpen(s)}>
              <span className="art-chip" style={{ background: "var(--c-deed-bg)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true">
                <Art name="book" size={36} />
              </span>
              <span className="stack" style={{ gap: 2, flex: 1 }}>
                <span className="strong">Surah {s.nameTransliterated}</span>
                <span className="small faint">{s.meaning}{isGuest(child) ? "" : ` · ${LEARN_LABEL[st]}`}</span>
              </span>
              {st === "learned" ? (
                <span className="check-circle done" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
              ) : (
                <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Stories ----------------

export function StoryLibrary({ child, onBack, onOpen }: { child: Child; onBack: () => void; onOpen: (s: Story) => void }) {
  const { items, error } = useLibrary<Story>("stories");
  const band = ageBandFor(child);
  // Young explorers can also enjoy the little learners' stories. Little learners see only theirs.
  const mine = items?.filter((s) => s.ageBand === band) ?? [];
  const more = band === "young" ? items?.filter((s) => s.ageBand === "little") ?? [] : [];

  const card = (s: Story) => (
    <button key={s.id} className="tile" style={{ padding: 0, overflow: "hidden", gap: 0, minHeight: 0 }} onClick={() => onOpen(s)}>
      <Scene id={s.coverScene} />
      <span className="stack" style={{ gap: 2, padding: "10px 12px 12px" }}>
        <span>{s.title}</span>
        <span className="sub">{storyPageCount(s)} pages</span>
      </span>
    </button>
  );

  return (
    <div className="screen">
      <BackLink onClick={onBack} />
      <Banner tone="purple" art="books" wide title="Stories" sub={`For ${AGE_BAND_LABEL[band]}`} />
      <span className="muted small">A grown-up reads the story aloud, and the verse is recited by a qari.</span>
      {error && <Notice>We couldn't load the stories. Let's try again in a moment.</Notice>}
      {!items && !error && <p className="muted">Loading…</p>}
      <div className="grid2">{mine.map(card)}</div>
      {more.length > 0 && (
        <>
          <SectionHeader title="More stories" />
          <div className="grid2">{more.map(card)}</div>
        </>
      )}
    </div>
  );
}

export function StoryReader({ story, onBack, night = false }: { story: Story; onBack: () => void; night?: boolean }) {
  const pages = storyPageCount(story);
  const [page, setPage] = useState(0);
  const [showRefs, setShowRefs] = useState(false);
  const queue = useAudioQueue();
  const scene = story.scenes[page];
  const isVerse = page === story.scenes.length;

  return (
    <div className="screen reading" style={{ gap: 14 }}>
      <div className="row between">
        <BackLink onClick={() => { queue.stop(); onBack(); }} label="Stories" />
        <span className="small faint strong">{page + 1} / {pages}</span>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h2>{story.title}</h2>
        <span className="tiny faint">{story.prophet}</span>
      </div>
      <ReviewBanner />

      {!isVerse ? (
        <div className="stack" style={{ gap: 0 }}>
          <div className="story-panel">
            <Scene id={scene.scene} />
          </div>
          <div className="caption" style={night ? { background: "#1b2547", color: "#eef1fb", borderColor: "#f2c14e" } : undefined}>
            {scene.text}
            <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {scene.refs.map((r) => (
                <button key={r} className="ref-chip" onClick={() => setShowRefs(true)} aria-label={`Show Quran ${r}`}>
                  <BookOpen size={12} aria-hidden="true" /> Quran {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="card stack" style={{ gap: 10 }}>
            <span className="eyebrow">{story.verse.intro}</span>
            <ArabicText text={story.verse.arabic} quran highlightFromWord={story.verse.highlightFromWord} size={26} />
            <p className="small muted transliteration">{story.verse.transliteration}</p>
            <p className="small" style={{ textAlign: "center" }}>{story.verse.translation}</p>
            <span className="tiny faint" style={{ textAlign: "center" }}>
              Quran, Surah {story.verse.surahName} {story.verse.ref}. Translation: {translationCredit(story.verse.translationSource) || "see sources"}.
            </span>
          </div>
          {story.verse.audio && (
            <AudioButton id={`${story.id}-verse`} queue={queue} srcs={[story.verse.audio.path]} label="Listen to the verse" reciter={story.verse.audio.reciter} variant={night ? "night" : "primary"} />
          )}
          <div className="notice calm">
            <span><strong>What we learn: </strong>{story.lesson}</span>
          </div>
        </div>
      )}

      <div className="row">
        <button className="btn btn-secondary" style={{ flex: 1 }} disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={18} aria-hidden="true" /> Back
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={page === pages - 1} onClick={() => { queue.stop(); setPage(page + 1); }}>
          Next <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <button className="btn btn-ghost" onClick={() => setShowRefs(!showRefs)}>
        {showRefs ? "Hide the verses" : "Read the verses (for grown-ups)"}
      </button>
      {showRefs && (
        <div className="list">
          {Object.entries(story.refVerses)
            .sort(([a], [b]) => quranOrder(a, b))
            .map(([ref, v]) => (
            <div key={ref} className="list-item" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <span className="band-pill" style={{ alignSelf: "flex-start" }}>Surah {v.surahName} {ref}</span>
              <ArabicText text={v.arabic} quran size={22} />
              <p className="small">{v.translation}</p>
            </div>
          ))}
          <div className="list-item tiny faint" style={{ cursor: "default" }}>
            Sources: {story.sources.join("; ")}. Story wording written by DeenStars from these references.
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Bedtime ----------------

interface BedtimeConfig {
  duaIds: string[];
  surahIds: string[];
  ayatAlKursi: { ref: string; arabic: string; translation: string; transliteration: string; audio?: { path: string; reciter: string } | null };
}

/** Calm, dim, audio-led wind-down: tonight's story, then bedtime duas, then goodnight. No stars. */
export function Bedtime({ child, dayKey, onExit }: { child: Child; dayKey: string; onExit: () => void }) {
  const [step, setStep] = useState<"start" | "story" | "duas" | "night">("start");
  const config = useConfig<BedtimeConfig>("bedtime");
  const stories = useLibrary<Story>("stories").items;
  const duas = useLibrary<Dua>("duaLibrary").items;
  const surahs = useLibrary<Surah>("surahLibrary").items;
  const queue = useAudioQueue();

  const band = ageBandFor(child);
  const pool = stories?.filter((s) => s.ageBand === band) ?? [];
  const n = dayKey.split("-").reduce((a, b) => a + Number(b), 0);
  const tonight = pool.length ? pool[n % pool.length] : undefined;

  if (step === "story" && tonight) {
    return (
      <div className="night" style={{ minHeight: "100%" }}>
        <StoryReader story={tonight} night onBack={() => setStep("duas")} />
        <div style={{ padding: "0 16px 32px" }}>
          <button className="btn btn-night btn-block" onClick={() => setStep("duas")}>
            <MoonStar size={18} aria-hidden="true" /> Bedtime duas
          </button>
        </div>
      </div>
    );
  }

  const sleepDuas = duas?.filter((d) => config?.duaIds.includes(d.id)) ?? [];
  const quls = surahs?.filter((s) => config?.surahIds.includes(s.id)) ?? [];

  return (
    <div className="night" style={{ minHeight: "100%" }}>
      <div className="screen reading" style={{ paddingBottom: 40 }}>
        <BackLink onClick={() => { queue.stop(); onExit(); }} label="Leave bedtime" />
        {step === "start" && (
          <>
            <div className="story-panel">
              <BedtimeScene />
            </div>
            <h1 style={{ textAlign: "center" }}>Bedtime, {child.nickname}</h1>
            <p className="muted" style={{ textAlign: "center" }}>A short story, then our bedtime duas.</p>
            {tonight && (
              <button className="btn btn-night btn-child" onClick={() => setStep("story")}>
                Tonight's story: {tonight.title}
              </button>
            )}
            <button className="btn btn-night btn-child" onClick={() => setStep("duas")}>
              Go straight to bedtime duas
            </button>
          </>
        )}
        {step === "duas" && (
          <>
            <h1>Bedtime duas</h1>
            <ReviewBanner />
            {sleepDuas.map((d) => (
              <div key={d.id} className="card stack" style={{ gap: 10 }}>
                <span className="eyebrow">{d.whenToRecite}</span>
                <ArabicText text={d.arabic} size={28} />
                <p style={{ textAlign: "center" }}>{cleanMeaning(d.translation)}</p>
                {d.audio && <AudioButton id={d.id} queue={queue} srcs={[d.audio.path]} label="Listen" reciter={d.audio.reciter} variant="night" />}
              </div>
            ))}
            {quls.length > 0 && (
              <div className="card stack" style={{ gap: 10 }}>
                <span className="eyebrow">The last three Surahs</span>
                <p className="small muted">Al-Ikhlas, Al-Falaq and An-Nas, recited before sleep.</p>
                {quls.map((s) => (
                  <AudioButton
                    key={s.id}
                    id={`bed-${s.id}`}
                    queue={queue}
                    srcs={s.ayahs.map((a) => a.audio?.path).filter(Boolean) as string[]}
                    label={`Surah ${s.nameTransliterated}`}
                    variant="night"
                  />
                ))}
                <span className="tiny faint" style={{ textAlign: "center" }}>Recited by {quls[0]?.ayahs[0]?.audio?.reciter}</span>
              </div>
            )}
            {config?.ayatAlKursi && (
              <div className="card stack" style={{ gap: 10 }}>
                <span className="eyebrow">Ayat al-Kursi (Quran 2:255)</span>
                <ArabicText text={config.ayatAlKursi.arabic} quran size={22} />
                <p className="small">{config.ayatAlKursi.translation}</p>
                {config.ayatAlKursi.audio && (
                  <AudioButton id="kursi" queue={queue} srcs={[config.ayatAlKursi.audio.path]} label="Listen" reciter={config.ayatAlKursi.audio.reciter} variant="night" />
                )}
              </div>
            )}
            <button className="btn btn-night btn-child" onClick={() => { queue.stop(); setStep("night"); }}>
              Goodnight
            </button>
          </>
        )}
        {step === "night" && (
          <div className="stack center" style={{ gap: 18, marginTop: 40 }}>
            <Art name="moon" size={120} className="float" />
            <h1>Goodnight, {child.nickname}</h1>
            <p className="muted">Sleep well. See you tomorrow, in sha Allah.</p>
            <button className="btn btn-night" onClick={onExit}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
