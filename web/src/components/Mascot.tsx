/** "Noor" the star mascot: non-human, swappable (decision D-4). Decorative, hidden from screen readers. */
export function Mascot({ size = 120, mood = "happy" }: { size?: number; mood?: "happy" | "cheer" | "sleepy" }) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 48 : 22;
    points.push(`${50 + r * Math.cos(a)},${54 + r * Math.sin(a)}`);
  }
  const eyeY = mood === "sleepy" ? 52 : 50;
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={points.join(" ")} fill="#F6B51E" stroke="#D99A0B" strokeWidth="2.5" strokeLinejoin="round" />
      {mood === "sleepy" ? (
        <>
          <path d="M38 52 q4 3 8 0" stroke="#24313A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M54 52 q4 3 8 0" stroke="#24313A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="42" cy={eyeY} r="3.6" fill="#24313A" />
          <circle cx="58" cy={eyeY} r="3.6" fill="#24313A" />
          <circle cx="43.2" cy={eyeY - 1.2} r="1.1" fill="#fff" />
          <circle cx="59.2" cy={eyeY - 1.2} r="1.1" fill="#fff" />
        </>
      )}
      <circle cx="36" cy="60" r="3.5" fill="#FF7F6B" opacity="0.55" />
      <circle cx="64" cy="60" r="3.5" fill="#FF7F6B" opacity="0.55" />
      {mood === "cheer" ? (
        <path d="M43 59 q7 9 14 0 z" fill="#24313A" />
      ) : (
        <path d="M44 60 q6 5 12 0" stroke="#24313A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
