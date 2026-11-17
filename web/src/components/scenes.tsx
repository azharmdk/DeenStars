/**
 * Story scene kit: original DeenStars vector illustrations drawn in code (no generative AI images).
 * Picture-book style with bold outlines and flat colours.
 * Hard rule: no human or Prophet figures at all. Only scenery, animals and objects
 * (docs/ISLAMIC_CONTENT_POLICY.md §3 and §11).
 */
import type { ReactNode } from "react";

const O = "#22302e"; // outline
const SW = 3;

type P = { x?: number; y?: number; s?: number; flip?: boolean };
function G({ x = 0, y = 0, s = 1, flip, children }: P & { children: ReactNode }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>{children}</g>;
}

// ---------- Skies ----------
type SkyKind = "day" | "dusk" | "night" | "storm" | "deep" | "dawn";
const SKY: Record<SkyKind, [string, string]> = {
  day: ["#a9dcf5", "#d9f0fb"],
  dawn: ["#f7c99b", "#fbe6c8"],
  dusk: ["#f2a37a", "#f8d39a"],
  night: ["#1d2a55", "#33447a"],
  storm: ["#5f6f86", "#8796ab"],
  deep: ["#0b1a33", "#13284a"],
};
function Sky({ kind }: { kind: SkyKind }) {
  const [top, bottom] = SKY[kind];
  const id = `sky-${kind}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <pattern id={`dots-${kind}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#ffffff" opacity={kind === "night" || kind === "deep" ? 0.07 : 0.18} />
        </pattern>
      </defs>
      <rect width="400" height="250" fill={`url(#${id})`} />
      <rect width="400" height="250" fill={`url(#dots-${kind})`} />
    </>
  );
}

function Sun({ x = 330, y = 55, r = 26 }: { x?: number; y?: number; r?: number }) {
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return <line key={i} x1={x + Math.cos(a) * (r + 8)} y1={y + Math.sin(a) * (r + 8)} x2={x + Math.cos(a) * (r + 18)} y2={y + Math.sin(a) * (r + 18)} stroke="#f4b740" strokeWidth={4} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r} fill="#ffd25e" stroke={O} strokeWidth={SW} />
    </g>
  );
}

function Moon({ x = 320, y = 55, r = 22 }: { x?: number; y?: number; r?: number }) {
  const id = `moon-${x}-${y}`;
  return (
    <g>
      <defs>
        <mask id={id}>
          <rect x={x - r - 5} y={y - r - 5} width={r * 2 + 10} height={r * 2 + 10} fill="#fff" />
          <circle cx={x + r * 0.45} cy={y - r * 0.3} r={r * 0.85} fill="#000" />
        </mask>
      </defs>
      <circle cx={x} cy={y} r={r} fill="#ffe7a3" mask={`url(#${id})`} />
    </g>
  );
}

function Stars({ count = 24, seed = 3, maxY = 130 }: { count?: number; seed?: number; maxY?: number }) {
  let n = seed * 9301 + 49297;
  const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = 10 + rnd() * 380;
        const y = 8 + rnd() * maxY;
        const r = 1 + rnd() * 1.8;
        return i % 5 === 0 ? (
          <path key={i} d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4}Z`} fill="#ffe7a3" />
        ) : (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff6d8" opacity={0.85} />
        );
      })}
    </g>
  );
}

function Cloud({ x = 0, y = 0, s = 1, dark = false }: P & { dark?: boolean }) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M0 30 Q-2 10 18 12 Q24 -4 42 4 Q56 -6 66 10 Q86 8 84 28 Q86 38 72 38 L10 38 Q0 38 0 30Z" fill={dark ? "#9aa6b8" : "#ffffff"} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
    </G>
  );
}

function Rain() {
  return (
    <g stroke="#dbe8f5" strokeWidth={2.5} strokeLinecap="round" opacity={0.8}>
      {Array.from({ length: 36 }, (_, i) => {
        const x = (i * 37) % 400;
        const y = 40 + ((i * 53) % 150);
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 14} />;
      })}
    </g>
  );
}

function LightRays() {
  return (
    <g opacity={0.55}>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 200 + (i - 4) * 46;
        return <path key={i} d={`M200 -10 L${x - 14} 260 L${x + 14} 260 Z`} fill="#fff6d0" opacity={0.35} />;
      })}
      <circle cx="200" cy="10" r="46" fill="#fff6d0" opacity={0.8} />
    </g>
  );
}

// ---------- Ground, water ----------
function Hills({ color = "#86c46a", back = "#a8d88a", y = 170 }: { color?: string; back?: string; y?: number }) {
  return (
    <g>
      <path d={`M-10 ${y} Q70 ${y - 50} 150 ${y - 10} Q230 ${y - 55} 320 ${y - 15} Q370 ${y - 35} 410 ${y - 20} L410 260 L-10 260Z`} fill={back} stroke={O} strokeWidth={SW} />
      <path d={`M-10 ${y + 20} Q90 ${y - 10} 200 ${y + 15} Q300 ${y - 5} 410 ${y + 15} L410 260 L-10 260Z`} fill={color} stroke={O} strokeWidth={SW} />
    </g>
  );
}

function Desert({ y = 175 }: { y?: number }) {
  return (
    <g>
      <path d={`M-10 ${y - 30} L40 ${y - 75} L95 ${y - 40} L150 ${y - 90} L215 ${y - 35} L270 ${y - 80} L330 ${y - 30} L370 ${y - 60} L410 ${y - 35} L410 260 L-10 260Z`} fill="#c9a27a" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M-10 ${y} Q100 ${y - 22} 200 ${y - 4} Q300 ${y - 22} 410 ${y} L410 260 L-10 260Z`} fill="#f1d39a" stroke={O} strokeWidth={SW} />
    </g>
  );
}

function Sea({ y = 170, color = "#3d8bc0", dark = false }: { y?: number; color?: string; dark?: boolean }) {
  const c = dark ? "#1f4f7a" : color;
  return (
    <g>
      <rect x="-10" y={y} width="420" height={260 - y} fill={c} stroke={O} strokeWidth={SW} />
      <g fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" opacity={0.6}>
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M${(i * 47) % 380 + 10} ${y + 18 + ((i * 29) % 60)} q8 -6 16 0 q8 6 16 0`} />
        ))}
      </g>
    </g>
  );
}

function BigWaves({ y = 150 }: { y?: number }) {
  return (
    <g>
      <path d={`M-10 ${y} Q30 ${y - 50} 70 ${y} Q110 ${y - 60} 150 ${y} Q190 ${y - 45} 230 ${y} Q270 ${y - 65} 310 ${y} Q350 ${y - 50} 410 ${y} L410 260 L-10 260Z`} fill="#2f6f9f" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M-10 ${y + 40} Q40 ${y + 5} 90 ${y + 40} Q140 ${y + 5} 190 ${y + 40} Q240 ${y + 5} 290 ${y + 40} Q340 ${y + 5} 410 ${y + 40} L410 260 L-10 260Z`} fill="#3d8bc0" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <g fill="#ffffff" opacity={0.85}>
        <circle cx="70" cy={y - 2} r="5" />
        <circle cx="150" cy={y - 2} r="5" />
        <circle cx="310" cy={y - 2} r="5" />
      </g>
    </g>
  );
}

function River({ y = 175 }: { y?: number }) {
  return (
    <g>
      <rect x="-10" y={y - 40} width="420" height="140" fill="#a8d88a" />
      <path d={`M-10 ${y} Q100 ${y - 25} 200 ${y} Q300 ${y + 25} 410 ${y - 5} L410 ${y + 50} Q300 ${y + 70} 200 ${y + 45} Q100 ${y + 20} -10 ${y + 50}Z`} fill="#4c9bd0" stroke={O} strokeWidth={SW} />
      <g fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" opacity={0.6}>
        <path d={`M40 ${y + 24} q10 -5 20 0`} />
        <path d={`M150 ${y + 26} q10 -5 20 0`} />
        <path d={`M280 ${y + 40} q10 -5 20 0`} />
      </g>
      <rect x="-10" y={y + 50} width="420" height="60" fill="#86c46a" stroke={O} strokeWidth={SW} />
    </g>
  );
}

function Reeds({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      {[0, 10, 20, 30].map((dx, i) => (
        <g key={i}>
          <path d={`M${dx} 0 Q${dx + 3} -30 ${dx - 2} -55`} fill="none" stroke="#4f8a3c" strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={dx - 2} cy={-58} rx="4" ry="10" fill="#8a5a2b" stroke={O} strokeWidth={2} />
        </g>
      ))}
    </G>
  );
}

function Mountain({ x = 0, y = 0, s = 1, snow = false }: P & { snow?: boolean }) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M-90 0 L-20 -110 L10 -80 L30 -100 L100 0Z" fill="#9b8571" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {snow && <path d="M-36 -84 L-20 -110 L-4 -88 L-12 -84 L-20 -92 L-28 -82Z" fill="#fff" stroke={O} strokeWidth={2} />}
    </G>
  );
}

// ---------- Plants ----------
function Tree({ x = 0, y = 0, s = 1, color = "#6fb05a", fruit = false, glow = false }: P & { color?: string; fruit?: boolean; glow?: boolean }) {
  return (
    <G x={x} y={y} s={s}>
      {glow && <circle cx="0" cy="-62" r="62" fill="#fff3b0" opacity={0.55} />}
      <rect x="-8" y="-40" width="16" height="40" fill="#8a5a2b" stroke={O} strokeWidth={SW} />
      <circle cx="0" cy="-62" r="36" fill={color} stroke={O} strokeWidth={SW} />
      <circle cx="-22" cy="-48" r="20" fill={color} stroke={O} strokeWidth={SW} />
      <circle cx="22" cy="-48" r="20" fill={color} stroke={O} strokeWidth={SW} />
      {fruit && (
        <g fill="#e2574c" stroke={O} strokeWidth={1.5}>
          <circle cx="-12" cy="-68" r="5" />
          <circle cx="14" cy="-58" r="5" />
          <circle cx="2" cy="-82" r="5" />
          <circle cx="-26" cy="-46" r="5" />
          <circle cx="24" cy="-44" r="5" />
        </g>
      )}
    </G>
  );
}

function Palm({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M-4 0 Q-10 -40 4 -80 L12 -78 Q0 -40 8 0Z" fill="#a8743d" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {[[-40, -70], [40, -72], [-30, -95], [30, -96], [0, -105]].map(([dx, dy], i) => (
        <path key={i} d={`M8 -80 Q${dx / 2 + 8} ${dy - 10} ${dx + 8} ${dy + 6} Q${dx / 2 + 8} ${dy + 2} 8 -78Z`} fill="#5f9e47" stroke={O} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      <g fill="#7a3f1d" stroke={O} strokeWidth={1.5}>
        <circle cx="4" cy="-74" r="4" />
        <circle cx="12" cy="-73" r="4" />
      </g>
    </G>
  );
}

function GourdPlant({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M-70 0 Q-60 -60 0 -70 Q60 -60 70 0" fill="none" stroke="#4f8a3c" strokeWidth={6} strokeLinecap="round" />
      {[[-60, -30], [-35, -60], [0, -72], [35, -60], [60, -30], [-15, -50], [18, -48]].map(([dx, dy], i) => (
        <path key={i} d={`M${dx} ${dy} q-18 -6 -20 10 q8 14 20 6 q12 -8 0 -16Z`} fill="#7cc35f" stroke={O} strokeWidth={2.5} />
      ))}
      <ellipse cx="20" cy="-30" rx="9" ry="12" fill="#e7d27a" stroke={O} strokeWidth={2.5} />
    </G>
  );
}

function Flowers({ y = 215 }: { y?: number }) {
  return (
    <g>
      {[30, 80, 140, 250, 310, 365].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 14} stroke="#4f8a3c" strokeWidth={3} />
          <circle cx={x} cy={y} r="6" fill={["#f7a8b8", "#ffd25e", "#b9a6eb"][i % 3]} stroke={O} strokeWidth={2} />
          <circle cx={x} cy={y} r="2" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

// ---------- Buildings and objects ----------
function House({ x = 0, y = 0, s = 1, lit = false, color = "#e7c79a" }: P & { lit?: boolean; color?: string }) {
  return (
    <G x={x} y={y} s={s}>
      <rect x="-30" y="-50" width="60" height="50" fill={color} stroke={O} strokeWidth={SW} />
      <rect x="-34" y="-58" width="68" height="10" fill="#c99d6b" stroke={O} strokeWidth={SW} />
      <path d="M-8 0 L-8 -22 Q0 -30 8 -22 L8 0Z" fill="#8a5a2b" stroke={O} strokeWidth={SW} />
      <rect x="-24" y="-40" width="12" height="12" rx="2" fill={lit ? "#ffd25e" : "#5b7e9c"} stroke={O} strokeWidth={2.5} />
      <rect x="12" y="-40" width="12" height="12" rx="2" fill={lit ? "#ffd25e" : "#5b7e9c"} stroke={O} strokeWidth={2.5} />
    </G>
  );
}

function Palace({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <rect x="-80" y="-70" width="160" height="70" fill="#e9d6a8" stroke={O} strokeWidth={SW} />
      <rect x="-90" y="-82" width="180" height="14" fill="#d7b979" stroke={O} strokeWidth={SW} />
      {[-60, -30, 0, 30, 60].map((cx, i) => (
        <rect key={i} x={cx - 6} y="-66" width="12" height="66" fill="#f6ead0" stroke={O} strokeWidth={2.5} />
      ))}
      <path d="M-20 -82 L0 -110 L20 -82Z" fill="#d7b979" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <rect x="-12" y="-36" width="24" height="36" fill="#8a5a2b" stroke={O} strokeWidth={SW} />
    </G>
  );
}

function Ark({ x = 0, y = 0, s = 1, unfinished = false }: P & { unfinished?: boolean }) {
  if (unfinished) {
    return (
      <G x={x} y={y} s={s}>
        <path d="M-110 -40 Q-100 0 -60 6 L60 6 Q100 0 110 -40Z" fill="none" stroke={O} strokeWidth={SW} />
        {[-80, -50, -20, 10, 40, 70].map((rx, i) => (
          <path key={i} d={`M${rx} -40 Q${rx + 4} -10 ${rx + 2} 6`} fill="none" stroke="#8a5a2b" strokeWidth={6} strokeLinecap="round" />
        ))}
        <path d="M-104 -24 Q0 -14 104 -24" fill="none" stroke="#b7783f" strokeWidth={8} />
        <path d="M-98 -8 Q0 2 98 -8" fill="none" stroke="#b7783f" strokeWidth={8} />
        <g transform="translate(140 0)">
          {[0, 8, 16].map((dy, i) => (
            <rect key={i} x="-30" y={-dy - 8} width="60" height="8" rx="2" fill="#c98b4e" stroke={O} strokeWidth={2} />
          ))}
        </g>
      </G>
    );
  }
  return (
    <G x={x} y={y} s={s}>
      <path d="M-120 -40 Q-110 4 -60 10 L60 10 Q110 4 120 -40Z" fill="#b7783f" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-112 -22 Q0 -12 112 -22" fill="none" stroke="#8a5a2b" strokeWidth={3} />
      <path d="M-100 -6 Q0 4 100 -6" fill="none" stroke="#8a5a2b" strokeWidth={3} />
      <rect x="-60" y="-80" width="120" height="42" fill="#c98b4e" stroke={O} strokeWidth={SW} />
      <path d="M-70 -78 L0 -104 L70 -78Z" fill="#8a5a2b" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {[-36, -6, 24].map((wx, i) => (
        <rect key={i} x={wx} y="-68" width="14" height="14" rx="3" fill="#ffd25e" stroke={O} strokeWidth={2.5} />
      ))}
    </G>
  );
}

function Ship({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M-70 -20 L70 -20 L50 6 L-50 6Z" fill="#b7783f" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="0" y1="-20" x2="0" y2="-110" stroke={O} strokeWidth={4} />
      <path d="M4 -104 Q60 -70 4 -30Z" fill="#fff8e8" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-4 -96 Q-46 -66 -4 -36Z" fill="#f1e2c4" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {[-40, -15, 10].map((bx, i) => (
        <rect key={i} x={bx} y="-34" width="18" height="14" fill="#c99d6b" stroke={O} strokeWidth={2} />
      ))}
    </G>
  );
}

function Chest({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <rect x="-28" y="-22" width="56" height="26" rx="4" fill="#b7783f" stroke={O} strokeWidth={SW} />
      <path d="M-30 -22 Q0 -40 30 -22Z" fill="#c98b4e" stroke={O} strokeWidth={SW} />
      <line x1="-28" y1="-10" x2="28" y2="-10" stroke="#8a5a2b" strokeWidth={3} />
      <rect x="-5" y="-16" width="10" height="10" rx="2" fill="#ffd25e" stroke={O} strokeWidth={2} />
    </G>
  );
}

function Stones({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      {[[-30, 0], [0, 0], [30, 0], [-15, -18], [15, -18], [0, -36]].map(([dx, dy], i) => (
        <rect key={i} x={dx - 14} y={dy - 16} width="28" height="16" rx="3" fill="#c9b79c" stroke={O} strokeWidth={2.5} />
      ))}
    </G>
  );
}

/** The House as built by Prophet Ibrahim and Prophet Ismail: a simple stone structure. */
function KaabaStone({ x = 0, y = 0, s = 1, rows = 6 }: P & { rows?: number }) {
  const w = 120;
  const rowH = 16;
  return (
    <G x={x} y={y} s={s}>
      {Array.from({ length: rows }, (_, r) => {
        const yy = -(r + 1) * rowH;
        const offset = r % 2 === 0 ? 0 : 15;
        return (
          <g key={r}>
            {Array.from({ length: 5 }, (_, c) => {
              const xx = -w / 2 + c * 30 - offset;
              const x0 = Math.max(-w / 2, xx);
              const x1 = Math.min(w / 2, xx + 30);
              if (x1 <= x0) return null;
              return <rect key={c} x={x0} y={yy} width={x1 - x0} height={rowH} fill={(r + c) % 2 ? "#b9a586" : "#c9b79c"} stroke={O} strokeWidth={2} />;
            })}
          </g>
        );
      })}
    </G>
  );
}

// ---------- Animals ----------
function Elephant({ x = 0, y = 0, s = 1, flip }: P) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <ellipse cx="0" cy="-28" rx="30" ry="22" fill="#a7b4c2" stroke={O} strokeWidth={SW} />
      {[-20, -6, 8, 20].map((lx, i) => (
        <rect key={i} x={lx - 5} y="-14" width="10" height="16" rx="3" fill="#a7b4c2" stroke={O} strokeWidth={2.5} />
      ))}
      <circle cx="30" cy="-40" r="16" fill="#a7b4c2" stroke={O} strokeWidth={SW} />
      <ellipse cx="22" cy="-40" rx="10" ry="13" fill="#b9c4d0" stroke={O} strokeWidth={2.5} />
      <path d="M42 -36 Q52 -20 44 -6" fill="none" stroke={O} strokeWidth={9} strokeLinecap="round" />
      <path d="M42 -36 Q52 -20 44 -6" fill="none" stroke="#a7b4c2" strokeWidth={5} strokeLinecap="round" />
      <circle cx="34" cy="-44" r="2.5" fill={O} />
    </G>
  );
}

function Giraffe({ x = 0, y = 0, s = 1, flip }: P) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <ellipse cx="0" cy="-34" rx="24" ry="14" fill="#f2c45c" stroke={O} strokeWidth={SW} />
      {[-16, -6, 6, 16].map((lx, i) => (
        <rect key={i} x={lx - 3} y="-24" width="6" height="26" fill="#f2c45c" stroke={O} strokeWidth={2.5} />
      ))}
      <path d="M14 -42 L22 -96 L32 -96 L26 -40Z" fill="#f2c45c" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="32" cy="-100" rx="12" ry="8" fill="#f2c45c" stroke={O} strokeWidth={SW} />
      <line x1="26" y1="-108" x2="24" y2="-116" stroke={O} strokeWidth={2.5} />
      <line x1="32" y1="-108" x2="32" y2="-117" stroke={O} strokeWidth={2.5} />
      <circle cx="35" cy="-102" r="2" fill={O} />
      <g fill="#c98b2e">
        <circle cx="-8" cy="-36" r="4" />
        <circle cx="6" cy="-30" r="4" />
        <circle cx="22" cy="-70" r="3" />
      </g>
    </G>
  );
}

function Sheep({ x = 0, y = 0, s = 1, flip }: P) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      {[-8, 8].map((lx, i) => (
        <rect key={i} x={lx - 3} y="-10" width="6" height="12" fill={O} />
      ))}
      <path d="M-22 -18 q-2 -14 10 -14 q4 -10 14 -6 q10 -6 14 4 q12 0 8 14 q2 10 -10 10 l-28 0 q-10 0 -8 -8z" fill="#ffffff" stroke={O} strokeWidth={SW} />
      <ellipse cx="22" cy="-22" rx="8" ry="10" fill="#4a4a4a" stroke={O} strokeWidth={2} />
      <circle cx="24" cy="-24" r="1.8" fill="#fff" />
    </G>
  );
}

function Bird({ x = 0, y = 0, s = 1, color = "#f2885c", flip }: P & { color?: string }) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <ellipse cx="0" cy="0" rx="14" ry="10" fill={color} stroke={O} strokeWidth={2.5} />
      <path d="M-4 -2 Q-14 -20 4 -14Z" fill={color} stroke={O} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M13 -2 L22 1 L13 4Z" fill="#ffd25e" stroke={O} strokeWidth={2} strokeLinejoin="round" />
      <circle cx="7" cy="-3" r="1.8" fill={O} />
    </G>
  );
}

function BigFish({ x = 0, y = 0, s = 1, open = false, flip }: P & { open?: boolean }) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <path d="M-120 0 Q-60 -60 40 -40 Q90 -30 100 0 Q90 30 40 36 Q-60 50 -120 0Z" fill="#4e7fa8" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-120 0 L-160 -36 L-150 0 L-160 36Z" fill="#4e7fa8" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-80 18 Q-20 40 60 24 Q20 34 -80 18Z" fill="#9cc3dd" stroke={O} strokeWidth={2} />
      <path d="M-20 -40 Q0 -64 22 -42" fill="#3d6a91" stroke={O} strokeWidth={2.5} />
      <circle cx="58" cy="-12" r="7" fill="#fff" stroke={O} strokeWidth={2.5} />
      <circle cx="60" cy="-12" r="3" fill={O} />
      {open ? (
        <path d="M100 0 Q80 6 70 14 Q86 18 98 8" fill="#2a4a6b" stroke={O} strokeWidth={2.5} />
      ) : (
        <path d="M100 0 Q86 8 72 8" fill="none" stroke={O} strokeWidth={2.5} strokeLinecap="round" />
      )}
      <g stroke="#ffffff" strokeWidth={2} opacity={0.6} fill="none">
        <path d="M60 -50 q4 -8 0 -16" />
        <path d="M68 -48 q6 -10 2 -20" />
      </g>
    </G>
  );
}

function SmallFish({ x = 0, y = 0, s = 1, color = "#ffb25e", flip }: P & { color?: string }) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <ellipse cx="0" cy="0" rx="12" ry="7" fill={color} stroke={O} strokeWidth={2} />
      <path d="M-11 0 L-20 -7 L-20 7Z" fill={color} stroke={O} strokeWidth={2} strokeLinejoin="round" />
      <circle cx="6" cy="-1" r="1.6" fill={O} />
    </G>
  );
}

function Ant({ x = 0, y = 0, s = 1, flip }: P) {
  return (
    <G x={x} y={y} s={s} flip={flip}>
      <g stroke={O} strokeWidth={2.2} strokeLinecap="round" fill="none">
        <path d="M-8 2 l-6 10" />
        <path d="M0 3 l0 11" />
        <path d="M8 2 l6 10" />
        <path d="M24 -10 q4 -12 10 -14" />
        <path d="M22 -10 q-2 -12 2 -16" />
      </g>
      <ellipse cx="-14" cy="-2" rx="10" ry="8" fill="#6b3a26" stroke={O} strokeWidth={2.2} />
      <ellipse cx="2" cy="-2" rx="7" ry="6" fill="#7d4630" stroke={O} strokeWidth={2.2} />
      <circle cx="18" cy="-6" r="8" fill="#7d4630" stroke={O} strokeWidth={2.2} />
      <circle cx="21" cy="-8" r="2" fill="#fff" />
      <path d="M17 -2 q3 3 7 0" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
    </G>
  );
}

function AntHill({ x = 0, y = 0, s = 1 }: P) {
  return (
    <G x={x} y={y} s={s}>
      <path d="M-50 0 Q-30 -40 0 -44 Q30 -40 50 0Z" fill="#c9a27a" stroke={O} strokeWidth={SW} />
      <ellipse cx="0" cy="-30" rx="10" ry="7" fill="#5a3a22" stroke={O} strokeWidth={2.5} />
    </G>
  );
}

function Flags({ y = 160 }: { y?: number }) {
  return (
    <g>
      {[60, 110, 160, 210, 260].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y - 60} stroke={O} strokeWidth={3} />
          <path d={`M${x} ${y - 60} L${x + 30} ${y - 52} L${x} ${y - 44}Z`} fill={["#2f6f9f", "#c9853c", "#4f8a3c"][i % 3]} stroke={O} strokeWidth={2} strokeLinejoin="round" />
        </g>
      ))}
      <g fill="#e8d3ad" opacity={0.9}>
        <ellipse cx="80" cy={y + 6} rx="40" ry="10" />
        <ellipse cx="170" cy={y + 8} rx="50" ry="11" />
        <ellipse cx="250" cy={y + 6} rx="40" ry="10" />
      </g>
    </g>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 400 250" width="100%" role="img" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <clipPath id="panel">
          <rect x="0" y="0" width="400" height="250" rx="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#panel)">{children}</g>
      <rect x="1.5" y="1.5" width="397" height="247" rx="18" fill="none" stroke={O} strokeWidth={SW} />
    </svg>
  );
}

// ---------- Scenes ----------
export const SCENES: Record<string, () => ReactNode> = {
  "nuh-village": () => (
    <>
      <Sky kind="day" />
      <Sun />
      <Cloud x={40} y={30} s={0.8} />
      <Hills />
      <House x={110} y={205} />
      <House x={190} y={200} s={1.1} color="#ead3ad" />
      <House x={275} y={207} s={0.9} />
      <Palm x={345} y={212} s={0.9} />
    </>
  ),
  "nuh-building": () => (
    <>
      <Sky kind="day" />
      <Sun x={60} />
      <Cloud x={260} y={26} s={0.9} />
      <Hills color="#8fc56f" />
      <Ark x={170} y={208} s={1} unfinished />
      <Tree x={355} y={215} s={0.7} />
    </>
  ),
  "nuh-animals": () => (
    <>
      <Sky kind="storm" />
      <Cloud x={30} y={20} s={1} dark />
      <Cloud x={250} y={14} s={1.2} dark />
      <Hills color="#7fb562" back="#9cc982" />
      <Ark x={250} y={195} s={0.85} />
      <Elephant x={40} y={222} s={0.75} />
      <Elephant x={85} y={226} s={0.65} />
      <Giraffe x={150} y={226} s={0.7} />
      <Giraffe x={185} y={228} s={0.6} />
      <Sheep x={350} y={232} s={0.8} flip />
      <Sheep x={385} y={236} s={0.7} flip />
    </>
  ),
  "nuh-waves": () => (
    <>
      <Sky kind="storm" />
      <Rain />
      <Cloud x={20} y={14} s={1.1} dark />
      <Cloud x={230} y={8} s={1.3} dark />
      <Ark x={200} y={150} s={0.9} />
      <BigWaves y={160} />
    </>
  ),
  "nuh-mountain": () => (
    <>
      <Sky kind="dawn" />
      <Sun x={330} y={60} />
      <Cloud x={40} y={30} s={0.7} />
      <Sea y={200} />
      <Mountain x={190} y={205} s={1.2} />
      {/* Resting on the summit (Quran 11:44). Peak is at (166, 73). */}
      <Ark x={168} y={70} s={0.48} />
    </>
  ),

  "sulaiman-birds": () => (
    <>
      <Sky kind="day" />
      <Sun x={60} y={50} />
      <Cloud x={250} y={40} s={0.8} />
      <Hills />
      <Bird x={140} y={90} s={1.6} />
      <Bird x={200} y={60} s={1.3} color="#5aa0d8" />
      <Bird x={250} y={110} s={1.4} color="#f2c45c" flip />
      <Bird x={320} y={80} s={1.1} color="#b9a6eb" flip />
      <Palm x={60} y={215} />
      <Palm x={350} y={220} s={0.8} />
    </>
  ),
  "sulaiman-march": () => (
    <>
      <Sky kind="day" />
      <Sun x={340} y={50} />
      <Desert />
      <Flags y={190} />
      <Bird x={110} y={70} s={1} />
      <Bird x={150} y={56} s={0.9} color="#5aa0d8" />
      <Bird x={190} y={72} s={1} color="#f2c45c" />
      <Bird x={230} y={58} s={0.9} color="#b9a6eb" />
    </>
  ),
  "sulaiman-ant": () => (
    <>
      <Sky kind="day" />
      <Cloud x={40} y={30} s={0.8} />
      <Cloud x={280} y={20} s={0.7} />
      <rect x="-10" y="150" width="420" height="110" fill="#c9a27a" stroke={O} strokeWidth={SW} />
      <AntHill x={90} y={215} s={1.2} />
      <AntHill x={310} y={220} s={1} />
      <Ant x={200} y={200} s={2.2} />
      <Ant x={140} y={232} s={1} />
      <Ant x={260} y={236} s={1} flip />
      <Ant x={330} y={196} s={0.9} flip />
      <g fill="#fff" stroke={O} strokeWidth={2.5}>
        <path d="M220 130 Q220 110 250 110 L330 110 Q356 110 356 130 Q356 150 330 150 L262 150 L248 166 L250 150 Q220 150 220 130Z" />
      </g>
      <g fill={O}>
        <circle cx="268" cy="130" r="5" />
        <circle cx="288" cy="130" r="5" />
        <circle cx="308" cy="130" r="5" />
      </g>
    </>
  ),
  "sulaiman-valley": () => (
    <>
      <Sky kind="dusk" />
      <Sun x={200} y={150} r={34} />
      <Hills color="#c9a27a" back="#ddb98f" y={175} />
      <AntHill x={100} y={225} />
      <AntHill x={300} y={228} s={0.9} />
      <Ant x={160} y={234} s={1.2} />
      <Ant x={240} y={236} s={1.1} flip />
      <Flowers y={238} />
    </>
  ),

  "yunus-town": () => (
    <>
      <Sky kind="day" />
      <Sun x={320} y={55} />
      <Sea y={195} />
      <rect x="-10" y="150" width="250" height="50" fill="#e7c79a" stroke={O} strokeWidth={SW} />
      <House x={50} y={160} s={0.8} />
      <House x={120} y={160} s={0.9} color="#ead3ad" />
      <House x={190} y={160} s={0.75} />
      <Palm x={230} y={160} s={0.7} />
      <Ship x={330} y={205} s={0.6} />
    </>
  ),
  "yunus-ship": () => (
    <>
      <Sky kind="day" />
      <Cloud x={40} y={30} s={0.9} />
      <Cloud x={260} y={50} s={0.7} />
      <Ship x={200} y={180} s={1.2} />
      <Sea y={175} />
    </>
  ),
  "yunus-fish": () => (
    <>
      <rect width="400" height="250" fill="#2f6f9f" />
      <rect y="0" width="400" height="40" fill="#5aa0d8" />
      <BigFish x={230} y={140} s={1.1} open />
      <SmallFish x={60} y={60} />
      <SmallFish x={90} y={200} color="#f2c45c" />
      <SmallFish x={350} y={215} color="#f7a8b8" flip />
      <g fill="#ffffff" opacity={0.6}>
        <circle cx="330" cy="70" r="5" />
        <circle cx="342" cy="56" r="3" />
        <circle cx="336" cy="44" r="2" />
      </g>
    </>
  ),
  "yunus-dark": () => (
    <>
      <Sky kind="deep" />
      <Stars count={30} seed={7} maxY={110} />
      <Moon x={330} y={50} r={18} />
      <Sea y={150} dark />
      <BigFish x={210} y={200} s={0.8} />
    </>
  ),
  "yunus-shore": () => (
    <>
      <Sky kind="dawn" />
      <Sun x={320} y={70} />
      <Sea y={170} />
      <path d="M-10 200 Q120 170 260 190 Q330 200 410 185 L410 260 L-10 260Z" fill="#f1d39a" stroke={O} strokeWidth={SW} />
      <GourdPlant x={130} y={215} s={1.2} />
    </>
  ),
  "yunus-return": () => (
    <>
      <Sky kind="day" />
      <Sun x={60} y={50} />
      <Hills />
      <House x={90} y={200} s={0.8} lit />
      <House x={160} y={196} s={0.9} color="#ead3ad" lit />
      <House x={235} y={202} s={0.8} lit />
      <House x={305} y={198} s={0.9} lit />
      <Palm x={370} y={212} s={0.8} />
      <Flowers y={232} />
    </>
  ),

  "musa-home-night": () => (
    <>
      <Sky kind="night" />
      <Stars seed={2} />
      <Moon />
      <River y={190} />
      <House x={110} y={180} s={1.1} lit />
      <Palm x={200} y={182} s={0.8} />
    </>
  ),
  "musa-chest": () => (
    <>
      <Sky kind="dawn" />
      <Sun x={330} y={60} />
      <River y={170} />
      <Chest x={200} y={196} s={1.2} />
      <Reeds x={40} y={232} />
      <Reeds x={320} y={232} s={0.9} />
    </>
  ),
  "musa-palace": () => (
    <>
      <Sky kind="day" />
      <Sun x={60} y={50} />
      <River y={185} />
      <Palace x={250} y={170} s={1} />
      <Palm x={110} y={172} s={0.8} />
      <Chest x={150} y={210} s={0.9} />
    </>
  ),
  "musa-sister": () => (
    <>
      <Sky kind="dusk" />
      <River y={185} />
      <Palace x={300} y={170} s={0.8} />
      <Reeds x={60} y={236} />
      <Reeds x={150} y={236} s={0.8} />
      <Palm x={200} y={175} s={0.7} />
    </>
  ),
  "musa-reunited": () => (
    <>
      <Sky kind="night" />
      <Stars seed={5} />
      <Moon x={80} y={50} r={24} />
      <Hills color="#5d8f50" back="#4a7a44" />
      <House x={210} y={205} s={1.4} lit />
      <circle cx="210" cy="160" r="90" fill="#ffe7a3" opacity={0.12} />
    </>
  ),

  "ibrahim-valley": () => (
    <>
      <Sky kind="day" />
      <Sun x={330} y={50} />
      <Desert y={190} />
      <Palm x={120} y={215} s={0.7} />
      <Stones x={250} y={220} s={0.7} />
    </>
  ),
  "ibrahim-building": () => (
    <>
      <Sky kind="day" />
      <Sun x={70} y={50} />
      <Desert y={195} />
      <KaabaStone x={200} y={215} rows={4} />
      <Stones x={90} y={225} s={0.8} />
      <Stones x={320} y={228} s={0.7} />
    </>
  ),
  "ibrahim-dua": () => (
    <>
      <Sky kind="dusk" />
      <Desert y={195} />
      <KaabaStone x={200} y={215} rows={6} />
      <Stars count={8} seed={4} maxY={50} />
    </>
  ),
  "ibrahim-house": () => (
    <>
      <Sky kind="night" />
      <Stars seed={9} count={34} />
      <Moon x={330} y={45} />
      <Desert y={200} />
      <KaabaStone x={200} y={220} rows={7} />
      <Bird x={120} y={90} s={0.9} color="#e9e2d0" />
      <Bird x={290} y={110} s={0.8} color="#e9e2d0" flip />
    </>
  ),

  "adam-sky": () => (
    <>
      <Sky kind="night" />
      <Stars seed={11} count={40} maxY={150} />
      <LightRays />
      <path d="M-10 230 Q200 190 410 230 L410 260 L-10 260Z" fill="#3c5a8a" stroke={O} strokeWidth={SW} />
    </>
  ),
  "adam-names": () => (
    <>
      <Sky kind="day" />
      <Sun x={340} y={45} />
      <Hills />
      <Tree x={60} y={200} s={0.8} fruit />
      <Palm x={340} y={210} s={0.8} />
      <Elephant x={150} y={225} s={0.6} />
      <Giraffe x={230} y={228} s={0.6} flip />
      <Sheep x={290} y={234} s={0.6} />
      <Bird x={120} y={90} s={0.9} />
      <Bird x={210} y={70} s={0.8} color="#5aa0d8" />
      <SmallFish x={100} y={238} color="#5aa0d8" />
      <Flowers y={242} />
    </>
  ),
  "adam-light": () => (
    <>
      <Sky kind="night" />
      <Stars seed={13} count={30} />
      <LightRays />
      <circle cx="200" cy="140" r="70" fill="#fff6d0" opacity={0.18} />
    </>
  ),
  "adam-garden": () => (
    <>
      <Sky kind="day" />
      <Sun x={60} y={45} />
      <Hills color="#7fc163" back="#a3d78a" />
      <Tree x={110} y={205} s={0.8} fruit />
      <Tree x={300} y={210} s={0.8} fruit color="#5fa64d" />
      <Tree x={205} y={196} s={1.1} glow color="#4f9a46" />
      <Flowers y={236} />
    </>
  ),
  "adam-earth": () => (
    <>
      <Sky kind="dusk" />
      <Sun x={200} y={170} r={30} />
      <Hills color="#a8b06a" back="#c2c47e" />
      <Palm x={80} y={215} s={0.7} />
      <Mountain x={320} y={210} s={0.8} />
    </>
  ),
  "adam-sorry": () => (
    <>
      <Sky kind="dawn" />
      <Sun x={200} y={160} r={34} />
      <Hills color="#8cc56a" back="#a8d88a" />
      <Tree x={90} y={212} s={0.7} />
      <Tree x={320} y={214} s={0.6} />
      <Flowers y={238} />
    </>
  ),
};

export function Scene({ id }: { id: string }) {
  const render = SCENES[id];
  return <Frame>{render ? render() : <Sky kind="day" />}</Frame>;
}

/** Bedtime illustration (no figures). */
export function BedtimeScene() {
  return (
    <Frame>
      <Sky kind="night" />
      <Stars count={40} seed={21} maxY={170} />
      <Moon x={300} y={70} r={34} />
      <Hills color="#2c3f6e" back="#3a5085" y={190} />
      <House x={140} y={225} s={1.2} lit />
    </Frame>
  );
}
