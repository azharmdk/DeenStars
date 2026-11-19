import { useMemo } from "react";
import { PrintableDetail, PrintablesPage } from "../components/Printables";
import { useLibrary } from "../data";
import { navigate } from "../router";
import { dayKeyFor } from "../time";
import { guestChild, Story } from "../types";
import { Bedtime, DuaCorner, StoryLibrary, StoryReader, SurahLearning } from "./Learn";
import { SiteFrame } from "./Landing";
import { PlayTab } from "./Play";

/**
 * Public website pages. Each dua, surah, story and printable has its own shareable URL:
 * /duas/<slug>, /duas/category/<group>, /surahs/<slug>, /stories/<id>, /stories/category/<group>,
 * /printables/<id>. The bedtime routine is /stories/category/bedtime/routine.
 * Learning pages reuse the app's screens with a "guest" child, so nothing is saved to the server
 * and no progress controls are shown. There is no age choice: pages are the same for everyone.
 */
export type Section = "duas" | "surahs" | "stories" | "play" | "printables";

const GUEST_AGE = "5" as const;
const BEDTIME_ROUTINE = "category/bedtime/routine";

export function GuestLearn({ section, item, signedIn = false }: { section: Section; item?: string; signedIn?: boolean }) {
  const child = useMemo(() => guestChild(GUEST_AGE), []);
  const stories = useLibrary<Story>("stories");
  const home = () => navigate("/");

  if (section === "stories" && item === BEDTIME_ROUTINE) {
    // Calm full-screen wind-down, no site header.
    return <Bedtime child={child} dayKey={dayKeyFor(new Date(), child.timeZone)} onExit={() => navigate("/stories/category/bedtime")} />;
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
  const library = (
    <StoryLibrary
      child={child}
      onBack={home}
      onOpen={openStory}
      selected={item?.startsWith("category/") ? item : null}
      onSelect={(sel) => navigate(sel ? `/stories/${sel}` : "/stories")}
      onRoutine={() => navigate(`/stories/${BEDTIME_ROUTINE}`)}
    />
  );
  let body;
  if (section === "duas") body = <DuaCorner child={child} onBack={home} selected={item ?? null} onSelect={(slug) => navigate(slug ? `/duas/${slug}` : "/duas")} />;
  else if (section === "surahs") body = <SurahLearning child={child} onBack={home} selected={item ?? null} onSelect={(slug) => navigate(slug ? `/surahs/${slug}` : "/surahs")} />;
  else if (section === "stories" && item && !item.startsWith("category/")) {
    const story = stories.items?.find((s) => s.id === item);
    if (story) body = <StoryReader key={story.id} story={story} onBack={() => navigate("/stories")} />;
    else if (stories.items || stories.error) body = library;
    else body = <p className="muted container">Loading…</p>;
  } else if (section === "stories") body = library;
  else body = <PlayTab child={child} />;

  return (
    <SiteFrame kids signedIn={signedIn}>
      <div className="guest-page">{body}</div>
    </SiteFrame>
  );
}
