import { FormEvent, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { api, friendlyError } from "../api";
import { Mascot } from "../components/Mascot";
import { ErrorBox } from "../components/common";
import { PinPad } from "../components/PinPad";
import { AVATARS, AgeGroup, Difficulty } from "../types";

export const CONSENT_VERSION = "proto-2025-1";

export function Welcome({ onStart }: { onStart: (mode: "register" | "login") => void }) {
  return (
    <div className="screen no-tabs center">
      <Mascot size={150} />
      <h1 style={{ color: "var(--emerald-deep)" }}>DeenStars</h1>
      <p className="muted">Little Steps. Beautiful Habits. Brighter Hearts.</p>
      <div className="stack" style={{ width: "100%", marginTop: 24 }}>
        <button className="btn btn-primary btn-block" onClick={() => onStart("register")}>
          Get started
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => onStart("login")}>
          I already have an account
        </button>
      </div>
    </div>
  );
}

function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use") return "An account with this email already exists. Try signing in.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/weak-password") return "Please choose a stronger password (at least 10 characters).";
  if (code === "auth/too-many-requests") return "Too many tries. Please wait a few minutes.";
  if (code === "auth/network-request-failed") return "You seem to be offline. Please try again.";
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed")
    return "Sign-up is not switched on for this test app yet. Please tell the app team.";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(code))
    return "Email or password is not right.";
  if (code.startsWith("auth/")) return `Something went wrong (${code}). Please try again.`;
  return friendlyError(e);
}

export function AuthScreen({ mode, onBack }: { mode: "register" | "login"; onBack: () => void }) {
  const [current, setCurrent] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (current === "register" && password.length < 10) {
      setError("Please use at least 10 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      if (current === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        sendEmailVerification(cred.user).catch(() => undefined);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // Neutral response either way, to avoid revealing which emails have accounts.
    }
    setInfo("If an account exists for this email, a reset link is on its way.");
  }

  return (
    <form className="screen no-tabs" onSubmit={submit}>
      <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={onBack}>
        â† Back
      </button>
      <h1>{current === "register" ? "Create a parent account" : "Welcome back"}</h1>
      <p className="muted">For parents and guardians. Children do not need their own account.</p>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={current === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {current === "register" && <span className="small muted">At least 10 characters.</span>}
      </div>
      <ErrorBox message={error} />
      {info && <div className="gentle-box" role="status">{info}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Please waitâ€¦" : current === "register" ? "Create account" : "Sign in"}
      </button>
      {current === "login" && (
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Forgot password?
        </button>
      )}
      <button type="button" className="btn btn-ghost" onClick={() => setCurrent(current === "register" ? "login" : "register")}>
        {current === "register" ? "I already have an account" : "Create a new account"}
      </button>
      <p className="small muted">Sign in with Apple will be available in the iOS app.</p>
    </form>
  );
}

export function ConsentScreen() {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    if (!checked) {
      setError("Please tick the box to confirm you are the parent or legal guardian.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.recordConsent(CONSENT_VERSION);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const items = [
    { icon: "ðŸ“‹", title: "What we collect", text: "Your email, and for each child a nickname, birth month and year, avatar, and learning progress." },
    { icon: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§", title: "Who can see it", text: "Only you. Children's details are never public." },
    { icon: "ðŸš«", title: "What we never do", text: "No ads, no chat between children, no location, no selling data." },
    { icon: "ðŸ—‘ï¸", title: "Your control", text: "You can delete a child's profile and all of its data at any time." },
  ];

  return (
    <div className="screen no-tabs">
      <h1>Your child's privacy</h1>
      <p className="muted">Please read this before adding a child.</p>
      {items.map((i) => (
        <div className="card row" key={i.title} style={{ alignItems: "flex-start" }}>
          <span style={{ fontSize: 28 }} aria-hidden="true">{i.icon}</span>
          <div className="stack" style={{ gap: 2 }}>
            <h3>{i.title}</h3>
            <p className="muted">{i.text}</p>
          </div>
        </div>
      ))}
      <div className="gentle-box small">
        Prototype note: this is a test build. Please use made-up nicknames only, not your child's real name.
      </div>
      <label className="row" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            setError(null);
          }}
          style={{ width: 26, height: 26 }}
        />
        <span>I am the parent or legal guardian of the children I will add.</span>
      </label>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy} onClick={agree}>
        {busy ? "Saving…" : "Agree and continue"}
      </button>
      <button className="btn btn-ghost" onClick={() => signOut(auth)}>
        Sign out
      </button>
    </div>
  );
}

export function SetPinScreen() {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onComplete(pin: string) {
    setError(null);
    if (!first) {
      setFirst(pin);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError("The PINs did not match. Let's try again.");
      return;
    }
    setBusy(true);
    try {
      await api.setParentPin(pin);
    } catch (e) {
      setError(friendlyError(e));
      setFirst(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen no-tabs center">
      <h1>{first ? "Enter the PIN again" : "Set a parent PIN"}</h1>
      <p className="muted">You'll use this 4-digit PIN to open the grown-ups area and approve activities.</p>
      <ErrorBox message={error} />
      <PinPad key={first ? "confirm" : "first"} onComplete={onComplete} busy={busy} />
    </div>
  );
}

const thisYear = new Date().getFullYear();

function suggestAgeGroup(year: number, month: number): AgeGroup {
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) age -= 1;
  if (age <= 4) return "3-4";
  if (age === 5) return "5";
  return "6";
}

export function ChildForm({ onDone, onCancel, first }: { onDone: () => void; onCancel?: () => void; first?: boolean }) {
  const [nickname, setNickname] = useState("");
  const [birthYear, setBirthYear] = useState(thisYear - 5);
  const [birthMonth, setBirthMonth] = useState(1);
  const [avatarId, setAvatarId] = useState("star");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(suggestAgeGroup(thisYear - 5, 1));
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBirth(y: number, m: number) {
    setBirthYear(y);
    setBirthMonth(m);
    setAgeGroup(suggestAgeGroup(y, m));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Please add a nickname.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createChildProfile({
        nickname: nickname.trim(),
        birthYear,
        birthMonth,
        avatarId,
        ageGroup,
        difficulty,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <form className="screen no-tabs" onSubmit={save}>
      {onCancel && (
        <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={onCancel}>
          â† Back
        </button>
      )}
      <h1>{first ? "Add your first child" : "Add a child"}</h1>
      <div className="field">
        <label htmlFor="nick">Nickname</label>
        <input id="nick" className="input" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Little Star" />
        <span className="small muted">Only you and your child see this. Please use a made-up name while testing.</span>
      </div>
      <div className="field">
        <label>Birth month and year</label>
        <div className="row">
          <select className="input" aria-label="Birth month" value={birthMonth} onChange={(e) => setBirth(birthYear, Number(e.target.value))}>
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="input" aria-label="Birth year" value={birthYear} onChange={(e) => setBirth(Number(e.target.value), birthMonth)}>
            {Array.from({ length: 9 }, (_, i) => thisYear - 2 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Avatar</label>
        <div className="chips">
          {AVATARS.map((a) => (
            <button type="button" key={a.id} className="chip avatar-pick" aria-pressed={avatarId === a.id} aria-label={a.label} onClick={() => setAvatarId(a.id)}>
              {a.emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Age group</label>
        <div className="chips">
          {(["3-4", "5", "6"] as AgeGroup[]).map((g) => (
            <button type="button" key={g} className="chip" aria-pressed={ageGroup === g} onClick={() => setAgeGroup(g)}>
              Age {g}
            </button>
          ))}
        </div>
        <span className="small muted">Suggested from age. You can change it any time.</span>
      </div>
      <div className="field">
        <label>Difficulty</label>
        <div className="chips">
          {(["gentle", "standard", "challenge"] as Difficulty[]).map((d) => (
            <button type="button" key={d} className="chip" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Savingâ€¦" : "Save and continue"}
      </button>
    </form>
  );
}
