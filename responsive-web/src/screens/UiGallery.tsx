import { Check, House, ListChecks, Play, Puzzle, Star, User } from "lucide-react";
import { Avatar, CATEGORY_STYLE } from "../components/icons";
import { Art, Banner, PageTitle, Rail, SectionHeader } from "../components/ui";
import type { Category } from "../types";

/** Dev-only visual QA page for the v0.3 components: /?gallery=ui (add &theme=dark). Sample labels only. */
export function UiGallery() {
  const cats = Object.keys(CATEGORY_STYLE) as Category[];
  return (
    <div className="app">
      <div className="screen">
        <div className="row between">
          <div className="row" style={{ gap: 12 }}>
            <Avatar id="cat" size={52} />
            <div className="stack" style={{ gap: 0 }}>
              <span className="faint small strong">Good morning</span>
              <h2>Assalamu Alaikum, Sample</h2>
            </div>
          </div>
          <span className="pill-gold"><Art name="glowing-star" size={24} />18</span>
        </div>
        <div className="banner hero-banner g-green">
          <span className="banner-text">
            <span className="banner-badge">Today's deed</span>
            <span className="banner-title">Sample deed title</span>
            <span className="banner-sub">Do it together with a grown-up</span>
            <span className="btn btn-white"><Play size={18} fill="currentColor" /> Let's do it</span>
          </span>
          <Art name="seedling" size={128} className="banner-art" />
        </div>
        <SectionHeader title="Today · 2 of 6" onMore={() => undefined} />
        <Rail label="Today">
          {cats.map((c, i) => {
            const s = CATEGORY_STYLE[c];
            return (
              <button key={c} className="rail-card">
                <span className="rail-art" style={{ background: s.bg }}>
                  <Art name={s.art} size={72} />
                  {i < 2 && <span className="rail-done"><Check size={16} strokeWidth={3} /></span>}
                </span>
                <span className="rail-body"><span className="rail-title">Sample {s.label}</span><span className="rail-sub">{s.label}</span></span>
              </button>
            );
          })}
        </Rail>
        <SectionHeader title="Explore" />
        <div className="grid2">
          <Banner tone="gold" art="palms-up" title="Dua Corner" sub="Learn a dua" onClick={() => undefined} />
          <Banner tone="purple" art="books" title="Stories" sub="Prophet stories" onClick={() => undefined} />
          <Banner tone="teal" art="book" title="Short Surahs" sub="Listen and repeat" onClick={() => undefined} />
          <Banner tone="blue" art="puzzle" title="Play & Learn" sub="Quiz and games" onClick={() => undefined} />
        </div>
        <Banner tone="night" art="night" title="Bedtime" sub="A story and bedtime duas" wide onClick={() => undefined} />
        <PageTitle title="My Stars" />
        <div className="stat-row">
          <div className="stat"><Art name="glowing-star" size={32} /><b>4</b><span>Today</span></div>
          <div className="stat"><Art name="calendar" size={32} /><b>60</b><span>This month</span></div>
          <div className="stat"><Art name="sparkles" size={32} /><b>120</b><span>All time</span></div>
        </div>
        <div className="badge-grid">
          <div className="badge-card"><Art name="star" size={52} />First 10<span className="status done">Earned</span></div>
          <div className="badge-card"><Art name="medal" size={52} />First 50<span className="status done">Earned</span></div>
          <div className="badge-card dim"><Art name="trophy" size={52} />First 100<span className="faint">20 to go</span></div>
        </div>
        <div className="grid2">
          <Banner tone="pink" art="cards" title="Story Sequence" sub="Coming soon" locked />
          <Banner tone="orange" art="party" title="Eid Mubarak!" sub="Eid activities" onClick={() => undefined} />
        </div>
        <div className="card stack">
          <span className="strong">Weekly chart</span>
          <div className="chart">
            {[3, 5, 0, 2, 6, 4, 1].map((n, i) => (
              <div key={i} className="bar-col">
                <div className={`bar${n === 0 ? " zero" : ""}${i === 6 ? " today" : ""}`} style={{ height: `${Math.max(8, (n / 6) * 88)}%` }} />
                <span className="day">{["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Today"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <nav className="tabbar">
        {[House, ListChecks, Puzzle, Star, User].map((I, i) => (
          <button key={i} className="tab" aria-current={i === 0 ? "page" : undefined}>
            <span className="tab-icon"><I size={24} /></span>
            {["Home", "Checklist", "Play", "Stars", "Me"][i]}
          </button>
        ))}
      </nav>
    </div>
  );
}
