/**
 * Serverless read API: GET /api/vouches?chainId=4201&address=0x...
 * Returns { acceptedCount, vouchers[] }. No auth; short cache recommended.
 * Chain/handshake config from shared/chainConfig.json (single source of truth).
 */

import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { handshakeAddresses, chains } = require("../shared/chainConfig.json");

const HANDSHAKE_ADDRESSES = Object.fromEntries(
  Object.entries(handshakeAddresses).map(([k, v]) => [parseInt(k, 10), v])
);
const RPC = Object.fromEntries(
  Object.entries(chains).map(([k, v]) => [parseInt(k, 10), v.rpc])
);

const HANDSHAKE_ABI = [
  "function acceptedCount(address target) view returns (uint256)",
  "function getVouchersFor(address target) view returns (address[])",
];

const CACHE_SECONDS = 60;

const ALLOWED_CHAIN_IDS = new Set(
  Object.keys(handshakeAddresses).map((k) => parseInt(k, 10))
);

function getHandshakeAddress(chainId) {
  if (!ALLOWED_CHAIN_IDS.has(chainId)) return null;
  const addr = HANDSHAKE_ADDRESSES[chainId];
  return addr && addr.length > 0 ? addr : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const chainId = parseInt(req.query.chainId ?? "4201", 10);
  const addressParam = req.query.address?.trim();
  if (!addressParam || addressParam.length > 42) {
    return res.status(400).json({ error: "Missing or invalid address" });
  }
  let address;
  try {
    address = getAddress(addressParam);
  } catch {
    return res.status(400).json({ error: "Invalid address" });
  }
  if (Number.isNaN(chainId) || !ALLOWED_CHAIN_IDS.has(chainId)) {
    return res.status(400).json({ error: "Invalid or unsupported chainId" });
  }
  const contractAddress = getHandshakeAddress(chainId);
  const rpc = RPC[chainId];
  if (!contractAddress || !rpc) {
    return res.status(400).json({ error: "Unsupported chain" });
  }
  try {
    const provider = new JsonRpcProvider(rpc);
    const contract = new Contract(contractAddress, HANDSHAKE_ABI, provider);
    const [acceptedCount, vouchers] = await Promise.all([
      contract.acceptedCount(address),
      contract.getVouchersFor(address),
    ]);
    const result = {
      acceptedCount: Number(acceptedCount),
      vouchers: vouchers.map((a) => a.toLowerCase()),
    };
    res.setHeader("Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`);
    return res.status(200).json(result);
  } catch (e) {
    console.error("vouches API error:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to fetch" });
  }
}
