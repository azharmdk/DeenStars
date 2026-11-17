import { SCENES, Scene, BedtimeScene } from "../components/scenes";

/** Dev-only visual QA page: /?gallery=scenes. Not linked from the app. */
export function Gallery() {
  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, background: "#f7f5f0" }}>
      {Object.keys(SCENES).map((id) => (
        <figure key={id} style={{ margin: 0 }}>
          <Scene id={id} />
          <figcaption style={{ font: "12px sans-serif", marginTop: 4 }}>{id}</figcaption>
        </figure>
      ))}
      <figure style={{ margin: 0 }}>
        <BedtimeScene />
        <figcaption style={{ font: "12px sans-serif", marginTop: 4 }}>bedtime</figcaption>
      </figure>
    </div>
  );
}
