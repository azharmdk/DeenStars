import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, usingEmulators } from "./firebase";
import { useAuthUser, useChildren, useParentDoc, usePendingApprovals } from "./data";
import { Loading, PrototypeBanner } from "./components/common";
import { Lock } from "lucide-react";
import { Avatar, BrandMark } from "./components/icons";
import { AuthScreen, ChildForm, ConsentScreen, SetPinScreen } from "./screens/Onboarding";
import { Landing, SiteFrame } from "./screens/Landing";
import { GuestLearn } from "./screens/GuestLearn";
import { navigate, usePath } from "./router";
import { ChildApp } from "./screens/ChildApp";
import { ParentApp, ParentGate, ParentPin } from "./screens/ParentApp";
import type { Child } from "./types";
import { safeStorage } from "./storage";

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
  const path = usePath();

  // After signing in, leave /signin and /register behind. Shared content links stay where they are.
  useEffect(() => {
    if (user && (path.startsWith("/signin") || path.startsWith("/register"))) navigate("/", { replace: true });
  }, [user, path]);

  if (!ready) return <Loading />;
  // A link from Instagram or WhatsApp opens its page for everyone, signed in or not.
  if (!user || isContentPath(path)) return <PublicSite path={path} signedIn={!!user} />;
  return <SignedIn uid={user.uid} key={user.uid} />;
}

const CONTENT_SECTIONS = ["duas", "surahs", "stories", "bedtime", "play", "printables"] as const;
type Section = (typeof CONTENT_SECTIONS)[number];

function isContentPath(path: string): boolean {
  const first = path.split("/").filter(Boolean)[0];
  return (CONTENT_SECTIONS as readonly string[]).includes(first ?? "");
}

/** Signed-out website. Learning pages are open to everyone; an account is needed to save progress. */
function PublicSite({ path, signedIn }: { path: string; signedIn: boolean }) {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const [first] = parts;
  // Everything after the section is the item, so "/duas/category/morning" gives "category/morning".
  const rest = parts.slice(1).map(decodeURIComponent).join("/");
  const item = rest || undefined;
  if (!signedIn && (first === "signin" || first === "register")) {
    return (
      <SiteFrame>
        <AuthScreen mode={first === "signin" ? "login" : "register"} onBack={() => navigate("/")} />
      </SiteFrame>
    );
  }
  if ((CONTENT_SECTIONS as readonly string[]).includes(first ?? "")) {
    return <GuestLearn section={first as Section} item={item} signedIn={signedIn} />;
  }
  return <Landing />;
}
function SignedIn({ uid }: { uid: string }) {
  const parent = useParentDoc(uid);
  const { children, ready } = useChildren(uid);
  const pending = usePendingApprovals(children);
  const pendingCount = Object.values(pending).reduce((n, l) => n + l.length, 0);
  const [mode, setMode] = useState<Mode>(() => {
    const last = safeStorage.getItem(LAST_CHILD_KEY);
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
      return <ChildApp key={child.id} child={child} pendingCount={pendingCount} onGrownUps={() => setMode({ kind: "gate" })} />;
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
        safeStorage.setItem(LAST_CHILD_KEY, c.id);
        setMode({ kind: "child", childId: c.id });
      }}
      onGrownUps={() => setMode({ kind: "gate" })}
      pendingCount={pendingCount}
    />
  );
}

function Picker({
  children,
  onPick,
  onGrownUps,
  pendingCount,
}: {
  children: Child[];
  onPick: (c: Child) => void;
  onGrownUps: () => void;
  pendingCount: number;
}) {
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
            <Avatar id={c.avatarId} size={96} ring />
            <span style={{ fontSize: 19, fontWeight: 800 }}>{c.nickname}</span>
          </button>
        ))}
      </div>
      <div className="row between" style={{ marginTop: "auto" }}>
        <button className="btn btn-ghost" onClick={() => signOut(auth)}>
          Sign out
        </button>
        <button className="btn btn-secondary" onClick={onGrownUps}>
          <Lock size={16} aria-hidden="true" /> Parent area
          {pendingCount > 0 && (
            <span className="count-badge" aria-label={`${pendingCount} waiting for approval`}>{pendingCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}
