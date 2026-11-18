import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "./Shell";

/**
 * Wraps a row of filter chips.
 * Mobile: chips scroll sideways. Tablet: a collapsible panel. Desktop: an always-open wrapping bar.
 */
export function FilterBar({ label, summary, children }: { label: string; summary: string; children: ReactNode }) {
  const tablet = useMediaQuery("(min-width: 768px) and (max-width: 1023.98px)");
  const [open, setOpen] = useState(false);
  const collapsed = tablet && !open;
  return (
    <div className="filter-bar">
      {tablet && (
        <button type="button" className="filter-toggle" aria-expanded={open} aria-controls="filter-panel" onClick={() => setOpen((v) => !v)}>
          <span>
            {label}: <strong>{summary}</strong>
          </span>
          <ChevronDown size={18} aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }} />
        </button>
      )}
      <div id="filter-panel" hidden={collapsed}>
        {children}
      </div>
    </div>
  );
}