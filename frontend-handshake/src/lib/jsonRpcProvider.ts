import { JsonRpcProvider } from "ethers";

/**
 * Public RPCs (notably Base mainnet) reject large JSON-RPC batches (-32014 "maximum N calls in 1 batch").
 * Ethers v6 defaults to batchMaxCount=100; keep batches tiny to stay under strict limits.
 */
export function createJsonRpcProvider(rpcUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(rpcUrl, undefined, {
    batchMaxCount: 1,
    batchStallTime: 0,
  });
}
