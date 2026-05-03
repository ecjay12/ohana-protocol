import { describe, it, expect } from "vitest";
import { pickLuksoChain } from "@/hooks/useLuksoHandshakeChainInference";

describe("pickLuksoChain", () => {
  it("prefers the only chain with Handshake activity", () => {
    expect(pickLuksoChain(null, 3, 0)).toBe(42);
    expect(pickLuksoChain(null, 0, 2)).toBe(4201);
  });

  it("when Handshake on both, prefers mainnet", () => {
    expect(pickLuksoChain(null, 1, 5)).toBe(42);
  });

  it("uses deploy hint when no Handshake activity", () => {
    expect(pickLuksoChain(4201, 0, 0)).toBe(4201);
    expect(pickLuksoChain(42, 0, 0)).toBe(42);
  });

  it("defaults to mainnet when no hint and no activity", () => {
    expect(pickLuksoChain(null, 0, 0)).toBe(42);
  });
});
