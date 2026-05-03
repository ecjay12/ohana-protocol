import { describe, it, expect } from "vitest";
import {
  formatReadStatsError,
  formatTransactionError,
  formatWalletConnectError,
  userFacingHandshakeError,
} from "./miniappUserErrors";

describe("miniappUserErrors", () => {
  it("maps opaque revert strings to branded tx copy", () => {
    const msg = formatTransactionError(new Error("missing revert data"));
    expect(msg).toMatch(/^\[Handshake miniapp\]/);
    expect(msg.toLowerCase()).not.toContain("missing revert data");
  });

  it("maps opaque read errors to branded stats copy", () => {
    expect(formatReadStatsError(new Error("revert data missing"))).toMatch(/^\[Handshake miniapp\]/);
  });

  it("formats wallet rejection", () => {
    expect(formatWalletConnectError(new Error("user rejected the request"))).toMatch(/cancelled/i);
  });

  it("userFacingHandshakeError normalizes stored opaque strings", () => {
    const u = userFacingHandshakeError("Error: could not coalesce error (missing revert data)");
    expect(u).toMatch(/^\[Handshake miniapp\]/);
  });
});
