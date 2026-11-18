import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Gallery } from "./screens/Gallery";
import { UiGallery } from "./screens/UiGallery";
import { applyTheme, getThemePref } from "./theme";
import "./styles.css";

applyTheme(getThemePref());

const params = new URLSearchParams(window.location.search);
const gallery = import.meta.env.DEV ? params.get("gallery") : null;
if (gallery && params.get("theme")) applyTheme(params.get("theme") === "dark" ? "dark" : "light");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{gallery === "scenes" ? <Gallery /> : gallery === "ui" ? <UiGallery /> : <App />}</StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
