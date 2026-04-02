import { JsonRpcProvider } from "ethers";

/**
 * Public RPCs (notably Base mainnet) reject large JSON-RPC batches (-32014 "maximum N calls in 1 batch").
 * Ethers v6 defaults to batchMaxCount=100; keep batches tiny to stay under strict limits.
 *
 * Reuse one JsonRpcProvider per RPC URL so every hook/component does not open a separate connection
 * (reduces duplicate eth_* traffic and 429s from Alchemy-style limits).
 */
const jsonRpcByUrl = new Map<string, JsonRpcProvider>();

export function createJsonRpcProvider(rpcUrl: string): JsonRpcProvider {
  let p = jsonRpcByUrl.get(rpcUrl);
  if (!p) {
    p = new JsonRpcProvider(rpcUrl, undefined, {
      batchMaxCount: 1,
      batchStallTime: 0,
    });
    jsonRpcByUrl.set(rpcUrl, p);
  }
  return p;
}
