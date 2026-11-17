import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Gallery } from "./screens/Gallery";
import { applyTheme, getThemePref } from "./theme";
import "./styles.css";

applyTheme(getThemePref());

const gallery = import.meta.env.DEV && new URLSearchParams(window.location.search).get("gallery") === "scenes";

createRoot(document.getElementById("root")!).render(<StrictMode>{gallery ? <Gallery /> : <App />}</StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
