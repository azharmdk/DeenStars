import { ReactNode, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "../components/icons";
import { Art, ArtName } from "../components/ui";
import { linkTo, navigate, usePath } from "../router";
import { InstallPrompt } from "../components/InstallPrompt";
import { PRIVACY_ITEMS } from "./Onboarding";

/** Public pages. Learning pages work without an account; progress needs a free parent account. */
export const SITE_LINKS: { to: string; label: string }[] = [
  { to: "/duas", label: "Dua Corner" },
  { to: "/surahs", label: "Surahs" },
  { to: "/stories", label: "Stories" },
  { to: "/play", label: "Play & Learn" },
  { to: "/printables", label: "Printables" },
];

/**
 * Website frame for every public page: header with links, page content, footer.
 * `kids` marks pages where children learn: no outside links and no install prompt there.
 * `signedIn`: a parent who opened a shared link while signed in gets "Open the app" instead of sign-in.
 */
export function SiteFrame({ children, kids = false, signedIn = false }: { children: ReactNode; kids?: boolean; signedIn?: boolean }) {
  const path = usePath();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);
  const current = (to: string) => (path === to || path.startsWith(`${to}/`) ? "page" : undefined);
  return (
    <div className="site">
      <header className="site-header">
        <div className="container site-header-inner">
          <a href="/" className="site-brand" onClick={linkTo("/")} aria-label="DeenStars home">
            <BrandMark size={34} />
            <span>DeenStars</span>
          </a>
          <nav className="site-links" aria-label="Site">
            {SITE_LINKS.map((l) => (
              <a key={l.to} href={l.to} onClick={linkTo(l.to)} aria-current={current(l.to)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="site-actions">
            {signedIn ? (
              <a href="/" className="btn btn-primary btn-sm" onClick={linkTo("/")}>
                Open the app
              </a>
            ) : (
              <>
                <a href="/signin" className="btn btn-ghost btn-sm" onClick={linkTo("/signin")}>
                  Sign in
                </a>
                <a href="/register" className="btn btn-primary btn-sm site-cta" onClick={linkTo("/register")}>
                  Get started
                </a>
              </>
            )}
            <button type="button" className="icon-btn site-menu-btn" aria-expanded={menu} aria-controls="site-menu" aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((v) => !v)}>
              {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav id="site-menu" className="site-menu" aria-label="Menu">
            <a href="/" onClick={linkTo("/")} aria-current={path === "/" ? "page" : undefined}>Home</a>
            {SITE_LINKS.map((l) => (
              <a key={l.to} href={l.to} onClick={linkTo(l.to)} aria-current={current(l.to)}>
                {l.label}
              </a>
            ))}
            {signedIn ? <a href="/" onClick={linkTo("/")}>Open the app</a> : <a href="/register" onClick={linkTo("/register")}>Get started</a>}
          </nav>
        )}
      </header>
      {!kids && <InstallPrompt />}
      <main className="site-body">{children}</main>
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <div className="stack" style={{ gap: 6 }}>
            <span className="site-brand static">
              <BrandMark size={28} />
              <span>DeenStars</span>
            </span>
            <p className="small muted">Little steps. Beautiful habits. Brighter hearts.</p>
          </div>
          <div className="stack" style={{ gap: 6, alignItems: "flex-start" }}>
            <a href="/#parents" onClick={(e) => { e.preventDefault(); navigate("/#parents"); }} className="small">For parents</a>
            <a href="/printables" onClick={linkTo("/printables")} className="small">Free printables</a>
          </div>
          <div className="stack site-footer-note" style={{ gap: 6 }}>
            <p className="tiny faint">Test build. Sample content, not yet reviewed. Please use made-up details.</p>
            <p className="tiny faint">
              Quran translation by Talal Itani,{" "}
              {kids ? "ClearQuran.com" : <a href="https://clearquran.com" target="_blank" rel="noopener noreferrer">ClearQuran.com</a>}. Arabic text: Tanzil Project. Duas: Hisn al-Muslim.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES: { art: ArtName; title: string; text: string; tone: string; to: string; account?: boolean }[] = [
  { art: "palms-up", title: "Dua Corner", text: "Learn a dua.", tone: "gold", to: "/duas" },
  { art: "book", title: "Short Surahs", text: "Listen and repeat.", tone: "teal", to: "/surahs" },
  { art: "books", title: "Stories", text: "Prophets, good character and bedtime.", tone: "purple", to: "/stories" },
  { art: "puzzle", title: "Play & Learn", text: "Quiz and games.", tone: "blue", to: "/play" },
  { art: "clipboard", title: "Free printables", text: "Charts and calendars to print at home.", tone: "orange", to: "/printables" },
  { art: "seedling", title: "Daily checklist", text: "Stars and days in a row. Free parent account.", tone: "green", to: "/register", account: true },
];

export function Landing() {
  return (
    <SiteFrame>
      <section className="landing-hero">
        <div className="container landing-hero-inner">
          <div className="landing-hero-text">
            <span className="eyebrow">For children aged 3 to 6</span>
            <h1 className="landing-title">Little steps. Beautiful habits. Brighter hearts.</h1>
            <p className="landing-lead">Daily Islamic habits, duas and gentle learning games for young children, guided by parents.</p>
            <div className="landing-cta">
              <a href="/duas" className="btn btn-primary" onClick={linkTo("/duas")}>
                Start learning
              </a>
              <a href="/register" className="btn btn-secondary" onClick={linkTo("/register")}>
                Create a free parent account
              </a>
            </div>
            <p className="small faint">No sign-up needed to explore. An account saves your child's stars and progress.</p>
          </div>
          <div className="welcome-art landing-art" aria-hidden="true">
            <Art name="mosque" size={190} className="float" style={{ left: "50%", bottom: 10, marginLeft: -95 }} />
            <Art name="moon" size={96} className="float d2" style={{ left: 28, top: 28 }} />
            <Art name="glowing-star" size={64} className="float d3" style={{ right: 40, top: 32 }} />
            <Art name="star" size={38} className="float d2" style={{ right: 110, top: 110 }} />
            <Art name="palm" size={104} className="float d3" style={{ left: 10, bottom: 8 }} />
            <Art name="camel" size={90} className="float" style={{ right: 8, bottom: 8 }} />
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="container">
          <h2 className="landing-h2">What's inside</h2>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <a key={f.title} href={f.to} onClick={linkTo(f.to)} className={`feature-card g-${f.tone}`}>
                <span className="feature-text">
                  {f.account && <span className="banner-badge">With an account</span>}
                  <span className="feature-title">{f.title}</span>
                  <span className="feature-sub">{f.text}</span>
                </span>
                <Art name={f.art} size={72} className="feature-art" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="parents" className="landing-section alt">
        <div className="container">
          <h2 className="landing-h2">For parents</h2>
          <p className="muted landing-sub">
            Explore freely. Create a free account to add your child, keep their daily checklist and stars, and check activities in the parent area. Children never sign in.
          </p>
          <div className="parent-grid">
            {PRIVACY_ITEMS.map(({ art, title, text }) => (
              <div className="card stack" key={title} style={{ gap: 8 }}>
                <span className="art-chip" style={{ background: "var(--primary-soft)", width: 52, height: 52, borderRadius: 16 }} aria-hidden="true">
                  <Art name={art} size={34} />
                </span>
                <h3>{title}</h3>
                <p className="muted small">{text}</p>
              </div>
            ))}
          </div>
          <div className="landing-cta" style={{ marginTop: 24 }}>
            <a href="/register" className="btn btn-primary" onClick={linkTo("/register")}>
              Create a free parent account
            </a>
            <a href="/signin" className="btn btn-secondary" onClick={linkTo("/signin")}>
              Sign in
            </a>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
