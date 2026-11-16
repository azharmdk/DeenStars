/**
 * QE tester tools are hidden from ordinary users.
 * Turn them on by opening the app once with ?qe=1 (persists on that device). Turn off with ?qe=0.
 * The server-side Jummah override (DEV_ALLOW_JUMMAH_ANY_DAY) exists only in the dev project.
 */
const KEY = "ds_tester_tools";

function readFromUrl() {
  const qe = new URLSearchParams(window.location.search).get("qe");
  if (qe === "1") localStorage.setItem(KEY, "1");
  if (qe === "0") {
    localStorage.removeItem(KEY);
    localStorage.removeItem("ds_sim_friday");
  }
  if (qe !== null) {
    const url = new URL(window.location.href);
    url.searchParams.delete("qe");
    window.history.replaceState(null, "", url.toString());
  }
}

readFromUrl();

export const testerToolsEnabled = localStorage.getItem(KEY) === "1";
