import { afterEach, describe, expect, it, vi } from "vitest";
import { newRequestId } from "../src/id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const realCrypto = globalThis.crypto;
afterEach(() => vi.unstubAllGlobals());

describe("newRequestId", () => {
  it("uses randomUUID when present", () => expect(newRequestId()).toMatch(UUID));
  it("falls back to getRandomValues", () => {
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => realCrypto.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 50 }, () => newRequestId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID);
  });
  it("falls back to Math.random with no crypto at all", () => {
    vi.stubGlobal("crypto", undefined);
    expect(newRequestId()).toMatch(UUID);
  });
});

describe("safeStorage", () => {
  it("works from memory when localStorage throws", async () => {
    vi.resetModules();
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    const { safeStorage } = await import("../src/storage");
    expect(safeStorage.getItem("k")).toBeNull();
    safeStorage.setItem("k", "v");
    expect(safeStorage.getItem("k")).toBe("v");
    safeStorage.removeItem("k");
    expect(safeStorage.getItem("k")).toBeNull();
  });
  it("uses localStorage when available", async () => {
    vi.resetModules();
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    });
    const { safeStorage } = await import("../src/storage");
    safeStorage.setItem("a", "1");
    expect(store.get("a")).toBe("1");
  });
});