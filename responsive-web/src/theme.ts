import { safeStorage } from "./storage";
/**
 * Light / dark theme preference. "system" follows the device setting.
 * The choice is stored on this device only. It is not personal data.
 */
export type ThemePref = "system" | "light" | "dark";

const KEY = "ds_theme";

export function getThemePref(): ThemePref {
  const v = safeStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

export function setThemePref(pref: ThemePref): void {
  if (pref === "system") safeStorage.removeItem(KEY);
  else safeStorage.setItem(KEY, pref);
  applyTheme(pref);
}
