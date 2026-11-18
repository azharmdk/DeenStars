import { useMemo, useState } from "react";
import { PrintableDetail, PrintablesPage } from "../components/Printables";
import { useLibrary } from "../data";
import { navigate } from "../router";
import { safeStorage } from "../storage";
import { dayKeyFor } from "../time";
import { AgeGroup, guestChild, Story } from "../types";
import { Bedtime, DuaCorner, StoryLibrary, StoryReader, SurahLearning } from "./Learn";
import { SiteFrame } from "./Landing";
import { PlayTab } from "./Play";

/**
 * Public website pages. Each dua, surah, story and printable has its own shareable URL:
 * /duas/<slug>, /surahs/<slug>, /stories/<id>, /printables/<id>.
 * Learning pages reuse the app's screens with a "guest" child, so nothing is saved to the server
 * and no progress controls are shown. The age choice stays on this device only.
 */
const AGE_KEY = "ds_guest_age";
function readAge(): AgeGroup {
  const v = safeStorage.getItem(AGE_KEY);
  return v === "3-4" || v === "5" || v === "6" ? v : "5";
}

function AgeBar({ age, onAge }: { age: AgeGroup; onAge: (a: AgeGroup) => void }) {
  return (
    <div className="guest-age">
      <span className="small strong">Showing for age</span>
      <div className="segmented" role="group" aria-label="Child's age">
        {(["3-4", "5", "6"] as AgeGroup[]).map((g) => (
          <button key={g} aria-pressed={age === g} onClick={() => onAge(g)}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

export type Section = "duas" | "surahs" | "stories" | "bedtime" | "play" | "printables";

export function GuestLearn({ section, item, signedIn = false }: { section: Section; item?: string; signedIn?: boolean }) {
  const [age, setAgeState] = useState<AgeGroup>(readAge);
  const setAge = (a: AgeGroup) => {
    safeStorage.setItem(AGE_KEY, a);
    setAgeState(a);
  };
  const child = useMemo(() => guestChild(age), [age]);
  const stories = useLibrary<Story>("stories");
  const home = () => navigate("/");

  if (section === "bedtime") {
    return <Bedtime child={child} dayKey={dayKeyFor(new Date(), child.timeZone)} onExit={home} />;
  }
  if (section === "printables") {
    // Grown-up page: downloads, no partner content.
    return (
      <SiteFrame signedIn={signedIn}>
        <div className="guest-page">
          {item ? <PrintableDetail id={item} onBack={() => navigate("/printables")} /> : <PrintablesPage onBack={home} linkToPage />}
        </div>
      </SiteFrame>
    );
  }

  const openStory = (s: Story) => navigate(`/stories/${encodeURIComponent(s.id)}`);
  let body;
  if (section === "duas") body = <DuaCorner child={child} onBack={home} selected={item ?? null} onSelect={(slug) => navigate(slug ? `/duas/${slug}` : "/duas")} />;
  else if (section === "surahs") body = <SurahLearning child={child} onBack={home} selected={item ?? null} onSelect={(slug) => navigate(slug ? `/surahs/${slug}` : "/surahs")} />;
  else if (section === "stories" && item) {
    const story = stories.items?.find((s) => s.id === item);
    if (story) body = <StoryReader key={story.id} story={story} onBack={() => navigate("/stories")} />;
    else if (stories.items || stories.error) body = <StoryLibrary child={child} onBack={home} onOpen={openStory} />;
    else body = <p className="muted container">Loading…</p>;
  } else if (section === "stories")
    body = (
      <>
        <div className="container-narrow">
          <AgeBar age={age} onAge={setAge} />
        </div>
        <StoryLibrary child={child} onBack={home} onOpen={openStory} />
      </>
    );
  else
    body = (
      <>
        <div className="container-narrow">
          <AgeBar age={age} onAge={setAge} />
        </div>
        <PlayTab key={age} child={child} />
      </>
    );

  return (
    <SiteFrame kids signedIn={signedIn}>
      <div className="guest-page">{body}</div>
    </SiteFrame>
  );
}
