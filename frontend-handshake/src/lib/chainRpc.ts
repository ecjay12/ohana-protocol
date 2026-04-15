/**
 * Resolve JSON-RPC URL per chain: optional Vite env overrides, then shared/chainConfig.json.
 * Use for read-only providers so production can point Base/LUKSO at dedicated endpoints (fewer 429s).
 */
import chainConfig from "../../shared/chainConfig.json";

const chainsRaw = chainConfig.chains as Record<string, { name: string; rpc: string }>;

export function getRpcUrlForChain(chainId: number): string {
  const envOverrides: Record<number, string | undefined> = {
    1: import.meta.env.VITE_RPC_ETHEREUM,
    42: import.meta.env.VITE_RPC_LUKSO,
    4201: import.meta.env.VITE_RPC_LUKSO_TESTNET,
    8453: import.meta.env.VITE_RPC_BASE,
    84532: import.meta.env.VITE_RPC_BASE_SEPOLIA,
  };
  const o = envOverrides[chainId];
  if (typeof o === "string") {
    const t = o.trim();
    if (t.startsWith("http")) return t;
  }
  return chainsRaw[String(chainId)]?.rpc ?? "";
}
