import { useCallback, useMemo, useState } from "react";
import { api } from "../api";
import { activitiesForChild, useActivities, useStarRollups, useToday, useTodayCompletions } from "../data";
import { Mascot } from "../components/Mascot";
import { Celebration, ListenButton, ProgressBar, Sheet, speak } from "../components/common";
import { Activity, avatarEmoji, CATEGORY_INFO, Category, Child, Completion } from "../types";
import { greetingForHour, isFridayDayKey } from "../time";
import { PlayTab } from "./Play";
import { DuaCorner } from "./DuaCorner";
import { testerToolsEnabled } from "../devFlags";

type Tab = "home" | "checklist" | "play" | "stars" | "me";
type Sub = null | "jummah" | "duas";

const SIM_FRIDAY_KEY = "ds_sim_friday";

export function ChildApp({ child, onGrownUps }: { child: Child; onGrownUps: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [sub, setSub] = useState<Sub>(null);
  const [simFriday, setSimFriday] = useState(() => testerToolsEnabled && localStorage.getItem(SIM_FRIDAY_KEY) === "1");
  const { dayKey, weekKey, now } = useToday(child);
  const friday = isFridayDayKey(dayKey) || simFriday;
  const { activities, error } = useActivities();
  const completions = useTodayCompletions(child.id, dayKey);
  const stars = useStarRollups(child.id, dayKey, weekKey);
  const mine = useMemo(() => (activities ? activitiesForChild(activities, child, friday) : []), [activities, child, friday]);

  const [open, setOpen] = useState<Activity | null>(null);
  const [celebrate, setCelebrate] = useState<{ text: string; stars?: number } | null>(null);
  const endCelebration = useCallback(() => setCelebrate(null), []);

  function toggleSimFriday(v: boolean) {
    localStorage.setItem(SIM_FRIDAY_KEY, v ? "1" : "0");
    setSimFriday(v);
  }

  const daily = mine.filter((a) => a.category !== "jummah");
  const jummah = mine.filter((a) => a.category === "jummah");
  const doneCount = daily.filter((a) => completions[a.id]?.status === "done").length;

  let body;
  if (sub === "jummah") {
    body = <JummahScreen items={jummah} completions={completions} onOpen={setOpen} onBack={() => setSub(null)} />;
  } else if (sub === "duas") {
    body = <DuaCorner child={child} onBack={() => setSub(null)} />;
  } else if (tab === "home") {
    body = (
      <HomeTab
        child={child}
        hour={now.getHours()}
        starsToday={stars.today}
        doneCount={doneCount}
        total={daily.length}
        friday={friday}
        jummahDone={jummah.filter((a) => completions[a.id]?.status === "done").length}
        jummahTotal={jummah.length}
        goodDeed={pickGoodDeed(daily, dayKey)}
        onOpen={setOpen}
        onTab={setTab}
        onSub={setSub}
      />
    );
  } else if (tab === "checklist") {
    body = (
      <ChecklistTab items={daily} completions={completions} onOpen={setOpen} friday={friday} onJummah={() => setSub("jummah")} loadError={error} loading={!activities} />
    );
  } else if (tab === "play") {
    body = <PlayTab child={child} onCelebrate={(text) => setCelebrate({ text })} />;
  } else if (tab === "stars") {
    body = <StarsTab stars={stars} />;
  } else {
    body = (
      <MeTab child={child} onGrownUps={onGrownUps} onDuas={() => setSub("duas")} simFriday={simFriday} onSimFriday={toggleSimFriday} />
    );
  }

  return (
    <>
      {body}
      <TabBar
        tab={sub ? null : tab}
        onTab={(t) => {
          setSub(null);
          setTab(t);
        }}
      />
      {open && (
        <TaskSheet
          activity={open}
          child={child}
          completion={completions[open.id]}
          onClose={() => setOpen(null)}
          onResult={(c) => {
            setOpen(null);
            setCelebrate(c);
          }}
        />
      )}
      {celebrate && <Celebration text={celebrate.text} stars={celebrate.stars} onDone={endCelebration} />}
    </>
  );
}

function pickGoodDeed(items: Activity[], dayKey: string): Activity | undefined {
  const deeds = items.filter((a) => a.category === "goodDeed");
  if (deeds.length === 0) return undefined;
  const n = dayKey.split("-").reduce((s, p) => s + Number(p), 0);
  return deeds[n % deeds.length];
}

function TabBar({ tab, onTab }: { tab: Tab | null; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "checklist", icon: "✅", label: "Checklist" },
    { id: "play", icon: "🎮", label: "Play" },
    { id: "stars", icon: "⭐", label: "Stars" },
    { id: "me", icon: "🙂", label: "Me" },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <button key={t.id} className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => onTab(t.id)}>
          <span className="icon" aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function HomeTab(props: {
  child: Child;
  hour: number;
  starsToday: number;
  doneCount: number;
  total: number;
  friday: boolean;
  jummahDone: number;
  jummahTotal: number;
  goodDeed?: Activity;
  onOpen: (a: Activity) => void;
  onTab: (t: Tab) => void;
  onSub: (s: Sub) => void;
}) {
  const greeting = `Assalamu Alaikum, ${props.child.nickname}!`;
  return (
    <div className="screen">
      <div className="row between">
        <div className="stack" style={{ gap: 2 }}>
          <span className="muted small">{greetingForHour(props.hour)}</span>
          <h2>{greeting}</h2>
        </div>
        <button className="btn btn-secondary" style={{ minWidth: 60 }} aria-label="Listen to greeting" onClick={() => speak(greeting)}>
          🔊
        </button>
      </div>

      <div className="hero row">
        <Mascot size={96} mood={props.starsToday > 0 ? "cheer" : "happy"} />
        <div className="stack" style={{ gap: 4, flex: 1 }}>
          <span>Stars today</span>
          <span className="star-count">⭐ {props.starsToday}</span>
          <ProgressBar value={props.total ? props.doneCount / props.total : 0} label="Today's checklist progress" />
          <span className="small">{props.doneCount} of {props.total} things done</span>
        </div>
      </div>

      {props.friday && (
        <button className="tile" style={{ background: "var(--sky-soft)", flexDirection: "row", gap: 12 }} onClick={() => props.onSub("jummah")}>
          <span className="icon" aria-hidden="true">🌙</span>
          <div className="stack" style={{ gap: 2, textAlign: "left", flex: 1 }}>
            <span>It's Friday! Jummah Mubarak</span>
            <span className="small muted">{props.jummahDone} of {props.jummahTotal} Jummah activities</span>
          </div>
        </button>
      )}

      <div className="grid2">
        {props.goodDeed ? (
          <button className="tile" style={{ background: "var(--gold-soft)" }} onClick={() => props.onOpen(props.goodDeed!)}>
            <span className="icon" aria-hidden="true">🌟</span>
            <span>Good Deed of the Day</span>
            <span className="small muted" style={{ fontWeight: 600 }}>{props.goodDeed.title.en}</span>
          </button>
        ) : (
          <div className="tile" style={{ background: "var(--gold-soft)" }}>
            <span className="icon" aria-hidden="true">🌟</span>
            <span>Good deeds coming soon</span>
          </div>
        )}
        <button className="tile" style={{ background: "var(--mint)" }} onClick={() => props.onTab("checklist")}>
          <span className="icon" aria-hidden="true">✅</span>
          <span>Today's checklist</span>
        </button>
        <button className="tile" style={{ background: "var(--lavender-soft)" }} onClick={() => props.onSub("duas")}>
          <span className="icon" aria-hidden="true">🤲</span>
          <span>Dua Corner</span>
        </button>
        <button className="tile" style={{ background: "var(--coral-soft)" }} onClick={() => props.onTab("play")}>
          <span className="icon" aria-hidden="true">🎮</span>
          <span>Play & Learn</span>
        </button>
      </div>
    </div>
  );
}

function statusChip(c: Completion | undefined) {
  if (!c) return <span className="status todo">To do</span>;
  if (c.status === "done") return <span className="status done">✔ Done</span>;
  if (c.status === "pending") return <span className="status pending">⏳ Waiting for a grown-up</span>;
  return <span className="status declined">Let's try together</span>;
}

function TaskRow({ a, c, onOpen }: { a: Activity; c?: Completion; onOpen: (a: Activity) => void }) {
  const info = CATEGORY_INFO[a.category];
  return (
    <button className="task" onClick={() => onOpen(a)}>
      <span className="pic" style={{ background: info.color }} aria-hidden="true">{info.emoji}</span>
      <span className="title">{a.title.en}</span>
      {statusChip(c)}
    </button>
  );
}

function ChecklistTab(props: {
  items: Activity[];
  completions: Record<string, Completion>;
  onOpen: (a: Activity) => void;
  friday: boolean;
  onJummah: () => void;
  loadError: boolean;
  loading: boolean;
}) {
  const [cat, setCat] = useState<Category | "all">("all");
  const cats = Array.from(new Set(props.items.map((a) => a.category)));
  const shown = cat === "all" ? props.items : props.items.filter((a) => a.category === cat);
  const done = props.items.filter((a) => props.completions[a.id]?.status === "done").length;

  return (
    <div className="screen">
      <div className="row between">
        <h1>Today's Checklist</h1>
        <span className="status done" aria-label={`${done} of ${props.items.length} done`}>{done}/{props.items.length}</span>
      </div>
      {props.friday && (
        <button className="btn btn-gold btn-child" onClick={props.onJummah}>
          🌙 Open the Jummah checklist
        </button>
      )}
      <div className="filter-row" role="group" aria-label="Show category">
        <button className="filter-pill" aria-pressed={cat === "all"} style={{ background: "#fff" }} onClick={() => setCat("all")}>
          <span aria-hidden="true">✨</span>All
        </button>
        {cats.map((c) => (
          <button key={c} className="filter-pill" aria-pressed={cat === c} style={{ background: CATEGORY_INFO[c].color }} onClick={() => setCat(c)}>
            <span aria-hidden="true">{CATEGORY_INFO[c].emoji}</span>
            {CATEGORY_INFO[c].label}
          </button>
        ))}
      </div>
      {props.loading && !props.loadError && <p className="muted">Getting today's list ready…</p>}
      {props.loadError && <div className="gentle-box">We couldn't load the list. Let's try again in a moment.</div>}
      {!props.loading && props.items.length === 0 && <div className="gentle-box">New activities are coming soon!</div>}
      <div className="stack">
        {shown.map((a) => (
          <TaskRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
    </div>
  );
}

function JummahScreen(props: {
  items: Activity[];
  completions: Record<string, Completion>;
  onOpen: (a: Activity) => void;
  onBack: () => void;
}) {
  const done = props.items.filter((a) => props.completions[a.id]?.status === "done").length;
  const learning = props.items.filter((a) => a.verification === "self");
  const family = props.items.filter((a) => a.verification === "parent");
  const allDone = props.items.length > 0 && done === props.items.length;
  return (
    <div className="screen">
      <button className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={props.onBack}>
        ← Back
      </button>
      <div className="hero stack" style={{ background: "linear-gradient(160deg, #3b5bab 0%, #24315f 100%)" }}>
        <h1>Jummah Mubarak! 🕌</h1>
        <div className="lantern-path" aria-label={`${done} of ${props.items.length} Jummah activities done`}>
          {props.items.map((a) => (
            <span key={a.id} className={`lantern ${props.completions[a.id]?.status === "done" ? "lit" : ""}`} aria-hidden="true">🏮</span>
          ))}
        </div>
        <span>{done} of {props.items.length} done</span>
      </div>
      {allDone && (
        <div className="card row" role="status">
          <span style={{ fontSize: 40 }} aria-hidden="true">🏅</span>
          <div>
            <h3>Jummah Hero!</h3>
            <p className="muted small">You finished your Friday activities.</p>
          </div>
        </div>
      )}
      <h3>I can do it</h3>
      <div className="stack">
        {learning.map((a) => (
          <TaskRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
      <h3>With a grown-up</h3>
      <p className="small muted">These are learning activities. Grown-ups decide together with you.</p>
      <div className="stack">
        {family.map((a) => (
          <TaskRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
    </div>
  );
}

function TaskSheet(props: {
  activity: Activity;
  child: Child;
  completion?: Completion;
  onClose: () => void;
  onResult: (c: { text: string; stars?: number }) => void;
}) {
  const a = props.activity;
  const info = CATEGORY_INFO[a.category];
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const status = props.completion?.status;
  const canDo = !status || status === "declined";

  async function complete() {
    setBusy(true);
    setProblem(false);
    try {
      const res = await api.completeActivity(props.child.id, a.id);
      if (res.status === "done") props.onResult({ text: "Well done!", stars: res.starsAwarded });
      else props.onResult({ text: "A grown-up will check it soon!" });
    } catch {
      setProblem(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={props.onClose} label={a.title.en}>
      <div className="stack">
        <div className="big-pic" style={{ background: info.color }} aria-hidden="true">{info.emoji}</div>
        <h2>{a.title.en}</h2>
        <p className="muted">{a.description.en}</p>
        <div className="gentle-box small">{a.educationalExplanation.en}</div>
        <ListenButton text={a.title.en} />
        {problem && <div className="gentle-box">Let's try again in a moment.</div>}
        {status === "done" && <div className="gentle-box">✔ You already did this today. Great job!</div>}
        {status === "pending" && <div className="gentle-box">⏳ Waiting for a grown-up to check.</div>}
        {canDo && (
          <button className="btn btn-primary btn-child" disabled={busy} onClick={complete}>
            {busy ? "Saving…" : a.verification === "parent" ? "🙋 Ask Mommy or Daddy" : "✔ I did it!"}
          </button>
        )}
        <button className="btn btn-ghost" onClick={props.onClose}>
          Close
        </button>
      </div>
    </Sheet>
  );
}

function StarsTab({ stars }: { stars: { total: number; today: number; week: number; month: number } }) {
  const milestones = [
    { title: "First 10 Stars", need: 10, emoji: "✨" },
    { title: "First 50 Stars", need: 50, emoji: "🌟" },
    { title: "First 100 Stars", need: 100, emoji: "🏆" },
  ];
  return (
    <div className="screen">
      <h1>My Stars</h1>
      <div className="grid2">
        {[
          ["Today", stars.today],
          ["This week", stars.week],
          ["This month", stars.month],
          ["All time", stars.total],
        ].map(([label, n]) => (
          <div className="card stack center" key={label as string} style={{ gap: 2 }}>
            <span className="muted small">{label}</span>
            <span className="star-count" style={{ fontSize: 32 }}>⭐ {n}</span>
          </div>
        ))}
      </div>
      <h2>My Milestones</h2>
      <p className="small muted">Sample milestones. The real list will come from the server.</p>
      <div className="grid3">
        {milestones.map((m) => {
          const got = stars.total >= m.need;
          return (
            <div key={m.title} className="card stack center" style={{ gap: 4, opacity: got ? 1 : 0.55 }}>
              <span style={{ fontSize: 36, filter: got ? "none" : "grayscale(1)" }} aria-hidden="true">{m.emoji}</span>
              <span className="small" style={{ fontWeight: 700 }}>{m.title}</span>
              <span className="small muted">{got ? "Earned!" : `${Math.max(0, m.need - stars.total)} to go`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeTab(props: {
  child: Child;
  onGrownUps: () => void;
  onDuas: () => void;
  simFriday: boolean;
  onSimFriday: (v: boolean) => void;
}) {
  return (
    <div className="screen">
      <div className="card stack center">
        <span style={{ fontSize: 72 }} aria-hidden="true">{avatarEmoji(props.child.avatarId)}</span>
        <h1>{props.child.nickname}</h1>
        <span className="muted">Age group {props.child.ageGroup}</span>
      </div>
      <button className="btn btn-secondary btn-child" onClick={props.onDuas}>
        🤲 My Duas
      </button>
      {testerToolsEnabled && (
        <div className="card stack">
          <h3>Tester tools</h3>
          <label className="row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={props.simFriday} onChange={(e) => props.onSimFriday(e.target.checked)} style={{ width: 24, height: 24 }} />
            <span>Pretend today is Friday (to test Jummah)</span>
          </label>
        </div>
      )}
      <button className="btn btn-ghost" style={{ marginTop: "auto" }} onClick={props.onGrownUps}>
        👤 Grown-ups
      </button>
    </div>
  );
}
