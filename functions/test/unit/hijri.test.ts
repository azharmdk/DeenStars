import { describe, expect, it } from "vitest";
import { countryForTimeZone, hijriForDayKey, seasonFor, totalAdjust } from "../../src/lib/hijri";

describe("hijri", () => {
  it("follows the Umm al-Qura calendar", () => {
    // Umm al-Qura: 1 Ramadan 1448 falls on 2027-02-08.
    const h = hijriForDayKey("2027-02-08");
    expect(h.month).toBe(9);
    expect(h.day).toBe(1);
    expect(seasonFor(h)).toEqual({ kind: "ramadan", day: 1 });
  });

  it("applies regional adjustments (a later start shifts the date back)", () => {
    expect(hijriForDayKey("2027-02-08", -1).month).toBe(8);
    expect(hijriForDayKey("2027-02-09", -1)).toMatchObject({ month: 9, day: 1 });
  });

  it("detects Eid", () => {
    // 1 Shawwal comes 29 or 30 days after 1 Ramadan.
    let d = "2027-02-08";
    for (let i = 0; i < 31 && hijriForDayKey(d).month !== 10; i++) d = new Date(Date.parse(`${d}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
    expect(seasonFor(hijriForDayKey(d))).toEqual({ kind: "eidFitr", day: 1 });
  });

  it("maps time zones to countries and limits adjustments", () => {
    expect(countryForTimeZone("Asia/Kolkata")).toBe("IN");
    expect(countryForTimeZone("America/Chicago")).toBe("US");
    expect(totalAdjust({ defaultAdjust: 0, adjustByCountry: { IN: -1 } }, "IN", 0)).toBe(-1);
    expect(totalAdjust({ defaultAdjust: 0, adjustByCountry: {} }, "US", 5)).toBe(1);
  });
});
