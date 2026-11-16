import { useCallback, useMemo, useState } from "react";
import {
  Award,
  Check,
  ChevronRight,
  Clock,
  HandHeart,
  House,
  ListChecks,
  MoonStar,
  Puzzle,
  Sparkles,
  Star,
  Trophy,
  User,
  Volume2,
} from "lucide-react";
import { api } from "../api";
import { activitiesForChild, useActivities, useStarRollups, useToday, useTodayCompletions } from "../data";
import { BackLink, Celebration, ListenButton, Notice, ProgressBar, Sheet, speak } from "../components/common";
import { Avatar, CATEGORY_STYLE, CategoryChip } from "../components/icons";
import { Activity, Category, Child, Completion, displayTitle } from "../types";
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
        goodDeedDone={(() => {
          const g = pickGoodDeed(daily, dayKey);
          return g ? completions[g.id]?.status : undefined;
        })()}
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
    body = <MeTab child={child} onGrownUps={onGrownUps} onDuas={() => setSub("duas")} simFriday={simFriday} onSimFriday={toggleSimFriday} />;
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
  const tabs = [
    { id: "home" as Tab, Icon: House, label: "Home" },
    { id: "checklist" as Tab, Icon: ListChecks, label: "Checklist" },
    { id: "play" as Tab, Icon: Puzzle, label: "Play" },
    { id: "stars" as Tab, Icon: Star, label: "Stars" },
    { id: "me" as Tab, Icon: User, label: "Me" },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ id, Icon, label }) => (
        <button key={id} className="tab" aria-current={tab === id ? "page" : undefined} onClick={() => onTab(id)}>
          <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} aria-hidden="true" />
          {label}
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
  goodDeedDone?: string;
  onOpen: (a: Activity) => void;
  onTab: (t: Tab) => void;
  onSub: (s: Sub) => void;
}) {
  const greeting = `Assalamu Alaikum, ${props.child.nickname}`;
  return (
    <div className="screen">
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <Avatar id={props.child.avatarId} size={48} />
          <div className="stack" style={{ gap: 0 }}>
            <span className="faint small">{greetingForHour(props.hour)}</span>
            <h2>{greeting}</h2>
          </div>
        </div>
        <button className="icon-btn" aria-label="Listen to greeting" onClick={() => speak(greeting)}>
          <Volume2 size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="hero stack" style={{ gap: 14 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 6 }}>
            <span className="faint small strong">Stars today</span>
            <span className="metric row" style={{ gap: 8 }}>
              <Star size={30} fill="#f2c14e" color="#f2c14e" aria-hidden="true" />
              {props.starsToday}
            </span>
          </div>
          <div className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
            <span className="metric-sm">{props.doneCount}/{props.total}</span>
            <span className="faint small">done today</span>
          </div>
        </div>
        <ProgressBar value={props.total ? props.doneCount / props.total : 0} label="Today's checklist progress" />
      </div>

      {props.friday && (
        <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "var(--c-jummah-bg)", borderColor: "#d3d9ea" }} onClick={() => props.onSub("jummah")}>
          <span className="icon-chip" style={{ background: "var(--c-jummah)", color: "#fff" }} aria-hidden="true">
            <MoonStar size={22} />
          </span>
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span>Jummah Mubarak</span>
            <span className="sub">{props.jummahDone} of {props.jummahTotal} Friday activities</span>
          </span>
          <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
        </button>
      )}

      {props.goodDeed && (
        <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center" }} onClick={() => props.onOpen(props.goodDeed!)}>
          <CategoryChip category="goodDeed" />
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span className="eyebrow">Good deed of the day</span>
            <span>{displayTitle(props.goodDeed.title.en)}</span>
          </span>
          {props.goodDeedDone === "done" ? (
            <span className="status done"><Check size={14} aria-hidden="true" />Done</span>
          ) : (
            <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
          )}
        </button>
      )}

      <div className="grid2">
        <button className="tile" onClick={() => props.onTab("checklist")}>
          <span className="icon-chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden="true">
            <ListChecks size={22} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Today's checklist
            <span className="sub">{props.total - props.doneCount} left</span>
          </span>
        </button>
        <button className="tile" onClick={() => props.onSub("duas")}>
          <CategoryChip category="dua" />
          <span className="stack" style={{ gap: 2 }}>
            Dua Corner
            <span className="sub">Learn a dua</span>
          </span>
        </button>
        <button className="tile" onClick={() => props.onTab("play")}>
          <span className="icon-chip" style={{ background: "var(--c-quran-bg)", color: "var(--c-quran)" }} aria-hidden="true">
            <Puzzle size={22} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Play & Learn
            <span className="sub">Quiz and games</span>
          </span>
        </button>
        <button className="tile" onClick={() => props.onTab("stars")}>
          <span className="icon-chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} aria-hidden="true">
            <Trophy size={22} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            My Stars
            <span className="sub">See milestones</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ c }: { c?: Completion }) {
  if (!c) return null;
  if (c.status === "done") return <span className="status done"><Check size={14} aria-hidden="true" />Done</span>;
  if (c.status === "pending") return <span className="status pending"><Clock size={14} aria-hidden="true" />Waiting</span>;
  return <span className="status declined">Try again</span>;
}

function TaskRow({ a, c, onOpen }: { a: Activity; c?: Completion; onOpen: (a: Activity) => void }) {
  const state = c?.status === "done" ? "done" : c?.status === "pending" ? "pending" : "";
  return (
    <button className="list-item" onClick={() => onOpen(a)}>
      <CategoryChip category={a.category} />
      <span className="title">{displayTitle(a.title.en)}</span>
      <StatusBadge c={c} />
      <span className={`check-circle ${state}`} aria-hidden="true">
        {state === "done" && <Check size={16} strokeWidth={3} />}
        {state === "pending" && <Clock size={15} strokeWidth={2.4} />}
      </span>
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
      <div className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h1>Today</h1>
          <span className="muted small strong">{done} of {props.items.length} done</span>
        </div>
        <ProgressBar value={props.items.length ? done / props.items.length : 0} label="Checklist progress" />
      </div>
      {props.friday && (
        <button className="btn btn-accent btn-child" onClick={props.onJummah}>
          <MoonStar size={20} aria-hidden="true" /> Open the Jummah checklist
        </button>
      )}
      <div className="filter-row" role="group" aria-label="Show category">
        <button className="filter-pill" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          <Sparkles size={16} aria-hidden="true" />All
        </button>
        {cats.map((c) => {
          const s = CATEGORY_STYLE[c];
          return (
            <button key={c} className="filter-pill" aria-pressed={cat === c} onClick={() => setCat(c)}>
              <s.Icon size={16} aria-hidden="true" />
              {s.label}
            </button>
          );
        })}
      </div>
      {props.loading && !props.loadError && <p className="muted">Getting today's list ready…</p>}
      {props.loadError && <Notice>We couldn't load the list. Let's try again in a moment.</Notice>}
      {!props.loading && props.items.length === 0 && <Notice tone="calm">New activities are coming soon.</Notice>}
      {shown.length > 0 && (
        <div className="list">
          {shown.map((a) => (
            <TaskRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
          ))}
        </div>
      )}
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
  const selfItems = props.items.filter((a) => a.verification === "self");
  const family = props.items.filter((a) => a.verification === "parent");
  const allDone = props.items.length > 0 && done === props.items.length;
  return (
    <div className="screen">
      <BackLink onClick={props.onBack} />
      <div className="hero night stack" style={{ gap: 14 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="faint small strong">Friday</span>
            <h1 style={{ color: "#fff" }}>Jummah Mubarak</h1>
          </div>
          <MoonStar size={40} color="#f2c14e" aria-hidden="true" />
        </div>
        <div className="step-path" aria-label={`${done} of ${props.items.length} Jummah activities done`}>
          {props.items.map((a) => (
            <span key={a.id} className={`step ${props.completions[a.id]?.status === "done" ? "on" : ""}`} />
          ))}
        </div>
        <span className="faint small">{done} of {props.items.length} done</span>
      </div>
      {allDone && (
        <div className="card row" role="status">
          <span className="icon-chip lg" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} aria-hidden="true">
            <Award size={28} />
          </span>
          <div>
            <h3>Jummah Hero</h3>
            <p className="muted small">You finished your Friday activities.</p>
          </div>
        </div>
      )}
      <span className="section-title">I can do it</span>
      <div className="list">
        {selfItems.map((a) => (
          <TaskRow key={a.id} a={a} c={props.completions[a.id]} onOpen={props.onOpen} />
        ))}
      </div>
      <span className="section-title">With a grown-up</span>
      <p className="small muted" style={{ marginTop: -8 }}>Learning activities. Grown-ups decide these together with you.</p>
      <div className="list">
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
  const s = CATEGORY_STYLE[a.category];
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const status = props.completion?.status;
  const canDo = !status || status === "declined";
  const title = displayTitle(a.title.en);

  async function complete() {
    setBusy(true);
    setProblem(false);
    try {
      const res = await api.completeActivity(props.child.id, a.id);
      if (res.status === "done") props.onResult({ text: "Well done!", stars: res.starsAwarded });
      else props.onResult({ text: "A grown-up will check it soon" });
    } catch {
      setProblem(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={props.onClose} label={title}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="feature-panel" style={{ backgroundColor: s.bg, color: s.fg }} aria-hidden="true">
          <s.Icon size={64} strokeWidth={1.6} />
        </div>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ color: s.fg }}>{s.label}{a.isPlaceholder ? " · sample" : ""}</span>
            <h2>{title}</h2>
          </div>
          <ListenButton text={title} compact />
        </div>
        <p className="muted">{a.description.en}</p>
        <div className="notice calm">{a.educationalExplanation.en}</div>
        {problem && <Notice>Let's try again in a moment.</Notice>}
        {status === "done" && <Notice tone="calm">You already did this today. Great job!</Notice>}
        {status === "pending" && <Notice tone="calm">Waiting for a grown-up to check.</Notice>}
        {canDo && (
          <button className="btn btn-primary btn-child" disabled={busy} onClick={complete}>
            {busy ? (
              "Saving…"
            ) : a.verification === "parent" ? (
              <>
                <HandHeart size={20} aria-hidden="true" /> Ask a grown-up to check
              </>
            ) : (
              <>
                <Check size={20} strokeWidth={3} aria-hidden="true" /> I did it
              </>
            )}
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
    { title: "First 10 stars", need: 10 },
    { title: "First 50 stars", need: 50 },
    { title: "First 100 stars", need: 100 },
  ];
  return (
    <div className="screen">
      <h1>My Stars</h1>
      <div className="hero row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="faint small strong">All time</span>
          <span className="metric row" style={{ gap: 8 }}>
            <Star size={30} fill="#f2c14e" color="#f2c14e" aria-hidden="true" />
            {stars.total}
          </span>
        </div>
        <Trophy size={44} color="rgba(255,255,255,0.85)" aria-hidden="true" />
      </div>
      <div className="grid3">
        {[
          ["Today", stars.today],
          ["This week", stars.week],
          ["This month", stars.month],
        ].map(([label, n]) => (
          <div className="card stack" key={label as string} style={{ gap: 4, padding: 14 }}>
            <span className="faint tiny strong">{label}</span>
            <span className="metric-sm">{n}</span>
          </div>
        ))}
      </div>
      <span className="section-title">Milestones</span>
      <div className="list">
        {milestones.map((m) => {
          const got = stars.total >= m.need;
          return (
            <div key={m.title} className="list-item" style={{ cursor: "default" }}>
              <span
                className="icon-chip"
                style={{ background: got ? "var(--accent-soft)" : "var(--surface-2)", color: got ? "var(--accent)" : "var(--ink-3)" }}
                aria-hidden="true"
              >
                <Award size={22} />
              </span>
              <span className="title">{m.title}</span>
              {got ? (
                <span className="status done"><Check size={14} aria-hidden="true" />Earned</span>
              ) : (
                <span className="faint small">{Math.max(0, m.need - stars.total)} to go</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="tiny faint">Sample milestones. The real list will come from the server.</p>
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
      <div className="card stack center" style={{ padding: 24 }}>
        <Avatar id={props.child.avatarId} size={88} />
        <h1>{props.child.nickname}</h1>
        <span className="muted small">Age group {props.child.ageGroup}</span>
      </div>
      <div className="list">
        <button className="list-item" onClick={props.onDuas}>
          <CategoryChip category="dua" />
          <span className="title">My Duas</span>
          <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
        </button>
      </div>
      {testerToolsEnabled && (
        <div className="card stack">
          <span className="eyebrow">Tester tools</span>
          <label className="row" style={{ cursor: "pointer" }}>
            <input type="checkbox" className="checkbox" checked={props.simFriday} onChange={(e) => props.onSimFriday(e.target.checked)} />
            <span>Pretend today is Friday (to test Jummah)</span>
          </label>
        </div>
      )}
      <button className="btn btn-secondary btn-block" style={{ marginTop: "auto" }} onClick={props.onGrownUps}>
        <User size={18} aria-hidden="true" /> Parent area
      </button>
    </div>
  );
}
