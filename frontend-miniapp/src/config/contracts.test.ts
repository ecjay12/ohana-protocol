import { describe, it, expect } from "vitest";
import chainConfig from "@shared/chainConfig.json";

describe("contracts config", () => {
  it("loads chain config with LUKSO chains", () => {
    expect(chainConfig.chains).toBeDefined();
    expect(chainConfig.chains["42"]).toEqual({ name: "LUKSO", rpc: "https://rpc.mainnet.lukso.network" });
    expect(chainConfig.chains["4201"]).toEqual({ name: "LUKSO Testnet", rpc: "https://rpc.testnet.lukso.network" });
  });

  it("has handshake addresses for expected chains", () => {
    expect(chainConfig.handshakeAddresses).toBeDefined();
    expect(typeof chainConfig.handshakeAddresses["4201"]).toBe("string");
  });
});
