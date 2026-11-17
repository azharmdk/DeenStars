import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  Check,
  ChevronRight,
  HandHeart,
  House,
  ListChecks,
  Lock,
  MoonStar,
  Puzzle,
  Sparkles,
  Star,
  Trophy,
  User,
  Users,
  BookOpen,
  Bed,
  Library,
} from "lucide-react";
import { api } from "../api";
import {
  activitiesForChild,
  featuredForDay,
  useActivities,
  useStarRollups,
  useStreaks,
  useToday,
  useTodayCompletions,
  useLibrary,
  useSeason,
  SIM_SEASON_KEY,
} from "../data";
import { BackLink, Celebration, Notice, ProgressBar, Sheet } from "../components/common";
import { Scene } from "../components/scenes";
import { Avatar, CATEGORY_STYLE, CategoryChip } from "../components/icons";
import { Activity, ageBandFor, Category, Child, Completion, displayTitle, isStreakActive, Story, Streak, STREAK_CELEBRATIONS } from "../types";
import { Season } from "../hijri";
import { greetingForHour, isFridayDayKey } from "../time";
import { PlayTab } from "./Play";
import { Bedtime, DuaCorner, StoryLibrary, StoryReader, SurahLearning } from "./Learn";
import { EidScreen, RamadanScreen, SeasonCard, ThemeCard } from "./Seasonal";
import { testerToolsEnabled } from "../devFlags";
import { getThemePref, setThemePref, type ThemePref } from "../theme";

type Tab = "home" | "checklist" | "play" | "stars" | "me";
type Sub = null | "jummah" | "duas" | "surahs" | "stories" | "story" | "bedtime" | "ramadan" | "eid";

const SIM_FRIDAY_KEY = "ds_sim_friday";

export function ChildApp({ child, onGrownUps, pendingCount }: { child: Child; onGrownUps: () => void; pendingCount: number }) {
  const [tab, setTab] = useState<Tab>("home");
  const [sub, setSub] = useState<Sub>(null);
  const [simFriday, setSimFriday] = useState(() => testerToolsEnabled && localStorage.getItem(SIM_FRIDAY_KEY) === "1");
  const { dayKey, weekKey, now } = useToday(child);
  const friday = isFridayDayKey(dayKey) || simFriday;
  const { activities, error } = useActivities();
  const completions = useTodayCompletions(child.id, dayKey);
  const stars = useStarRollups(child.id, dayKey, weekKey);
  const streaks = useStreaks(child.id);
  const seasonInfo = useSeason(child, dayKey);
  const season = seasonInfo.season;
  const mine = useMemo(() => (activities ? activitiesForChild(activities, child, friday, season) : []), [activities, child, friday, season]);
  const [story, setStory] = useState<Story | null>(null);
  const stories = useLibrary<Story>("stories").items;

  const [open, setOpen] = useState<Activity | null>(null);
  const [celebrate, setCelebrate] = useState<{ text: string; stars?: number } | null>(null);
  const endCelebration = useCallback(() => setCelebrate(null), []);

  // Celebrate streak milestones once, on the day they are reached.
  useEffect(() => {
    for (const s of Object.values(streaks)) {
      if (s.lastDoneDayKey !== dayKey || !STREAK_CELEBRATIONS.includes(s.current)) continue;
      const key = `ds_streak_cheer_${child.id}_${s.activityId}_${dayKey}`;
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "1");
      const a = activities?.find((x) => x.id === s.activityId);
      setCelebrate({ text: `${s.current} days in a row${a ? `: ${displayTitle(a.title.en)}` : ""}!` });
      break;
    }
  }, [streaks, dayKey, child.id, activities]);

  function toggleSimFriday(v: boolean) {
    localStorage.setItem(SIM_FRIDAY_KEY, v ? "1" : "0");
    setSimFriday(v);
  }

  // The daily checklist shows everyday items. Jummah, Ramadan and Eid items have their own screens.
  const daily = mine.filter((a) => (a.frequency ?? "daily") === "daily");
  const jummah = mine.filter((a) => a.frequency === "jummahOnly");
  const week = Number(weekKey.split("-W")[1]); // Friday story changes each ISO week
  const bandStories = stories?.filter((s) => s.ageBand === ageBandFor(child)) ?? [];
  const fridayStory = bandStories.length ? bandStories[week % bandStories.length] : undefined;
  const openStory = (s: Story) => {
    setStory(s);
    setSub("story");
  };
  const doneCount = daily.filter((a) => completions[a.id]?.status === "done").length;
  const featured = featuredForDay(daily, dayKey);

  let body;
  if (sub === "jummah") {
    body = (
      <JummahScreen items={jummah} completions={completions} streaks={streaks} today={dayKey} onOpen={setOpen} onBack={() => setSub(null)} story={fridayStory} onStory={openStory} />
    );
  } else if (sub === "duas") {
    body = <DuaCorner child={child} onBack={() => setSub(null)} />;
  } else if (sub === "surahs") {
    body = <SurahLearning child={child} onBack={() => setSub(null)} />;
  } else if (sub === "stories") {
    body = <StoryLibrary child={child} onBack={() => setSub(null)} onOpen={openStory} />;
  } else if (sub === "story" && story) {
    body = <StoryReader story={story} onBack={() => setSub("stories")} />;
  } else if (sub === "bedtime") {
    return <Bedtime child={child} dayKey={dayKey} onExit={() => setSub(null)} />;
  } else if (sub === "ramadan" && season.kind === "ramadan") {
    body = <RamadanScreen child={child} dayKey={dayKey} day={season.day} activities={mine} completions={completions} onOpen={setOpen} onBack={() => setSub(null)} />;
  } else if (sub === "eid") {
    body = <EidScreen season={season} activities={mine} completions={completions} onOpen={setOpen} onBack={() => setSub(null)} />;
  } else if (tab === "home") {
    body = (
      <HomeTab
        child={child}
        hour={now.getHours()}
        starsWeek={stars.week}
        doneCount={doneCount}
        total={daily.length}
        friday={friday}
        jummahDone={jummah.filter((a) => completions[a.id]?.status === "done").length}
        jummahTotal={jummah.length}
        featured={featured}
        featuredCompletion={featured ? completions[featured.id] : undefined}
        featuredStreak={featured && isStreakActive(streaks[featured.id], dayKey) ? streaks[featured.id] : undefined}
        onOpen={setOpen}
        onTab={setTab}
        onSub={setSub}
        season={season}
        seasonInfo={seasonInfo}
        activities={mine}
        completions={completions}
        dayKey={dayKey}
      />
    );
  } else if (tab === "checklist") {
    body = (
      <ChecklistTab
        items={daily}
        completions={completions}
        streaks={streaks}
        today={dayKey}
        onOpen={setOpen}
        friday={friday}
        onJummah={() => setSub("jummah")}
        loadError={error}
        loading={!activities}
      />
    );
  } else if (tab === "play") {
    body = <PlayTab child={child} onCelebrate={(text) => setCelebrate({ text })} />;
  } else if (tab === "stars") {
    body = <StarsTab stars={stars} streaks={streaks} activities={activities ?? []} today={dayKey} />;
  } else {
    body = (
      <MeTab
        child={child}
        onGrownUps={onGrownUps}
        pendingCount={pendingCount}
        onDuas={() => setSub("duas")}
        onSurahs={() => setSub("surahs")}
        simFriday={simFriday}
        onSimFriday={toggleSimFriday}
      />
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
          streak={isStreakActive(streaks[open.id], dayKey) ? streaks[open.id] : undefined}
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
          <span className="tab-icon">
            <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} aria-hidden="true" />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}

function StreakChip({ s }: { s: Streak }) {
  return (
    <span className="status streak">
      <CalendarCheck size={14} aria-hidden="true" />
      {s.current} days
    </span>
  );
}

function TogetherTag() {
  return (
    <span className="status together">
      <Users size={13} aria-hidden="true" />
      Together
    </span>
  );
}

function HomeTab(props: {
  child: Child;
  hour: number;
  starsWeek: number;
  doneCount: number;
  total: number;
  friday: boolean;
  jummahDone: number;
  jummahTotal: number;
  featured?: Activity;
  featuredCompletion?: Completion;
  featuredStreak?: Streak;
  onOpen: (a: Activity) => void;
  onTab: (t: Tab) => void;
  onSub: (s: Sub) => void;
  season: Season;
  seasonInfo: ReturnType<typeof useSeason>;
  activities: Activity[];
  completions: Record<string, Completion>;
  dayKey: string;
}) {
  const greeting = `Assalamu Alaikum, ${props.child.nickname}`;
  const f = props.featured;
  const fStatus = props.featuredCompletion?.status;
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
        <button className="pill-gold" style={{ cursor: "pointer" }} onClick={() => props.onTab("stars")} aria-label={`${props.starsWeek} stars this week. Open My Stars`}>
          <Star size={20} fill="currentColor" aria-hidden="true" />
          {props.starsWeek}
        </button>
      </div>

      <SeasonCard
        season={props.season}
        daysToRamadan={props.seasonInfo.daysToRamadan}
        hijri={props.seasonInfo.hijri}
        onOpen={(s) => props.onSub(s === "ramadan" ? "ramadan" : "eid")}
      />

      {f ? (
        <div className="hero stack" style={{ gap: 16 }}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className="faint small strong">Today's deed</span>
              <h1 style={{ color: "#fff", fontSize: 26 }}>{displayTitle(f.title.en)}</h1>
              {f.together && (
                <span className="row small" style={{ gap: 6, color: "rgba(255,255,255,0.85)" }}>
                  <Users size={16} aria-hidden="true" /> Do it together with a grown-up
                </span>
              )}
            </div>
            <span className="icon-chip lg" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }} aria-hidden="true">
              {(() => {
                const I = CATEGORY_STYLE[f.category].Icon;
                return <I size={28} />;
              })()}
            </span>
          </div>
          {fStatus === "done" ? (
            <div className="row" style={{ gap: 8, fontWeight: 700 }}>
              <span className="check-circle done" style={{ borderColor: "#fff", background: "#fff", color: "var(--hero-ink)" }} aria-hidden="true">
                <Check size={16} strokeWidth={3} />
              </span>
              Done today. Well done!
            </div>
          ) : fStatus === "pending" ? (
            <div className="row" style={{ gap: 8, fontWeight: 700 }}>
              <Star size={20} color="#f2c14e" aria-hidden="true" /> Waiting for a grown-up
            </div>
          ) : (
            <button className="btn btn-child" style={{ background: "#fff", color: "var(--hero-ink)", ["--edge" as string]: "rgba(0,0,0,0.22)" }} onClick={() => props.onOpen(f)}>
              Let's do it
            </button>
          )}
          {props.featuredStreak && (
            <span className="small" style={{ color: "rgba(255,255,255,0.85)" }}>
              {props.featuredStreak.current} days in a row. Keep going!
            </span>
          )}
        </div>
      ) : (
        <div className="hero">
          <h2 style={{ color: "#fff" }}>New activities are coming soon</h2>
        </div>
      )}

      {props.friday && (
        <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "var(--c-jummah-bg)", borderColor: "transparent" }} onClick={() => props.onSub("jummah")}>
          <span className="icon-chip" style={{ background: "#2a3a6a", color: "#fff" }} aria-hidden="true">
            <MoonStar size={22} />
          </span>
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span>Jummah Mubarak</span>
            <span className="sub">{props.jummahDone} of {props.jummahTotal} Friday activities</span>
          </span>
          <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
        </button>
      )}

      <div className="grid2">
        <button className="tile tone-habit" onClick={() => props.onTab("checklist")}>
          <span className="icon-chip" aria-hidden="true">
            <ListChecks size={24} />
          </span>
          <span className="stack" style={{ gap: 6, width: "100%" }}>
            Today's checklist
            <ProgressBar value={props.total ? props.doneCount / props.total : 0} label="Today's checklist progress" />
            <span className="sub">{props.doneCount} of {props.total} done</span>
          </span>
        </button>
        <button className="tile tone-dua" onClick={() => props.onTab("stars")}>
          <span className="icon-chip" aria-hidden="true">
            <Trophy size={24} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            This week
            <span className="sub">{props.starsWeek} stars earned</span>
          </span>
        </button>
        <button className="tile tone-manners" onClick={() => props.onSub("duas")}>
          <span className="icon-chip" aria-hidden="true">
            <HandHeart size={24} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Dua Corner
            <span className="sub">Learn a dua</span>
          </span>
        </button>
        <button className="tile tone-quran" onClick={() => props.onTab("play")}>
          <span className="icon-chip" aria-hidden="true">
            <Puzzle size={24} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Play & Learn
            <span className="sub">Quiz and games</span>
          </span>
        </button>
        <button className="tile tone-salah" onClick={() => props.onSub("stories")}>
          <span className="icon-chip" aria-hidden="true">
            <Library size={24} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Stories
            <span className="sub">Prophet stories</span>
          </span>
        </button>
        <button className="tile tone-deed" onClick={() => props.onSub("surahs")}>
          <span className="icon-chip" aria-hidden="true">
            <BookOpen size={24} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            Short Surahs
            <span className="sub">Listen and repeat</span>
          </span>
        </button>
      </div>

      <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "#1b2547", borderColor: "#1b2547", color: "#eef1fb" }} onClick={() => props.onSub("bedtime")}>
        <span className="icon-chip" style={{ background: "#2a3563", color: "#f2c14e" }} aria-hidden="true">
          <Bed size={22} />
        </span>
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span>Bedtime</span>
          <span className="sub" style={{ color: "#b7c0dd" }}>A story and bedtime duas</span>
        </span>
        <ChevronRight size={20} color="#b7c0dd" aria-hidden="true" />
      </button>

      <ThemeCard dayKey={props.dayKey} activities={props.activities} completions={props.completions} onOpen={props.onOpen} />
    </div>
  );
}

function StatusBadge({ c }: { c?: Completion }) {
  if (!c) return null;
  if (c.status === "done") return <span className="status done"><Check size={14} aria-hidden="true" />Done</span>;
  if (c.status === "pending") return <span className="status pending">Waiting for grown-up</span>;
  if (c.status === "declined") return <span className="status declined">Try again</span>;
  return null;
}

function TaskRow({ a, c, streak, onOpen }: { a: Activity; c?: Completion; streak?: Streak; onOpen: (a: Activity) => void }) {
  const state = c?.status === "done" ? "done" : c?.status === "pending" ? "pending" : "";
  return (
    <button className="list-item" onClick={() => onOpen(a)}>
      <CategoryChip category={a.category} />
      <span className="stack" style={{ gap: 4, flex: 1 }}>
        <span className="strong" style={{ fontWeight: 650 }}>{displayTitle(a.title.en)}</span>
        {(a.together || streak || c) && (
          <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <StatusBadge c={c} />
            {streak && <StreakChip s={streak} />}
            {a.together && <TogetherTag />}
          </span>
        )}
      </span>
      <span className={`check-circle ${state}`} aria-hidden="true">
        {state === "done" && <Check size={16} strokeWidth={3} />}
        {state === "pending" && <Star size={15} strokeWidth={2.2} />}
      </span>
    </button>
  );
}

function ChecklistTab(props: {
  items: Activity[];
  completions: Record<string, Completion>;
  streaks: Record<string, Streak>;
  today: string;
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
            <TaskRow
              key={a.id}
              a={a}
              c={props.completions[a.id]}
              streak={isStreakActive(props.streaks[a.id], props.today) ? props.streaks[a.id] : undefined}
              onOpen={props.onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JummahScreen(props: {
  items: Activity[];
  completions: Record<string, Completion>;
  streaks: Record<string, Streak>;
  today: string;
  onOpen: (a: Activity) => void;
  onBack: () => void;
  story?: Story;
  onStory: (s: Story) => void;
}) {
  const done = props.items.filter((a) => props.completions[a.id]?.status === "done").length;
  const selfItems = props.items.filter((a) => a.verification === "self");
  const family = props.items.filter((a) => a.verification === "parent");
  const allDone = props.items.length > 0 && done === props.items.length;
  const row = (a: Activity) => (
    <TaskRow
      key={a.id}
      a={a}
      c={props.completions[a.id]}
      streak={isStreakActive(props.streaks[a.id], props.today) ? props.streaks[a.id] : undefined}
      onOpen={props.onOpen}
    />
  );
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
      {props.story && (
        <button className="tile" style={{ padding: 0, overflow: "hidden", gap: 0, minHeight: 0 }} onClick={() => props.onStory(props.story!)}>
          <Scene id={props.story.coverScene} />
          <span className="stack" style={{ gap: 2, padding: "10px 12px 12px" }}>
            <span className="eyebrow">This Friday's story</span>
            <span>{props.story.title}</span>
          </span>
        </button>
      )}
      <span className="section-title">I can do it</span>
      <div className="list">{selfItems.map(row)}</div>
      <span className="section-title">With a grown-up</span>
      <p className="small muted" style={{ marginTop: -8 }}>Learning activities. Grown-ups decide these together with you.</p>
      <div className="list">{family.map(row)}</div>
    </div>
  );
}

function TaskSheet(props: {
  activity: Activity;
  child: Child;
  completion?: Completion;
  streak?: Streak;
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
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow" style={{ color: s.fg }}>{s.label}{a.isPlaceholder ? " · sample" : ""}</span>
            <h2>{title}</h2>
            {(a.together || props.streak) && (
              <span className="row" style={{ gap: 6 }}>
                {a.together && <TogetherTag />}
                {props.streak && <StreakChip s={props.streak} />}
              </span>
            )}
          </div>
        </div>
        <p className="muted">{a.description.en}</p>
        <div className="notice calm">{a.educationalExplanation.en}</div>
        {props.streak && <Notice tone="calm">{props.streak.current} days in a row. Keep going!</Notice>}
        {problem && <Notice>Let's try again in a moment.</Notice>}
        {status === "done" && <Notice tone="calm">You already did this today. Great job!</Notice>}
        {status === "pending" && (
          <div className="notice calm" role="status">
            <Star size={18} color="var(--accent)" aria-hidden="true" style={{ marginTop: 1 }} />
            <span>Waiting for a grown-up. Your star is on its way.</span>
          </div>
        )}
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

function StarsTab(props: {
  stars: { total: number; today: number; week: number; month: number };
  streaks: Record<string, Streak>;
  activities: Activity[];
  today: string;
}) {
  const active = Object.values(props.streaks)
    .filter((s) => isStreakActive(s, props.today))
    .sort((a, b) => b.current - a.current);
  const titleOf = (id: string) => displayTitle(props.activities.find((a) => a.id === id)?.title.en ?? "Activity");
  const milestones = [
    { title: "First 10 stars", need: 10 },
    { title: "First 50 stars", need: 50 },
    { title: "First 100 stars", need: 100 },
  ];
  return (
    <div className="screen">
      <h1>My Stars</h1>
      <div className="hero stack" style={{ gap: 8 }}>
        <span className="faint small strong">This week</span>
        <h1 style={{ color: "#fff", fontSize: 26 }}>
          {props.stars.week > 0 ? `You earned ${props.stars.week} stars this week!` : "Your stars for this week will show here"}
        </h1>
        <span className="row small" style={{ gap: 6, color: "rgba(255,255,255,0.85)" }}>
          <Star size={16} fill="#f2c14e" color="#f2c14e" aria-hidden="true" /> Every little step counts
        </span>
      </div>

      {active.length > 0 && (
        <>
          <span className="section-title">Days in a row</span>
          <div className="list">
            {active.map((s) => (
              <div key={s.activityId} className="list-item" style={{ cursor: "default" }}>
                <span className="icon-chip" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden="true">
                  <CalendarCheck size={22} />
                </span>
                <span className="stack" style={{ gap: 2, flex: 1 }}>
                  <span className="strong">{titleOf(s.activityId)}</span>
                  <span className="small faint">{s.current} days in a row. Well done!</span>
                </span>
                <span className="metric-sm" style={{ fontSize: 22 }}>{s.current}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <span className="section-title">Milestones</span>
      <div className="list">
        {milestones.map((m) => {
          const got = props.stars.total >= m.need;
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
                <span className="faint small">{Math.max(0, m.need - props.stars.total)} to go</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="tiny faint">All time: {props.stars.total} stars. Sample milestones; the real list will come from the server.</p>
    </div>
  );
}

function ThemeSwitch() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  const options: { id: ThemePref; label: string }[] = [
    { id: "system", label: "Auto" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];
  return (
    <div className="card stack">
      <span className="eyebrow">Appearance</span>
      <div className="segmented" role="group" aria-label="Theme">
        {options.map((o) => (
          <button
            key={o.id}
            aria-pressed={pref === o.id}
            onClick={() => {
              setThemePref(o.id);
              setPref(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MeTab(props: {
  child: Child;
  onGrownUps: () => void;
  pendingCount: number;
  onDuas: () => void;
  onSurahs: () => void;
  simFriday: boolean;
  onSimFriday: (v: boolean) => void;
}) {
  const [simSeason, setSimSeason] = useState(() => localStorage.getItem(SIM_SEASON_KEY) ?? "");
  function changeSeason(v: string) {
    if (v) localStorage.setItem(SIM_SEASON_KEY, v);
    else localStorage.removeItem(SIM_SEASON_KEY);
    setSimSeason(v);
    window.location.reload();
  }
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
        <button className="list-item" onClick={props.onSurahs}>
          <CategoryChip category="quran" />
          <span className="title">My Surahs</span>
          <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
        </button>
      </div>
      <ThemeSwitch />
      {testerToolsEnabled && (
        <div className="card stack">
          <span className="eyebrow">Tester tools</span>
          <label className="row" style={{ cursor: "pointer" }}>
            <input type="checkbox" className="checkbox" checked={props.simFriday} onChange={(e) => props.onSimFriday(e.target.checked)} />
            <span>Pretend today is Friday (to test Jummah)</span>
          </label>
          <div className="field">
            <label htmlFor="simSeason">Pretend it is</label>
            <select id="simSeason" className="input" value={simSeason} onChange={(e) => changeSeason(e.target.value)}>
              <option value="">Normal day (real date)</option>
              {[1, 5, 15, 27, 30].map((d) => (
                <option key={d} value={`ramadan:${d}`}>Ramadan, day {d}</option>
              ))}
              <option value="eidFitr:1">Eid al-Fitr</option>
              <option value="eidAdha:1">Eid al-Adha</option>
            </select>
          </div>
        </div>
      )}
      <button className="btn btn-secondary btn-block" style={{ marginTop: "auto", position: "relative" }} onClick={props.onGrownUps}>
        <Lock size={18} aria-hidden="true" /> Parent area
        {props.pendingCount > 0 && (
          <span className="count-badge" aria-label={`${props.pendingCount} waiting for approval`}>{props.pendingCount}</span>
        )}
      </button>
    </div>
  );
}
