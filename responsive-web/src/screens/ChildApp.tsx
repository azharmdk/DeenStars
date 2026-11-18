import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, ChevronRight, HandHeart, House, ListChecks, Play, Puzzle, Sparkles, Star, User, Users } from "lucide-react";
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
import { BackLink, Busy, Celebration, Notice, Sheet, useLock } from "../components/common";
import { Shell } from "../components/Shell";
import { BadgeGrid, DayStreakCard, StarHistory } from "../components/progress";
import { PrintablesGrid } from "../components/Printables";
import { FilterBar } from "../components/FilterBar";
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
import { safeStorage } from "../storage";
import { Art, Banner, PageTitle, Rail, SectionHeader } from "../components/ui";

type Tab = "home" | "checklist" | "play" | "stars" | "me";
type Sub = null | "jummah" | "duas" | "surahs" | "stories" | "story" | "bedtime" | "ramadan" | "eid" | "printables";

const SIM_FRIDAY_KEY = "ds_sim_friday";

export function ChildApp({ child, onGrownUps, pendingCount }: { child: Child; onGrownUps: () => void; pendingCount: number }) {
  const [tab, setTab] = useState<Tab>("home");
  const [sub, setSub] = useState<Sub>(null);
  const [simFriday, setSimFriday] = useState(() => testerToolsEnabled && safeStorage.getItem(SIM_FRIDAY_KEY) === "1");
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
      if (safeStorage.getItem(key)) continue;
      safeStorage.setItem(key, "1");
      const a = activities?.find((x) => x.id === s.activityId);
      setCelebrate({ text: `${s.current} days in a row${a ? `: ${displayTitle(a.title.en)}` : ""}!` });
      break;
    }
  }, [streaks, dayKey, child.id, activities]);

  function toggleSimFriday(v: boolean) {
    safeStorage.setItem(SIM_FRIDAY_KEY, v ? "1" : "0");
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
  } else if (sub === "printables") {
    // Child-safe: pictures and names only. Downloads are in the parent area.
    body = (
      <div className="screen">
        <BackLink onClick={() => setSub(null)} />
        <h1>Printables</h1>
        <p className="muted">Ask a grown-up to print one for you.</p>
        <PrintablesGrid mode="list" />
      </div>
    );
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
        daily={daily}
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
    body = <PlayTab child={child} />;
  } else if (tab === "stars") {
    body = <StarsTab childId={child.id} stars={stars} streaks={streaks} activities={activities ?? []} today={dayKey} />;
  } else {
    body = (
      <MeTab
        child={child}
        onGrownUps={onGrownUps}
        pendingCount={pendingCount}
        onDuas={() => setSub("duas")}
        onSurahs={() => setSub("surahs")}
        onStories={() => setSub("stories")}
        onBedtime={() => setSub("bedtime")}
        simFriday={simFriday}
        onSimFriday={toggleSimFriday}
      />
    );
  }

  return (
    <Shell
      title={TAB_LABEL[tab]}
      nav={
        <TabBar
          tab={sub ? null : tab}
          onTab={(t) => {
            setSub(null);
            setTab(t);
          }}
        />
      }
      overlays={
        <>
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
      }
    >
      {body}
    </Shell>
  );
}

const TAB_LABEL: Record<Tab, string> = { home: "Home", checklist: "Checklist", play: "Play", stars: "Stars", me: "Me" };

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
  daily: Activity[];
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
  const f = props.featured;
  const fStatus = props.featuredCompletion?.status;
  const fStyle = f ? CATEGORY_STYLE[f.category] : undefined;
  // Not-yet-done first, so the rail starts with something to do. Done items stay visible and celebrated.
  const rail = [...props.daily].sort((a, b) => Number(props.completions[a.id]?.status === "done") - Number(props.completions[b.id]?.status === "done"));
  return (
    <div className="screen">
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <Avatar id={props.child.avatarId} size={52} />
          <div className="stack" style={{ gap: 0 }}>
            <span className="faint small strong">{greetingForHour(props.hour)}</span>
            <h2>Assalamu Alaikum, {props.child.nickname}</h2>
          </div>
        </div>
        <button className="pill-gold" style={{ cursor: "pointer" }} onClick={() => props.onTab("stars")} aria-label={`${props.starsWeek} stars this week. Open My Stars`}>
          <Art name="glowing-star" size={24} />
          {props.starsWeek}
        </button>
      </div>

      <SeasonCard
        season={props.season}
        daysToRamadan={props.seasonInfo.daysToRamadan}
        hijri={props.seasonInfo.hijri}
        onOpen={(s) => props.onSub(s === "ramadan" ? "ramadan" : "eid")}
      />

      {f && fStyle ? (
        <div className={`banner hero-banner g-${fStyle.tone}`} style={{ cursor: "default" }}>
          <span className="banner-text">
            <span className="banner-badge">Today's deed</span>
            <span className="banner-title">{displayTitle(f.title.en)}</span>
            {f.together && <span className="banner-sub">Do it together with a grown-up</span>}
            {props.featuredStreak && <span className="banner-sub">{props.featuredStreak.current} days in a row. Keep going!</span>}
            {fStatus === "done" ? (
              <span className="row" style={{ gap: 8, fontWeight: 800, marginTop: 10 }}>
                <Check size={20} strokeWidth={3} aria-hidden="true" /> Done today. Well done!
              </span>
            ) : fStatus === "pending" ? (
              <span className="row" style={{ gap: 8, fontWeight: 800, marginTop: 10 }}>
                <Star size={18} fill="currentColor" aria-hidden="true" /> Waiting for a grown-up
              </span>
            ) : (
              <button className="btn btn-white" onClick={() => props.onOpen(f)}>
                <Play size={18} fill="currentColor" aria-hidden="true" /> Let's do it
              </button>
            )}
          </span>
          <Art name={fStyle.art} size={128} className="banner-art" />
        </div>
      ) : (
        <Banner tone="green" art="sparkles" title="New activities are coming soon" wide />
      )}

      {props.friday && (
        <Banner tone="night" art="mosque" title="Jummah Mubarak" sub={`${props.jummahDone} of ${props.jummahTotal} Friday activities`} wide onClick={() => props.onSub("jummah")} />
      )}

      {rail.length > 0 && (
        <>
          <SectionHeader title={`Today · ${props.doneCount} of ${props.total}`} onMore={() => props.onTab("checklist")} moreLabel="Open today's checklist" />
          <Rail label="Today's activities">
            {rail.map((a) => {
              const s = CATEGORY_STYLE[a.category];
              const st = props.completions[a.id]?.status;
              return (
                <button key={a.id} role="listitem" className="rail-card" onClick={() => props.onOpen(a)}>
                  <span className="rail-art" style={{ background: s.bg }}>
                    <Art name={s.art} size={72} />
                    {st === "done" && <span className="rail-done" aria-label="Done"><Check size={16} strokeWidth={3} /></span>}
                    {st === "pending" && <span className="rail-done rail-wait" aria-label="Waiting for a grown-up"><Star size={14} fill="currentColor" /></span>}
                  </span>
                  <span className="rail-body">
                    <span className="rail-title">{displayTitle(a.title.en)}</span>
                    <span className="rail-sub">{s.label}</span>
                  </span>
                </button>
              );
            })}
          </Rail>
        </>
      )}

      <SectionHeader title="Explore" />
      <div className="grid2">
        <Banner tone="gold" art="palms-up" title="Dua Corner" sub="Learn a dua" onClick={() => props.onSub("duas")} />
        <Banner tone="purple" art="books" title="Stories" sub="Prophet stories" onClick={() => props.onSub("stories")} />
        <Banner tone="teal" art="book" title="Short Surahs" sub="Listen and repeat" onClick={() => props.onSub("surahs")} />
        <Banner tone="blue" art="puzzle" title="Play & Learn" sub="Quiz and games" onClick={() => props.onTab("play")} />
      </div>
      <Banner tone="night" art="night" title="Bedtime" sub="A story and bedtime duas" wide onClick={() => props.onSub("bedtime")} />
      <Banner tone="orange" art="clipboard" title="Printables" sub="Charts to colour in" wide onClick={() => props.onSub("printables")} />

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
      <PageTitle title="Today" />
      <div className="banner wide g-green" style={{ cursor: "default", minHeight: 0 }}>
        <span className="banner-text" style={{ gap: 10, maxWidth: "64%" }}>
          <span className="banner-title">{done} of {props.items.length} done</span>
          <span className="progress" style={{ background: "rgba(255,255,255,0.25)" }}>
            <span
              style={{ display: "block", height: "100%", borderRadius: 999, background: "#ffd65c", width: `${props.items.length ? (done / props.items.length) * 100 : 0}%` }}
              role="progressbar"
              aria-label="Checklist progress"
              aria-valuenow={Math.round(props.items.length ? (done / props.items.length) * 100 : 0)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </span>
          <span className="banner-sub">Every little step counts</span>
        </span>
        <Art name="seedling" size={96} className="banner-art" />
      </div>
      {props.friday && <Banner tone="night" art="mosque" title="Jummah checklist" sub="Friday activities" wide onClick={props.onJummah} />}
      <FilterBar label="Show" summary={cat === "all" ? "All" : CATEGORY_STYLE[cat].label}>
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
      </FilterBar>
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
          <Art name="mosque" size={72} />
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
          <Art name="medal" size={56} />
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

  const lock = useLock();
  const complete = () =>
    lock(async () => {
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
    });

  return (
    <Sheet onClose={props.onClose} label={title}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="feature-panel" style={{ backgroundColor: s.bg, color: s.fg }} aria-hidden="true">
          <Art name={s.art} size={112} />
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
              <Busy />
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
  childId: string;
  stars: { total: number; today: number; week: number; month: number };
  streaks: Record<string, Streak>;
  activities: Activity[];
  today: string;
}) {
  const active = Object.values(props.streaks)
    .filter((s) => isStreakActive(s, props.today))
    .sort((a, b) => b.current - a.current);
  const titleOf = (id: string) => displayTitle(props.activities.find((a) => a.id === id)?.title.en ?? "Activity");
  return (
    <div className="screen">
      <PageTitle title="My Stars" />
      <Banner
        tone="gold"
        art="trophy"
        wide
        badge="This week"
        title={props.stars.week > 0 ? `You earned ${props.stars.week} stars!` : "Your stars will show here"}
        sub="Every little step counts"
      />
      <DayStreakCard childId={props.childId} today={props.today} />
      <div className="stat-row">
        <div className="stat"><Art name="glowing-star" size={32} /><b>{props.stars.today}</b><span>Today</span></div>
        <div className="stat"><Art name="calendar" size={32} /><b>{props.stars.month}</b><span>This month</span></div>
        <div className="stat"><Art name="sparkles" size={32} /><b>{props.stars.total}</b><span>All time</span></div>
      </div>

      {active.length > 0 && (
        <>
          <SectionHeader title="Days in a row" />
          <div className="list">
            {active.map((s) => (
              <div key={s.activityId} className="list-item" style={{ cursor: "default" }}>
                <span className="art-chip" style={{ background: "var(--primary-soft)", width: 48, height: 48, borderRadius: 15 }} aria-hidden="true">
                  <Art name="calendar" size={32} />
                </span>
                <span className="stack" style={{ gap: 2, flex: 1 }}>
                  <span className="strong">{titleOf(s.activityId)}</span>
                  <span className="small faint">{s.current} days in a row. Well done!</span>
                </span>
                <span className="metric-sm" style={{ fontSize: 24 }}>{s.current}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Badges" />
      <BadgeGrid childId={props.childId} totalStars={props.stars.total} />

      <SectionHeader title="How I earned my stars" />
      <StarHistory childId={props.childId} today={props.today} activities={props.activities} />
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
      <span className="row" style={{ gap: 8 }}>
        <Art name={pref === "dark" ? "moon" : "sun"} size={24} />
        <span className="strong">Appearance</span>
      </span>
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
  onStories: () => void;
  onBedtime: () => void;
  simFriday: boolean;
  onSimFriday: (v: boolean) => void;
}) {
  const [simSeason, setSimSeason] = useState(() => safeStorage.getItem(SIM_SEASON_KEY) ?? "");
  function changeSeason(v: string) {
    if (v) safeStorage.setItem(SIM_SEASON_KEY, v);
    else safeStorage.removeItem(SIM_SEASON_KEY);
    setSimSeason(v);
    window.location.reload();
  }
  return (
    <div className="screen">
      <div className="profile-head">
        <Avatar id={props.child.avatarId} size={104} ring />
        <h1>{props.child.nickname}</h1>
        <span className="band-pill">Age group {props.child.ageGroup}</span>
      </div>
      <div className="action-grid">
        <button className="action" onClick={props.onDuas}><Art name="palms-up" size={34} />My Duas</button>
        <button className="action" onClick={props.onSurahs}><Art name="book" size={34} />My Surahs</button>
        <button className="action" onClick={props.onStories}><Art name="books" size={34} />Stories</button>
        <button className="action" onClick={props.onBedtime}><Art name="bed" size={34} />Bedtime</button>
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
      <button className="list-item card" style={{ marginTop: "auto", minHeight: 64 }} onClick={props.onGrownUps}>
        <Art name="lock" size={32} />
        <span className="title">Parent area</span>
        {props.pendingCount > 0 && (
          <span className="count-badge" aria-label={`${props.pendingCount} waiting for approval`}>{props.pendingCount}</span>
        )}
        <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
      </button>
    </div>
  );
}
