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
import { BackLink, Busy, ErrorBox, Notice } from "../components/common";
import { PinPad } from "../components/PinPad";
import { AVATAR_STYLES, Avatar } from "../components/icons";
import { AgeGroup, Difficulty, DIFFICULTY_LABEL } from "../types";
import { Art, ArtName } from "../components/ui";

export const CONSENT_VERSION = "web-2025-2";

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
      <BackLink onClick={onBack} />
      <div className="stack" style={{ gap: 6 }}>
        <h1>{current === "register" ? "Create a parent account" : "Welcome back"}</h1>
        <p className="muted">For parents and guardians. Children don't need their own account.</p>
      </div>
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
        {current === "register" && <span className="tiny faint">At least 10 characters.</span>}
      </div>
      <ErrorBox message={error} />
      {info && <Notice>{info}</Notice>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? <Busy label="Please wait…" /> : current === "register" ? "Create account" : "Sign in"}
      </button>
      {current === "login" && (
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Forgot password?
        </button>
      )}
      <button type="button" className="btn btn-ghost" onClick={() => setCurrent(current === "register" ? "login" : "register")}>
        {current === "register" ? "I already have an account" : "Create a new account"}
      </button>
      <p className="tiny faint" style={{ textAlign: "center" }}>Sign in with Apple will be available in the iOS app.</p>
    </form>
  );
}

/** Plain-language privacy points. Shown on the consent screen and on the public landing page. */
export const PRIVACY_ITEMS: { art: ArtName; title: string; text: string }[] = [
    { art: "clipboard" as ArtName, title: "What we collect", text: "Your email, and for each child a nickname, birth month and year, avatar and learning progress." },
    { art: "shield" as ArtName, title: "Who can see it", text: "Only you. Children's details are never public." },
    { art: "eyes" as ArtName, title: "What we never do", text: "No ads shown to children, no chat between children, no location tracking, no selling data. Parents may see links from our brand partners in grown-up areas only." },
    { art: "wastebasket" as ArtName, title: "You're in control", text: "Delete a child's profile and all of its data at any time." },
  ];

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


  return (
    <div className="screen no-tabs">
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">Step 1 of 3</span>
        <h1>Your child's privacy</h1>
        <p className="muted">Please read this before adding a child.</p>
      </div>
      <div className="list">
        {PRIVACY_ITEMS.map(({ art, title, text }) => (
          <div className="list-item" key={title} style={{ cursor: "default", alignItems: "flex-start" }}>
            <span className="art-chip" style={{ background: "var(--primary-soft)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true">
              <Art name={art} size={34} />
            </span>
            <div className="stack" style={{ gap: 2 }}>
              <h3>{title}</h3>
              <p className="muted small">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <Notice tone="calm">This is a test build. Please use made-up nicknames, not your child's real name.</Notice>
      <label className="row card" style={{ cursor: "pointer", alignItems: "flex-start" }}>
        <input
          type="checkbox"
          className="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            setError(null);
          }}
        />
        <span>I am the parent or legal guardian of the children I will add.</span>
      </label>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy} onClick={agree}>
        {busy ? <Busy /> : "Agree and continue"}
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
    <div className="screen no-tabs center" style={{ gap: 20 }}>
      <Art name="lock" size={80} />
      <span className="eyebrow">Step 2 of 3</span>
      <h1>{first ? "Confirm your PIN" : "Set a parent PIN"}</h1>
      <p className="muted" style={{ maxWidth: 330 }}>
        You'll use this 4-digit PIN to open the parent area and approve activities.
      </p>
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

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return (
    <form className="screen no-tabs" onSubmit={save}>
      {onCancel && <BackLink onClick={onCancel} />}
      <div className="stack" style={{ gap: 6 }}>
        {first && <span className="eyebrow">Step 3 of 3</span>}
        <h1>{first ? "Add your first child" : "Add a child"}</h1>
      </div>
      <div className="field">
        <label htmlFor="nick">Nickname</label>
        <input id="nick" className="input" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Little Star" />
        <span className="tiny faint">Only you and your child see this. Please use a made-up name while testing.</span>
      </div>
      <div className="field">
        <span className="label">Birth month and year</span>
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
        <span className="label">Avatar</span>
        <div className="avatar-grid">
          {AVATAR_STYLES.map((a) => (
            <button type="button" key={a.id} className="avatar-option" aria-pressed={avatarId === a.id} aria-label={a.label} onClick={() => setAvatarId(a.id)}>
              <Avatar id={a.id} size={56} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Age group</span>
        <div className="segmented" role="group" aria-label="Age group">
          {(["3-4", "5", "6"] as AgeGroup[]).map((g) => (
            <button type="button" key={g} aria-pressed={ageGroup === g} onClick={() => setAgeGroup(g)}>
              Age {g}
            </button>
          ))}
        </div>
        <span className="tiny faint">Suggested from the birth date. You can change it any time.</span>
      </div>
      <div className="field">
        <span className="label">Difficulty</span>
        <div className="segmented" role="group" aria-label="Difficulty">
          {(["gentle", "standard", "challenge"] as Difficulty[]).map((d) => (
            <button type="button" key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? <Busy /> : "Save and continue"}
      </button>
    </form>
  );
}
