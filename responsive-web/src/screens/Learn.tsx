import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Heart, MoonStar, Search, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { useDuaPrefs } from "../duaPrefs";
import { useConfig, useLearningProgress, useLibrary } from "../data";
import { ArabicText, cleanMeaning, cleanTransliteration, translationCredit } from "../components/ArabicText";
import { AudioButton, useAudioQueue } from "../components/audio";
import { BackLink, Busy, Notice } from "../components/common";
import { DUA_CATEGORY_ART } from "../components/icons";
import { Art, Banner, SectionHeader } from "../components/ui";
import { BedtimeScene, Scene } from "../components/scenes";
import { DUA_BROWSE, duaSlug, quranOrder, storyPageCount, surahSlug } from "../content";
import { AGE_BAND_LABEL, ageBandFor, Child, Dua, isGuest, LEARN_LABEL, LearnState, Story, Surah } from "../types";



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

function duaArt(d: Dua) {
  return DUA_CATEGORY_ART[d.category] ?? "palms-up";
}

function DuaRow({ d, child, state, onOpen, favorite }: { d: Dua; child: Child; state: LearnState; onOpen: () => void; favorite: boolean }) {
  return (
    <button className="list-item" onClick={onOpen}>
      <span className="art-chip" style={{ background: "var(--c-dua-bg)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true">
        <Art name={duaArt(d)} size={36} />
      </span>
      <span className="stack" style={{ gap: 2, flex: 1 }}>
        <span className="strong">{d.title}</span>
        {!isGuest(child) && <span className="small faint">{LEARN_LABEL[state]}</span>}
      </span>
      {favorite && <Heart size={18} fill="currentColor" color="var(--c-dua)" aria-label="Favourite" />}
      {state === "learned" ? (
        <span className="check-circle done" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
      ) : (
        <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
      )}
    </button>
  );
}

function DuaDetail(props: { d: Dua; child: Child; state: LearnState; favorite: boolean; onFavorite: () => void; onBack: () => void; queue: ReturnType<typeof useAudioQueue> }) {
  const { d, child, state } = props;
  const cat = DUA_BROWSE.find((c) => c.from.includes(d.category));
  const short = d.concise ?? null;
  return (
    <div className="screen reading">
      <BackLink onClick={props.onBack} label={cat?.label ?? "Dua Corner"} />
      <ReviewBanner />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow" style={{ color: "var(--c-dua)" }}>{cat?.label}</span>
          <h1>{short ? "Before eating" : d.title}</h1>
          <span className="muted small">{d.whenToRecite}</span>
        </div>
        <button type="button" className="icon-btn" aria-pressed={props.favorite} aria-label={props.favorite ? "Remove from favourites" : "Add to favourites"} onClick={props.onFavorite}>
          <Heart size={22} fill={props.favorite ? "currentColor" : "none"} color="var(--c-dua)" aria-hidden="true" />
        </button>
      </div>
      <div className="card stack" style={{ gap: 12 }}>
        {short ? (
          <>
            <ArabicText text={short.arabic} quran={false} size={34} />
            <p style={{ textAlign: "center" }}>{short.translation}</p>
          </>
        ) : (
          <>
            <ArabicText text={d.arabic} quran={d.source.type === "quran"} highlightFromWord={d.highlightFromWord} size={28} />
            {d.transliteration && <p className="small muted transliteration">{cleanTransliteration(d.transliteration)}</p>}
            <p style={{ textAlign: "center" }}>{cleanMeaning(d.translation)}</p>
            {d.repeat > 1 && <span className="tiny faint" style={{ textAlign: "center" }}>Say it {d.repeat} times</span>}
          </>
        )}
      </div>
      {d.ifForgotten && (
        <details className="card dua-more">
          <summary className="strong">{d.ifForgotten.label}</summary>
          <div className="stack" style={{ gap: 12, marginTop: 12 }}>
            <ArabicText text={d.ifForgotten.arabic} quran={false} size={30} />
            <p style={{ textAlign: "center" }}>{d.ifForgotten.translation}</p>
          </div>
        </details>
      )}
      {/* The recording is of the long narration, so it is not offered next to the short version. */}
      {d.audio && !short && <AudioButton id={d.id} queue={props.queue} srcs={[d.audio.path]} label="Listen to the dua" reciter={d.audio.reciter} variant="primary" />}
      {!isGuest(child) && <ProgressPicker childId={child.id} kind="dua" itemId={d.id} state={state} />}
      <div className="row tiny faint" style={{ gap: 6, alignItems: "flex-start" }}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Source: {sourceLine(d)}</span>
      </div>
    </div>
  );
}

/**
 * Dua Corner. Landing page with categories, search, favourites and recently viewed.
 * On the website the view follows the URL: /duas, /duas/category/morning, /duas/before-sleeping.
 * Pass `selected` ("category/morning" or a dua slug) and `onSelect`. Inside the signed-in app it keeps its own state.
 * Favourites and recents live on this device only.
 */
export function DuaCorner({ child, onBack, selected, onSelect }: { child: Child; onBack: () => void; selected?: string | null; onSelect?: (sel: string | null) => void }) {
  const { items, error } = useLibrary<Dua>("duaLibrary");
  const progress = useLearningProgress(child.id, "dua");
  const prefs = useDuaPrefs();
  const [local, setLocal] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const queue = useAudioQueue();
  const sel = onSelect ? selected ?? null : local;
  const setSel = (s: string | null) => {
    queue.stop();
    if (onSelect) onSelect(s);
    else setLocal(s);
  };
  const openDua = items && sel && !sel.startsWith("category/") ? items.find((d) => duaSlug(d.id) === sel) ?? null : null;
  const markViewed = prefs.markViewed;
  const openId = openDua?.id;
  useEffect(() => {
    if (openId) markViewed(openId);
  }, [openId, markViewed]);

  const toSlug = (d: Dua) => duaSlug(d.id);
  const backFor = (d: Dua) => {
    const cat = DUA_BROWSE.find((c) => c.from.includes(d.category));
    return cat ? `category/${cat.id}` : null;
  };

  if (openDua) {
    return (
      <DuaDetail
        d={openDua}
        child={child}
        state={progress[openDua.id] ?? "notStarted"}
        favorite={prefs.favorites.includes(openDua.id)}
        onFavorite={() => prefs.toggleFavorite(openDua.id)}
        onBack={() => setSel(backFor(openDua))}
        queue={queue}
      />
    );
  }

  const stateOf = (d: Dua) => progress[d.id] ?? "notStarted";
  const row = (d: Dua) => <DuaRow key={d.id} d={d} child={child} state={stateOf(d)} favorite={prefs.favorites.includes(d.id)} onOpen={() => setSel(toSlug(d))} />;

  // Category page
  const catId = sel?.startsWith("category/") ? sel.slice("category/".length) : null;
  const cat = catId ? DUA_BROWSE.find((c) => c.id === catId) : null;
  if (cat) {
    const list = items?.filter((d) => cat.from.includes(d.category)) ?? [];
    return (
      <div className="screen">
        <BackLink onClick={() => setSel(null)} label="Dua Corner" />
        <Banner tone="gold" art={cat.art} wide title={cat.label} sub={cat.blurb} />
        {error && <Notice>We couldn't load the duas. Let's try again in a moment.</Notice>}
        {!items && !error && <p className="muted">Loading…</p>}
        {items && list.length === 0 && (
          <div className="card stack" style={{ gap: 6, textAlign: "center" }}>
            <strong>Coming soon</strong>
            <p className="muted small">These duas are being checked by our reviewers before we share them. Please come back soon.</p>
            <button className="btn btn-secondary" onClick={() => setSel(null)}>See all dua groups</button>
          </div>
        )}
        {list.length > 0 && <div className="list">{list.map(row)}</div>}
      </div>
    );
  }

  // Landing page
  const q = query.trim().toLowerCase();
  const results = items && q ? items.filter((d) => `${d.title} ${d.whenToRecite} ${cleanMeaning(d.translation)}`.toLowerCase().includes(q)) : [];
  const byId = (ids: string[]) => ids.map((id) => items?.find((d) => d.id === id)).filter((d): d is Dua => !!d);
  const favs = byId(prefs.favorites);
  const recents = byId(prefs.recent);
  const learned = items ? items.filter((d) => progress[d.id] === "learned").length : 0;
  return (
    <div className="screen">
      <BackLink onClick={onBack} />
      <Banner tone="gold" art="palms-up" wide title="Dua Corner" sub={isGuest(child) ? "Pick a time of day" : `${learned} of ${items?.length ?? 0} learned`}>
        {!isGuest(child) && <span className="progress" style={{ background: "rgba(255,255,255,0.28)", marginTop: 8 }}>
          <span style={{ display: "block", height: "100%", borderRadius: 999, background: "#fff", width: `${items?.length ? (learned / items.length) * 100 : 0}%` }} />
        </span>}
      </Banner>
      {error && <Notice>We couldn't load the duas. Let's try again in a moment.</Notice>}
      <div className="field">
        <label htmlFor="dua-search" className="label">Find a dua</label>
        <div className="search-box">
          <Search size={18} aria-hidden="true" />
          <input id="dua-search" className="input" type="search" placeholder="Search duas" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </div>
      </div>
      {q ? (
        <div className="stack" style={{ gap: 8 }}>
          <SectionHeader title={`Results for "${query.trim()}"`} />
          {items && results.length === 0 ? <p className="muted">No duas found. Try another word.</p> : <div className="list">{results.map(row)}</div>}
        </div>
      ) : (
        <>
          {recents.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <SectionHeader title="Recently viewed" />
              <div className="list">{recents.map(row)}</div>
            </div>
          )}
          {favs.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <SectionHeader title="Favourites" />
              <div className="list">{favs.map(row)}</div>
            </div>
          )}
          <div className="stack" style={{ gap: 8 }}>
            <SectionHeader title="Browse by group" />
            <div className="dua-cats">
              {DUA_BROWSE.map((c) => (
                <button key={c.id} className="tile dua-cat" onClick={() => setSel(`category/${c.id}`)}>
                  <span className="art-chip" style={{ background: "var(--c-dua-bg)", width: 56, height: 56, borderRadius: 18 }} aria-hidden="true">
                    <Art name={c.art} size={40} />
                  </span>
                  <span className="strong">{c.label}</span>
                  <span className="tiny faint">{c.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
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
