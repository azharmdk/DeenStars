import { describe, expect, it } from "vitest";
import { dayKeyFor, isFridayDayKey, isValidTimeZone, monthKeyFromDayKey, weekKeyFromDayKey } from "../../src/lib/time";

describe("dayKeyFor", () => {
  it("uses the child's time zone, not UTC", () => {
    const instant = new Date("2025-01-31T23:30:00Z");
    expect(dayKeyFor(instant, "UTC")).toBe("2025-01-31");
    expect(dayKeyFor(instant, "Asia/Karachi")).toBe("2025-02-01"); // UTC+5
    expect(dayKeyFor(instant, "America/Los_Angeles")).toBe("2025-01-31");
  });

  it("handles daylight saving changes", () => {
    // US DST starts 2025-03-09 at 02:00 local. 07:30Z is 03:30 PDT on the 9th.
    expect(dayKeyFor(new Date("2025-03-09T07:30:00Z"), "America/Los_Angeles")).toBe("2025-03-08");
    expect(dayKeyFor(new Date("2025-03-09T10:30:00Z"), "America/Los_Angeles")).toBe("2025-03-09");
  });
});

describe("weekKeyFromDayKey (ISO weeks, Monday start)", () => {
  it("handles year boundaries", () => {
    expect(weekKeyFromDayKey("2024-12-30")).toBe("2025-W01");
    expect(weekKeyFromDayKey("2021-01-03")).toBe("2020-W53");
    expect(weekKeyFromDayKey("2025-01-05")).toBe("2025-W01"); // Sunday ends the week
    expect(weekKeyFromDayKey("2025-01-06")).toBe("2025-W02"); // Monday starts the next
  });
});

describe("misc", () => {
  it("monthKey", () => expect(monthKeyFromDayKey("2025-02-14")).toBe("2025-02"));
  it("isFriday", () => {
    expect(isFridayDayKey("2025-01-31")).toBe(true);
    expect(isFridayDayKey("2025-02-01")).toBe(false);
  });
  it("validates time zones", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
