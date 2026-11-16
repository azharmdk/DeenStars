import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "../../src/lib/pin";

describe("pin hashing", () => {
  it("verifies the right PIN and rejects a wrong one", async () => {
    const record = await hashPin("1234");
    expect(await verifyPin("1234", record)).toBe(true);
    expect(await verifyPin("1235", record)).toBe(false);
  });

  it("uses a different salt each time and never stores the PIN", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(JSON.stringify(a)).not.toContain("1234");
  });
});
