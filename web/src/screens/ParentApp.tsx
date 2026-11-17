import { useState } from "react";
import { signOut } from "firebase/auth";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "../firebase";
import { api, friendlyError } from "../api";
import {
  activitiesForChild,
  useActivities,
  useCompletionsForDay,
  usePendingApprovals,
  useStreaks,
  useWeekSummary,
} from "../data";
import { BackLink, ErrorBox, Notice, StarCount } from "../components/common";
import { PinPad } from "../components/PinPad";
import { Avatar, CategoryChip } from "../components/icons";
import { AgeGroup, Approval, Category, Child, Difficulty, DIFFICULTY_LABEL, displayTitle, isStreakActive } from "../types";
import { addDays, dayKeyFor, isFridayDayKey, relativeDayLabel } from "../time";
import { ChildForm } from "./Onboarding";
import { HijriSettingsCard, LearningConfirm } from "./ParentLearning";
import { useCompletionsBetween } from "./Seasonal";
import { Art, Banner, PageTitle, SectionHeader } from "../components/ui";

/** Parental gate: an adult reading-and-arithmetic check that young children can't easily pass. */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function makeGate() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const answer = a + b;
  const options = new Set([answer]);
  while (options.size < 4) options.add(answer + Math.floor(Math.random() * 9) - 4);
  return { a, b, answer, options: [...options].sort((x, y) => x - y) };
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [gate, setGate] = useState(makeGate);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="screen no-tabs">
      <BackLink onClick={onCancel} />
      <div className="stack center" style={{ gap: 12, marginTop: 24 }}>
        <Art name="lock" size={96} />
        <h1>For grown-ups</h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 320 }}>
          Tap the number that is <strong style={{ color: "var(--ink)" }}>{WORDS[gate.a]}</strong> plus{" "}
          <strong style={{ color: "var(--ink)" }}>{WORDS[gate.b]}</strong>.
        </p>
      </div>
      <div className="grid2" style={{ marginTop: 8 }}>
        {gate.options.map((n) => (
          <button
            key={n}
            className="btn btn-secondary btn-child"
            style={{ fontSize: 22 }}
            onClick={() => {
              if (n === gate.answer) onPass();
              else {
                setWrong(true);
                setGate(makeGate());
              }
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {wrong && <p className="muted small" style={{ textAlign: "center" }}>Not quite. Here's a new question.</p>}
    </div>
  );
}

export function ParentPin({ onSession, onCancel }: { onSession: (id: string, exp: number) => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(pin: string) {
    setBusy(true);
    setError(null);
    try {
      const s = await api.startParentSession(pin);
      onSession(s.sessionId, s.expiresAtMillis);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="screen no-tabs">
      <BackLink onClick={onCancel} />
      <div className="stack center" style={{ gap: 20, marginTop: 16 }}>
        <Art name="shield" size={72} />
        <h1>Enter your PIN</h1>
        <ErrorBox message={error} />
        <PinPad onComplete={submit} busy={busy} />
      </div>
    </div>
  );
}

type PTab = "overview" | "approvals" | "children" | "settings";

export function ParentApp(props: {
  children: Child[];
  sessionId: string;
  onSessionExpired: () => void;
  onExit: () => void;
}) {
  const [tab, setTab] = useState<PTab>("overview");
  const approvals = usePendingApprovals(props.children);
  const pendingCount = Object.values(approvals).reduce((n, list) => n + list.length, 0);

  async function guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if ((e as { code?: string })?.code?.includes("permission-denied")) props.onSessionExpired();
      throw e;
    }
  }

  const tabs = [
    { id: "overview" as PTab, Icon: LayoutDashboard, label: "Overview" },
    { id: "approvals" as PTab, Icon: ClipboardCheck, label: "Approvals" },
    { id: "children" as PTab, Icon: Users, label: "Children" },
    { id: "settings" as PTab, Icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <>
      <div className="parent-header">
        <span className="row" style={{ gap: 8 }}>
          <Art name="lock" size={24} />
          <span className="strong">Parent area</span>
        </span>
        <button className="btn btn-soft btn-sm" onClick={props.onExit}>
          Back to kids
        </button>
      </div>
      {tab === "overview" && <Overview children={props.children} approvals={approvals} onApprovals={() => setTab("approvals")} />}
      {tab === "approvals" && <Approvals children={props.children} approvals={approvals} sessionId={props.sessionId} guarded={guarded} />}
      {tab === "children" && <ChildrenAdmin children={props.children} sessionId={props.sessionId} guarded={guarded} />}
      {tab === "settings" && <Settings children={props.children} sessionId={props.sessionId} guarded={guarded} />}
      <nav className="tabbar" aria-label="Parent">
        {tabs.map(({ id, Icon, label }) => (
          <button key={id} className="tab" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <span className="tab-icon">
              <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} aria-hidden="true" />
            </span>
            {label}
            {id === "approvals" && pendingCount > 0 && (
              <span className="tab-badge" aria-label={`${pendingCount} waiting`}>{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

const CATEGORY_PHRASE: Partial<Record<Category, [string, string]>> = {
  goodDeed: ["good deed", "good deeds"],
  manners: ["act of good manners", "acts of good manners"],
  dailyHabit: ["daily habit", "daily habits"],
  salah: ["Salah activity", "Salah activities"],
  quran: ["Quran activity", "Quran activities"],
  dua: ["dua activity", "dua activities"],
  jummah: ["Jummah activity", "Jummah activities"],
};

/** In-app weekly report: positive framing, numbers from server-written rollups. */
function WeeklyReport({ child }: { child: Child }) {
  const today = dayKeyFor(new Date(), child.timeZone);
  const week = useWeekSummary(child, today);
  const streaks = useStreaks(child.id);
  const { activities } = useActivities();
  const active = Object.values(streaks).filter((s) => isStreakActive(s, today)).sort((a, b) => b.current - a.current);
  const best = active[0];
  const bestTitle = best ? displayTitle(activities?.find((a) => a.id === best.activityId)?.title.en ?? "an activity") : null;
  const parts = (Object.entries(week.byCategory) as [Category, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, n]) => `${n} ${CATEGORY_PHRASE[cat]?.[n === 1 ? 0 : 1] ?? "activities"}`);

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar id={child.avatarId} size={48} />
        <span className="stack" style={{ gap: 2, flex: 1 }}>
          <span className="strong">{child.nickname}</span>
          <span className="small faint">This week</span>
        </span>
        <StarCount n={week.stars} />
      </div>
      <WeekChart child={child} today={today} />
      {week.items === 0 ? (
        <p className="muted small">Nothing yet this week. A good moment to pick one small thing to do together.</p>
      ) : (
        <p style={{ fontSize: 15.5 }}>
          This week {child.nickname} did {parts.length ? parts.join(", ") : `${week.items} activities`}
          {` and was active on ${week.activeDays} ${week.activeDays === 1 ? "day" : "days"}.`}
        </p>
      )}
      {best && (
        <div className="row small" style={{ gap: 8, color: "var(--primary-strong)" }}>
          <CalendarCheck size={16} aria-hidden="true" />
          <span>
            {bestTitle}: {best.current} days in a row
          </span>
        </div>
      )}
    </div>
  );
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Activities done per day for the last 7 days. Neutral styling: an empty day is a plain short bar, never a warning. */
function WeekChart({ child, today }: { child: Child; today: string }) {
  const from = addDays(today, -6);
  const list = useCompletionsBetween(child.id, from, today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const counts = days.map((d) => list.filter((c) => c.status === "done" && (c as { dayKey?: string }).dayKey === d).length);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="chart" role="img" aria-label={`${total} activities done in the last 7 days`}>
      {days.map((d, i) => {
        const [y, m, dd] = d.split("-").map(Number);
        const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
        return (
          <div key={d} className="bar-col" title={`${wd}: ${counts[i]}`}>
            <div className={`bar${counts[i] === 0 ? " zero" : ""}${d === today ? " today" : ""}`} style={{ height: `${Math.max(8, (counts[i] / max) * 88)}%` }} />
            <span className="day">{d === today ? "Today" : wd}</span>
          </div>
        );
      })}
    </div>
  );
}

function Overview({ children, approvals, onApprovals }: { children: Child[]; approvals: Record<string, Approval[]>; onApprovals: () => void }) {
  const pending = Object.values(approvals).reduce((n, l) => n + l.length, 0);
  return (
    <div className="screen">
      <PageTitle title="Overview" art="sparkles" />
      {pending > 0 && (
        <Banner tone="gold" art="clipboard" wide badge="To check" title={`${pending} ${pending === 1 ? "activity" : "activities"}`} sub="Review and approve" onClick={onApprovals} />
      )}
      <SectionHeader title="This week" />
      {children.map((c) => (
        <WeeklyReport key={c.id} child={c} />
      ))}
    </div>
  );
}

function Approvals(props: {
  children: Child[];
  approvals: Record<string, Approval[]>;
  sessionId: string;
  guarded: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Optional "Did you do this together?" prompt, shown on about 1 in 5 approvals. Never blocks.
  const [ask, setAsk] = useState<{ approval: Approval; childName: string } | null>(null);

  const childById = Object.fromEntries(props.children.map((c) => [c.id, c]));
  const today = dayKeyFor(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);

  async function decide(a: Approval, decision: "approve" | "decline", allowPrompt = true) {
    setBusy(a.id + a.childId);
    setError(null);
    setInfo(null);
    try {
      const res = await props.guarded(() => api.decideApproval(a.childId, a.id, decision, props.sessionId));
      if (res.status === "expired") setInfo("That one had expired, so it was cleared without a star.");
      if (res.status === "approved" && !res.duplicate && allowPrompt && Math.random() < 0.2) {
        setAsk({ approval: a, childName: childById[a.childId]?.nickname ?? "your child" });
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function approveGroup(list: Approval[]) {
    for (const a of list) {
      await decide(a, "approve", false);
    }
  }

  function answerTogether(together: boolean) {
    const a = ask?.approval;
    setAsk(null);
    if (!a) return;
    // Fire and forget: the answer is optional and must never get in the way.
    api.recordTogether(a.childId, a.id, together, props.sessionId).catch(() => undefined);
  }

  // Group by day (newest first), then by request time.
  const all = Object.values(props.approvals).flat();
  const days = Array.from(new Set(all.map((a) => a.dayKey))).sort().reverse();
  const timeOf = (a: Approval) =>
    a.requestedAt ? new Date(a.requestedAt.toMillis()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="screen">
      <PageTitle title="Approvals" art="clipboard" />
      <ErrorBox message={error} />
      {info && <Notice tone="calm">{info}</Notice>}
      {ask && (
        <div className="card stack" style={{ gap: 10, borderColor: "transparent", background: "var(--primary-soft)" }} role="status">
          <span className="strong">Did you do this together with {ask.childName}?</span>
          <span className="small muted">Optional. It helps us suggest more family activities.</span>
          <div className="row">
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => answerTogether(false)}>
              Not this time
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => answerTogether(true)}>
              Yes
            </button>
          </div>
        </div>
      )}
      {days.length > 0 && (
        <p className="small faint">Items you don't get to stay here until the end of the next day.</p>
      )}
      {days.map((day) => {
        const list = all
          .filter((a) => a.dayKey === day)
          .sort((x, y) => (y.requestedAt?.toMillis() ?? 0) - (x.requestedAt?.toMillis() ?? 0));
        return (
          <div key={day} className="stack" style={{ gap: 10 }}>
            <div className="row between">
              <span className="section-title" style={{ margin: 0 }}>{relativeDayLabel(day, today)}</span>
              {list.length > 1 && (
                <button className="btn btn-soft btn-sm" onClick={() => approveGroup(list)} disabled={!!busy}>
                  Approve all
                </button>
              )}
            </div>
            {list.map((a) => {
              const c = childById[a.childId];
              return (
                <div key={a.childId + a.id} className="card stack" style={{ gap: 12 }}>
                  <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                    {c && <Avatar id={c.avatarId} size={36} />}
                    <span className="stack" style={{ gap: 2, flex: 1 }}>
                      <span className="strong">{displayTitle(a.activityTitleSnapshot?.en ?? "")}</span>
                      <span className="small faint">
                        {c?.nickname}
                        {timeOf(a) ? ` · ${timeOf(a)}` : ""}
                      </span>
                    </span>
                    <StarCount n={a.stars} size={16} />
                  </div>
                  <div className="row">
                    <button className="btn btn-secondary" style={{ flex: 1 }} disabled={busy === a.id + a.childId} onClick={() => decide(a, "decline")}>
                      Not yet
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy === a.id + a.childId} onClick={() => decide(a, "approve")}>
                      Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {days.length === 0 && (
        <div className="card stack center" style={{ padding: 32, gap: 8 }}>
          <Art name="check" size={72} />
          <h3>All caught up</h3>
          <p className="muted small">Activities your children ask you to check will appear here.</p>
        </div>
      )}
    </div>
  );
}

function ChildrenAdmin(props: { children: Child[]; sessionId: string; guarded: <T>(fn: () => Promise<T>) => Promise<T> }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  if (adding) return <ChildForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />;
  if (editing) return <EditChild child={editing} sessionId={props.sessionId} guarded={props.guarded} onDone={() => setEditing(null)} />;
  return (
    <div className="screen">
      <PageTitle title="Children" art="sparkling-heart" />
      <div className="list">
        {props.children.map((c) => (
          <button key={c.id} className="list-item" onClick={() => setEditing(c)}>
            <Avatar id={c.avatarId} size={44} />
            <span className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="strong">{c.nickname}</span>
              <span className="small faint">Age {c.ageGroup} · {DIFFICULTY_LABEL[c.difficulty]}</span>
            </span>
            <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
        <UserPlus size={18} aria-hidden="true" /> Add a child
      </button>
    </div>
  );
}

/**
 * Make-up: a parent can mark yesterday's activities as done, for days when the app wasn't opened.
 * Only yesterday. Keeps streaks going. The server checks the parent session and awards once.
 */
function MakeUpYesterday(props: { child: Child; sessionId: string; guarded: <T>(fn: () => Promise<T>) => Promise<T> }) {
  const c = props.child;
  const yesterday = addDays(dayKeyFor(new Date(), c.timeZone), -1);
  const { activities } = useActivities();
  const done = useCompletionsForDay(c.id, yesterday);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const items = activities ? activitiesForChild(activities, c, isFridayDayKey(yesterday)) : [];
  const missed = items.filter((a) => done[a.id]?.status !== "done");

  async function mark(activityId: string) {
    setBusy(activityId);
    setError(null);
    try {
      await props.guarded(() => api.makeUpActivity(c.id, activityId, props.sessionId));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <span className="stack" style={{ gap: 2 }}>
        <h3>Missed yesterday?</h3>
        <span className="small muted">Mark what {c.nickname} did yesterday. It keeps their days in a row going.</span>
      </span>
      {!open ? (
        <button className="btn btn-soft btn-block" onClick={() => setOpen(true)}>
          Show yesterday's activities
        </button>
      ) : missed.length === 0 ? (
        <Notice tone="calm">Everything from yesterday is already marked.</Notice>
      ) : (
        <div className="list">
          {missed.map((a) => (
            <div key={a.id} className="list-item" style={{ cursor: "default" }}>
              <CategoryChip category={a.category} size={36} />
              <span className="title">{displayTitle(a.title.en)}</span>
              <button className="btn btn-soft btn-sm" disabled={busy === a.id} onClick={() => mark(a.id)}>
                {busy === a.id ? "Saving…" : "Mark done"}
              </button>
            </div>
          ))}
        </div>
      )}
      <ErrorBox message={error} />
    </div>
  );
}

function EditChild(props: { child: Child; sessionId: string; guarded: <T>(fn: () => Promise<T>) => Promise<T>; onDone: () => void }) {
  const c = props.child;
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(c.ageGroup);
  const [difficulty, setDifficulty] = useState<Difficulty>(c.difficulty);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await props.guarded(() => api.updateChildProfile({ childId: c.id, parentSessionId: props.sessionId, ageGroup, difficulty }));
      props.onDone();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await props.guarded(() => api.deleteChildProfile(c.id, props.sessionId));
      props.onDone();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <BackLink onClick={props.onDone} label="Children" />
      <div className="row" style={{ gap: 14 }}>
        <Avatar id={c.avatarId} size={56} />
        <h1>{c.nickname}</h1>
      </div>
      <div className="field">
        <span className="label">Age group</span>
        <div className="segmented" role="group" aria-label="Age group">
          {(["3-4", "5", "6"] as AgeGroup[]).map((g) => (
            <button key={g} aria-pressed={ageGroup === g} onClick={() => setAgeGroup(g)}>Age {g}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Difficulty</span>
        <div className="segmented" role="group" aria-label="Difficulty">
          {(["gentle", "standard", "challenge"] as Difficulty[]).map((d) => (
            <button key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy} onClick={save}>Save changes</button>

      <MakeUpYesterday child={c} sessionId={props.sessionId} guarded={props.guarded} />
      <LearningConfirm child={c} sessionId={props.sessionId} guarded={props.guarded} />

      <div className="card stack" style={{ marginTop: 16, borderColor: "var(--danger-soft)" }}>
        <h3>Delete this profile</h3>
        <p className="small muted">This permanently removes {c.nickname}'s profile, stars and progress. It can't be undone.</p>
        <div className="field">
          <label htmlFor="confirm">Type the nickname to confirm</label>
          <input id="confirm" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn btn-danger btn-block" disabled={busy || confirm.trim() !== c.nickname} onClick={remove}>
          Delete profile
        </button>
      </div>
    </div>
  );
}

function Settings(props: { children: Child[]; sessionId: string; guarded: <T>(fn: () => Promise<T>) => Promise<T> }) {
  return (
    <div className="screen">
      <PageTitle title="Settings" art="shield" />
      <span className="section-title">Account</span>
      <div className="list">
        <div className="list-item" style={{ cursor: "default" }}>
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span className="small faint">Signed in as</span>
            <span className="strong">{auth.currentUser?.email}</span>
          </span>
        </div>
        <button className="list-item" onClick={() => signOut(auth)} style={{ color: "var(--danger)" }}>
          <LogOut size={20} aria-hidden="true" />
          <span className="title">Sign out</span>
        </button>
      </div>
      <HijriSettingsCard children={props.children} sessionId={props.sessionId} guarded={props.guarded} />
      <Notice tone="calm">Notifications, leaderboard opt-in, data export and account deletion will come in later builds.</Notice>
    </div>
  );
}
