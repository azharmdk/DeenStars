import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, usingEmulators } from "./firebase";
import { useAuthUser, useChildren, useParentDoc } from "./data";
import { Loading, PrototypeBanner } from "./components/common";
import { Lock } from "lucide-react";
import { Avatar, BrandMark } from "./components/icons";
import { AuthScreen, ChildForm, ConsentScreen, SetPinScreen, Welcome } from "./screens/Onboarding";
import { ChildApp } from "./screens/ChildApp";
import { ParentApp, ParentGate, ParentPin } from "./screens/ParentApp";
import type { Child } from "./types";

type Mode =
  | { kind: "picker" }
  | { kind: "child"; childId: string }
  | { kind: "gate" }
  | { kind: "pin" }
  | { kind: "parent"; sessionId: string; expiresAt: number };

const LAST_CHILD_KEY = "ds_last_child";

export default function App() {
  return (
    <div className="app">
      <PrototypeBanner />
      {usingEmulators && <div className="proto-banner" style={{ background: "var(--accent-soft)" }}>Emulator mode</div>}
      <Root />
    </div>
  );
}

function Root() {
  const { user, ready } = useAuthUser();
  const [authMode, setAuthMode] = useState<null | "register" | "login">(null);

  if (!ready) return <Loading />;
  if (!user) {
    if (authMode) return <AuthScreen mode={authMode} onBack={() => setAuthMode(null)} />;
    return <Welcome onStart={setAuthMode} />;
  }
  return <SignedIn uid={user.uid} key={user.uid} />;
}

function SignedIn({ uid }: { uid: string }) {
  const parent = useParentDoc(uid);
  const { children, ready } = useChildren(uid);
  const [mode, setMode] = useState<Mode>(() => {
    const last = localStorage.getItem(LAST_CHILD_KEY);
    return last ? { kind: "child", childId: last } : { kind: "picker" };
  });

  // Parent session expires on the server. Drop it locally at the same time.
  useEffect(() => {
    if (mode.kind !== "parent") return;
    const ms = Math.max(0, mode.expiresAt - Date.now()) + 10 * 60_000; // server slides expiry on use
    const t = setTimeout(() => setMode({ kind: "picker" }), ms);
    return () => clearTimeout(t);
  }, [mode]);

  if (!parent.ready || !ready) return <Loading />;
  if (!parent.data?.consent?.version) return <ConsentScreen />;
  if (!parent.data?.pin?.hash) return <SetPinScreen />;
  if (children.length === 0) return <ChildForm first onDone={() => setMode({ kind: "picker" })} />;

  if (mode.kind === "child") {
    const child = children.find((c) => c.id === mode.childId);
    if (child) {
      return <ChildApp key={child.id} child={child} onGrownUps={() => setMode({ kind: "gate" })} />;
    }
  }
  if (mode.kind === "gate") {
    return <ParentGate onPass={() => setMode({ kind: "pin" })} onCancel={() => setMode({ kind: "picker" })} />;
  }
  if (mode.kind === "pin") {
    return (
      <ParentPin
        onSession={(sessionId, expiresAt) => setMode({ kind: "parent", sessionId, expiresAt })}
        onCancel={() => setMode({ kind: "picker" })}
      />
    );
  }
  if (mode.kind === "parent") {
    return (
      <ParentApp
        children={children}
        sessionId={mode.sessionId}
        onSessionExpired={() => setMode({ kind: "pin" })}
        onExit={() => setMode({ kind: "picker" })}
      />
    );
  }
  return (
    <Picker
      children={children}
      onPick={(c) => {
        localStorage.setItem(LAST_CHILD_KEY, c.id);
        setMode({ kind: "child", childId: c.id });
      }}
      onGrownUps={() => setMode({ kind: "gate" })}
    />
  );
}

function Picker({ children, onPick, onGrownUps }: { children: Child[]; onPick: (c: Child) => void; onGrownUps: () => void }) {
  return (
    <div className="screen no-tabs">
      <div className="stack center" style={{ gap: 12, marginTop: 16 }}>
        <BrandMark size={64} />
        <h1>Who is learning today?</h1>
      </div>
      <div className="grid2" style={{ marginTop: 8 }}>
        {children.map((c) => (
          <button
            key={c.id}
            className="tile"
            style={{ minHeight: 156, alignItems: "center", justifyContent: "center", gap: 12 }}
            onClick={() => onPick(c)}
          >
            <Avatar id={c.avatarId} size={72} />
            <span style={{ fontSize: 18 }}>{c.nickname}</span>
          </button>
        ))}
      </div>
      <div className="row between" style={{ marginTop: "auto" }}>
        <button className="btn btn-ghost" onClick={() => signOut(auth)}>
          Sign out
        </button>
        <button className="btn btn-secondary" onClick={onGrownUps}>
          <Lock size={16} aria-hidden="true" /> Parent area
        </button>
      </div>
    </div>
  );
}
