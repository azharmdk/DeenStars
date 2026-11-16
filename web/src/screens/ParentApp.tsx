import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { api, friendlyError } from "../api";
import { usePendingApprovals } from "../data";
import { ErrorBox } from "../components/common";
import { PinPad } from "../components/PinPad";
import { AgeGroup, Approval, avatarEmoji, Child, Difficulty } from "../types";
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
    <div className="screen no-tabs center">
      <h1>Grown-ups only</h1>
      <p>Please read and answer:</p>
      <p className="card" style={{ fontSize: 20 }}>
        Touch the number that is <strong>{WORDS[gate.a]}</strong> plus <strong>{WORDS[gate.b]}</strong>.
      </p>
      <div className="grid2" style={{ width: "100%" }}>
        {gate.options.map((n) => (
          <button
            key={n}
            className="btn btn-secondary btn-child"
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
      {wrong && <p className="muted">Not quite. Here is a new question.</p>}
      <button className="btn btn-ghost" onClick={onCancel}>Back</button>
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
    <div className="screen no-tabs center">
      <h1>Enter your PIN</h1>
      <ErrorBox message={error} />
      <PinPad onComplete={submit} busy={busy} />
      <button className="btn btn-ghost" onClick={onCancel}>Back</button>
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

  const tabs: { id: PTab; icon: string; label: string }[] = [
    { id: "overview", icon: "ðŸ“Š", label: "Overview" },
    { id: "approvals", icon: "âœ…", label: "Approvals" },
    { id: "children", icon: "ðŸ‘§", label: "Children" },
    { id: "settings", icon: "âš™ï¸", label: "Settings" },
  ];

  return (
    <>
      <div className="parent-top">
        <strong>Parent area</strong>
        <button className="btn btn-secondary" onClick={props.onExit}>Exit to kids</button>
      </div>
      {tab === "overview" && <Overview children={props.children} approvals={approvals} onApprovals={() => setTab("approvals")} />}
      {tab === "approvals" && (
        <Approvals children={props.children} approvals={approvals} sessionId={props.sessionId} guarded={guarded} />
      )}
      {tab === "children" && <ChildrenAdmin children={props.children} sessionId={props.sessionId} guarded={guarded} />}
      {tab === "settings" && <Settings />}
      <nav className="tabbar" aria-label="Parent">
        {tabs.map((t) => (
          <button key={t.id} className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            <span className="icon" aria-hidden="true">{t.icon}</span>
            <span>
              {t.label}
              {t.id === "approvals" && pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}

function Overview({ children, approvals, onApprovals }: { children: Child[]; approvals: Record<string, Approval[]>; onApprovals: () => void }) {
  return (
    <div className="screen">
      <h1>Today</h1>
      {children.map((c) => (
        <div key={c.id} className="card row">
          <span style={{ fontSize: 36 }} aria-hidden="true">{avatarEmoji(c.avatarId)}</span>
          <div className="stack" style={{ gap: 2, flex: 1 }}>
            <h3>{c.nickname}</h3>
            <span className="small muted">Age group {c.ageGroup} Â· {c.difficulty}</span>
          </div>
          <div className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
            <span>â­ {c.totals?.stars ?? 0}</span>
            {(approvals[c.id]?.length ?? 0) > 0 && (
              <button className="status pending" style={{ border: "none", cursor: "pointer" }} onClick={onApprovals}>
                â³ {approvals[c.id].length} to check
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="gentle-box small">Weekly and monthly reports will come in a later build.</div>
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
      {!any && <div className="gentle-box">Nothing waiting. ðŸŒ¿</div>}
      {props.children.map((c) => {
        const list = props.approvals[c.id] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={c.id} className="stack">
            <div className="row between">
              <h3>{avatarEmoji(c.avatarId)} {c.nickname}</h3>
              {list.length > 1 && (
                <button className="btn btn-secondary" style={{ minHeight: 40, fontSize: 15 }} onClick={() => approveAll(c)} disabled={!!busy}>
                  Approve all
                </button>
              )}
            </div>
            {list.map((a) => (
              <div key={a.id} className="card stack">
                <div className="row between">
                  <strong>{a.activityTitleSnapshot?.en}</strong>
                  <span className="small">â­ {a.stars}</span>
                </div>
                <span className="small muted">{a.dayKey}</span>
                <div className="row">
                  <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy === a.id + a.childId} onClick={() => decide(a, "decline")}>
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
      {props.children.map((c) => (
        <button key={c.id} className="task" onClick={() => setEditing(c)}>
          <span className="pic" style={{ background: "var(--mint)" }} aria-hidden="true">{avatarEmoji(c.avatarId)}</span>
          <span className="title">{c.nickname}</span>
          <span className="small muted">Age {c.ageGroup} â€º</span>
        </button>
      ))}
      <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
        + Add a child
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
      <button className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={props.onDone}>â† Back</button>
      <h1>{avatarEmoji(c.avatarId)} {c.nickname}</h1>
      <div className="field">
        <label>Age group</label>
        <div className="chips">
          {(["3-4", "5", "6"] as AgeGroup[]).map((g) => (
            <button key={g} className="chip" aria-pressed={ageGroup === g} onClick={() => setAgeGroup(g)}>Age {g}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Difficulty</label>
        <div className="chips">
          {(["gentle", "standard", "challenge"] as Difficulty[]).map((d) => (
            <button key={d} className="chip" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy} onClick={save}>Save changes</button>

      <div className="card stack" style={{ marginTop: 24 }}>
        <h3>Delete this profile</h3>
        <p className="small muted">This permanently removes {c.nickname}'s profile, stars and progress. It cannot be undone.</p>
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
      <div className="card stack">
        <h3>Account</h3>
        <p className="small muted">{auth.currentUser?.email}</p>
        <button className="btn btn-secondary btn-block" onClick={() => signOut(auth)}>Sign out</button>
      </div>
      <div className="gentle-box small">
        Notifications, leaderboard opt-in, data export and account deletion will come in later builds.
      </div>
    </div>
  );
}
