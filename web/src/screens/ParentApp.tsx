import { useState } from "react";
import { signOut } from "firebase/auth";
import { Check, ChevronRight, ClipboardCheck, LayoutDashboard, Lock, LogOut, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import { auth } from "../firebase";
import { api, friendlyError } from "../api";
import { usePendingApprovals } from "../data";
import { BackLink, ErrorBox, Notice, StarCount } from "../components/common";
import { PinPad } from "../components/PinPad";
import { Avatar } from "../components/icons";
import { AgeGroup, Approval, Child, Difficulty, DIFFICULTY_LABEL, displayTitle } from "../types";
import { ChildForm } from "./Onboarding";

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
        <span className="icon-chip lg" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden="true">
          <Lock size={26} />
        </span>
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
          <Lock size={16} color="var(--primary)" aria-hidden="true" />
          <span className="strong">Parent area</span>
        </span>
        <button className="btn btn-soft btn-sm" onClick={props.onExit}>
          Back to kids
        </button>
      </div>
      {tab === "overview" && <Overview children={props.children} approvals={approvals} onApprovals={() => setTab("approvals")} />}
      {tab === "approvals" && <Approvals children={props.children} approvals={approvals} sessionId={props.sessionId} guarded={guarded} />}
      {tab === "children" && <ChildrenAdmin children={props.children} sessionId={props.sessionId} guarded={guarded} />}
      {tab === "settings" && <Settings />}
      <nav className="tabbar" aria-label="Parent">
        {tabs.map(({ id, Icon, label }) => (
          <button key={id} className="tab" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} aria-hidden="true" />
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

function Overview({ children, approvals, onApprovals }: { children: Child[]; approvals: Record<string, Approval[]>; onApprovals: () => void }) {
  const pending = Object.values(approvals).reduce((n, l) => n + l.length, 0);
  return (
    <div className="screen">
      <h1>Overview</h1>
      {pending > 0 && (
        <button className="tile" style={{ minHeight: 0, flexDirection: "row", alignItems: "center", background: "var(--accent-soft)", borderColor: "#f0dfb5" }} onClick={onApprovals}>
          <span className="icon-chip" style={{ background: "#fff", color: "var(--accent)" }} aria-hidden="true">
            <ClipboardCheck size={22} />
          </span>
          <span className="stack" style={{ gap: 2, flex: 1 }}>
            <span>{pending} {pending === 1 ? "activity" : "activities"} to check</span>
            <span className="sub">Review and approve</span>
          </span>
          <ChevronRight size={20} color="var(--ink-3)" aria-hidden="true" />
        </button>
      )}
      <span className="section-title">Children</span>
      <div className="list">
        {children.map((c) => (
          <div key={c.id} className="list-item" style={{ cursor: "default" }}>
            <Avatar id={c.avatarId} size={44} />
            <span className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="strong">{c.nickname}</span>
              <span className="small faint">Age {c.ageGroup} · {DIFFICULTY_LABEL[c.difficulty]}</span>
            </span>
            <StarCount n={c.totals?.stars ?? 0} />
          </div>
        ))}
      </div>
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

  async function decide(a: Approval, decision: "approve" | "decline") {
    setBusy(a.id + a.childId);
    setError(null);
    try {
      await props.guarded(() => api.decideApproval(a.childId, a.id, decision, props.sessionId));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function approveAll(child: Child) {
    for (const a of props.approvals[child.id] ?? []) {
      await decide(a, "approve");
    }
  }

  const any = props.children.some((c) => (props.approvals[c.id]?.length ?? 0) > 0);
  return (
    <div className="screen">
      <h1>Approvals</h1>
      <ErrorBox message={error} />
      {!any && (
        <div className="card stack center" style={{ padding: 32, gap: 8 }}>
          <span className="icon-chip lg" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden="true">
            <Check size={28} />
          </span>
          <h3>All caught up</h3>
          <p className="muted small">Activities your children ask you to check will appear here.</p>
        </div>
      )}
      {props.children.map((c) => {
        const list = props.approvals[c.id] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={c.id} className="stack" style={{ gap: 10 }}>
            <div className="row between">
              <span className="row" style={{ gap: 10 }}>
                <Avatar id={c.avatarId} size={32} />
                <h3>{c.nickname}</h3>
              </span>
              {list.length > 1 && (
                <button className="btn btn-soft btn-sm" onClick={() => approveAll(c)} disabled={!!busy}>
                  Approve all
                </button>
              )}
            </div>
            {list.map((a) => (
              <div key={a.id} className="card stack" style={{ gap: 12 }}>
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <span className="stack" style={{ gap: 2 }}>
                    <span className="strong">{displayTitle(a.activityTitleSnapshot?.en ?? "")}</span>
                    <span className="small faint">{a.dayKey}</span>
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
            ))}
          </div>
        );
      })}
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
      <h1>Children</h1>
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

      <div className="card stack" style={{ marginTop: 16, borderColor: "#efd3cd" }}>
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

function Settings() {
  return (
    <div className="screen">
      <h1>Settings</h1>
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
      <Notice tone="calm">Notifications, leaderboard opt-in, data export and account deletion will come in later builds.</Notice>
    </div>
  );
}
