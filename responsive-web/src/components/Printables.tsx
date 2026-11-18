import { Download, Printer } from "lucide-react";
import { findPrintable, listedPrintables, Printable } from "../printables/catalog";
import { linkTo } from "../router";
import { BackLink } from "./common";

/**
 * Printables (Enhancement 4).
 * - `download`: for grown-ups (website and parent area). One tap opens the PDF, which phones and
 *   desktops can print or save.
 * - `list`: for children (Home). Pictures and names only, no links and no downloads.
 */
function Downloads({ p }: { p: Printable }) {
  return (
    <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      <a className="btn btn-primary btn-sm" href={p.files.colour} target="_blank" rel="noopener" download={`${p.id}-colour.pdf`}>
        <Download size={16} aria-hidden="true" /> Colour PDF
      </a>
      {p.files.bw && (
        <a className="btn btn-secondary btn-sm" href={p.files.bw} target="_blank" rel="noopener" download={`${p.id}-bw.pdf`}>
          <Printer size={16} aria-hidden="true" /> Black and white
        </a>
      )}
    </span>
  );
}

export function PrintablesGrid({ mode, linkToPage = false }: { mode: "download" | "list"; linkToPage?: boolean }) {
  const items = listedPrintables();
  return (
    <div className="printable-grid" role="list" aria-label="Printables">
      {items.map((p) => (
        <div key={p.id} role="listitem" className="card printable-card" data-printable={p.id}>
          <img className={`printable-preview ${p.orientation}`} src={p.preview} alt="" loading="lazy" />
          <span className="stack" style={{ gap: 4 }}>
            {linkToPage ? (
              <a className="strong printable-title" href={`/printables/${p.id}`} onClick={linkTo(`/printables/${p.id}`)}>
                {p.title}
              </a>
            ) : (
              <span className="strong printable-title">{p.title}</span>
            )}
            <span className="small muted">{p.description}</span>
          </span>
          {mode === "download" ? <Downloads p={p} /> : <span className="small faint">Ask a grown-up to print this for you.</span>}
        </div>
      ))}
    </div>
  );
}

export function PrintablesPage({ onBack, linkToPage = false }: { onBack?: () => void; linkToPage?: boolean }) {
  return (
    <div className="screen">
      {onBack && <BackLink onClick={onBack} />}
      <h1>Printables</h1>
      <p className="muted">Free to download and print at home. No sign-up needed.</p>
      <PrintablesGrid mode="download" linkToPage={linkToPage} />
      <p className="tiny faint">Sample content, not yet reviewed. Some sheets include a dua; they will be updated after the scholar review.</p>
    </div>
  );
}

/** One printable on its own page: /printables/<id> (shareable link). */
export function PrintableDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const p = findPrintable(id);
  if (!p) return <PrintablesPage onBack={onBack} linkToPage />;
  return (
    <div className="screen reading">
      <BackLink onClick={onBack} label="Printables" />
      <h1>{p.title}</h1>
      <p className="muted">{p.description}</p>
      <img className={`printable-preview large ${p.orientation}`} src={p.preview} alt={`Preview of ${p.title}`} />
      <Downloads p={p} />
      <p className="tiny faint">A4 PDF, one page. Sample content, not yet reviewed.</p>
    </div>
  );
}
