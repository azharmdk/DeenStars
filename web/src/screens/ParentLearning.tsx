import { useState } from "react";
import { Award, Check, Printer } from "lucide-react";
import { api, friendlyError } from "../api";
import { useLearnedItems, useLearningProgress, useLibrary, useParentHijriSettings, useConfig } from "../data";
import { BrandMark } from "../components/icons";
import { ErrorBox, Notice } from "../components/common";
import { Child, Dua, LEARN_LABEL, Surah } from "../types";
import { COUNTRY_NAMES, countryForTimeZone, formatHijri, hijriForDayKey, totalAdjust } from "../hijri";
import { dayKeyFor } from "../time";

type Guarded = <T>(fn: () => Promise<T>) => Promise<T>;

/** Parent confirms when a child knows a dua or Surah by heart. Stars are awarded once by the server. */
export function LearningConfirm({ child, sessionId, guarded }: { child: Child; sessionId: string; guarded: Guarded }) {
  const duas = useLibrary<Dua>("duaLibrary").items ?? [];
  const surahs = useLibrary<Surah>("surahLibrary").items ?? [];
  const duaProgress = useLearningProgress(child.id, "dua");
  const surahProgress = useLearningProgress(child.id, "surah");
  const learned = useLearnedItems(child.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<{ title: string; dayKey?: string } | null>(null);

  const inProgress = [
    ...duas.filter((d) => duaProgress[d.id] === "learning" || duaProgress[d.id] === "practising").map((d) => ({ kind: "dua" as const, id: d.id, title: d.title, state: duaProgress[d.id] })),
    ...surahs.filter((s) => surahProgress[s.id] === "learning" || surahProgress[s.id] === "practising").map((s) => ({ kind: "surah" as const, id: s.id, title: `Surah ${s.nameTransliterated}`, state: surahProgress[s.id] })),
  ];
  const titleOf = (kind: "dua" | "surah", id: string) =>
    kind === "dua" ? duas.find((d) => d.id === id)?.title ?? "A dua" : `Surah ${surahs.find((s) => s.id === id)?.nameTransliterated ?? ""}`;

  async function confirm(kind: "dua" | "surah", itemId: string) {
    setBusy(itemId);
    setError(null);
    try {
      await guarded(() => api.updateLearningProgress({ childId: child.id, kind, itemId, state: "learned", parentSessionId: sessionId }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  if (cert) return <Certificate child={child} title={cert.title} dayKey={cert.dayKey} onClose={() => setCert(null)} />;

  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <h3>Duas and Surahs</h3>
      {inProgress.length === 0 && learned.length === 0 && (
        <p className="small muted">When {child.nickname} starts learning a dua or Surah, it appears here so you can confirm it.</p>
      )}
      {inProgress.length > 0 && (
        <div className="list">
          {inProgress.map((i) => (
            <div key={i.id} className="list-item" style={{ cursor: "default" }}>
              <span className="stack" style={{ gap: 2, flex: 1 }}>
                <span className="strong">{i.title}</span>
                <span className="small faint">{LEARN_LABEL[i.state]}</span>
              </span>
              <button className="btn btn-soft btn-sm" disabled={busy === i.id} onClick={() => confirm(i.kind, i.id)}>
                {busy === i.id ? "Saving…" : "Knows it by heart"}
              </button>
            </div>
          ))}
        </div>
      )}
      {learned.length > 0 && (
        <>
          <span className="section-title" style={{ margin: 0 }}>Learned</span>
          <div className="list">
            {learned.map((l) => (
              <div key={l.kind + l.itemId} className="list-item" style={{ cursor: "default" }}>
                <span className="check-circle done" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                <span className="title">{titleOf(l.kind, l.itemId)}</span>
                <button className="btn btn-soft btn-sm" onClick={() => setCert({ title: titleOf(l.kind, l.itemId), dayKey: l.learnedDayKey })}>
                  <Award size={16} aria-hidden="true" /> Certificate
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <ErrorBox message={error} />
    </div>
  );
}

function Certificate({ child, title, dayKey, onClose }: { child: Child; title: string; dayKey?: string; onClose: () => void }) {
  const date = dayKey ? new Date(`${dayKey}T12:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <div className="stack" style={{ marginTop: 16 }}>
      <div className="certificate printable">
        <BrandMark size={72} />
        <span className="eyebrow">DeenStars certificate</span>
        <h1 style={{ fontSize: 30 }}>Masha Allah, {child.nickname}!</h1>
        <p style={{ fontSize: 18 }}>has learned</p>
        <h2 style={{ color: "var(--c-jummah)" }}>{title}</h2>
        {date && <p className="muted">{date}</p>}
        <p className="small muted">Keep learning, little star.</p>
      </div>
      <div className="row no-print">
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" /> Print
        </button>
      </div>
    </div>
  );
}

const COUNTRIES = Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

/** Region and one-day adjustment for Ramadan and Eid dates. No location data is used. */
export function HijriSettingsCard({ children, sessionId, guarded }: { children: Child[]; sessionId: string; guarded: Guarded }) {
  const settings = useParentHijriSettings();
  const config = useConfig<{ defaultAdjust: number; adjustByCountry: Record<string, number> }>("hijri");
  const tz = children[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const auto = countryForTimeZone(tz);
  const country = settings.country || auto;
  const adjust = settings.adjust ?? 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = dayKeyFor(new Date(), tz);
  const hijri = hijriForDayKey(today, totalAdjust(config, country, adjust));

  async function save(input: { hijriCountry?: string; hijriAdjust?: number }) {
    setBusy(true);
    setError(null);
    try {
      await guarded(() => api.updateParentSettings({ parentSessionId: sessionId, ...input }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h3>Ramadan and Eid dates</h3>
      <p className="small muted">
        Dates follow your region's moon sighting. We work out the region from the time zone ({tz}), never from your location.
      </p>
      <div className="field">
        <label htmlFor="hijriCountry">Region</label>
        <select id="hijriCountry" className="input" disabled={busy} value={settings.country ? country : "auto"} onChange={(e) => save({ hijriCountry: e.target.value })}>
          <option value="auto">Automatic ({COUNTRY_NAMES[auto] ?? auto})</option>
          {COUNTRIES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <span className="label">Our masjid's date</span>
        <div className="segmented" role="group" aria-label="Date adjustment">
          {[
            [-1, "One day later"],
            [0, "Same"],
            [1, "One day earlier"],
          ].map(([v, label]) => (
            <button key={v} disabled={busy} aria-pressed={adjust === v} onClick={() => save({ hijriAdjust: v as number })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Notice tone="calm">Today is {formatHijri(hijri)} for your family.</Notice>
      <ErrorBox message={error} />
    </div>
  );
}
