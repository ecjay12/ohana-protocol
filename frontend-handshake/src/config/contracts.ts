/**
 * Handshake (HandshakeProxy) addresses and chain list.
 * Source of truth: shared/chainConfig.json (used by frontend and api/vouches.js).
 */
import chainConfig from "../../shared/chainConfig.json";

const rawAddresses = chainConfig.handshakeAddresses as Record<string, string>;
export const HANDSHAKE_ADDRESSES: Record<number, string> = Object.fromEntries(
  Object.entries(rawAddresses).map(([k, v]) => [parseInt(k, 10), v])
) as Record<number, string>;

/** Chain IDs supported by Handshake (testnet + mainnet). */
export const HANDSHAKE_CHAIN_IDS = Object.keys(rawAddresses).map((k) => parseInt(k, 10)) as [number, ...number[]];

/**
 * Vouch fee per chain (anti-spam). Must match on-chain setFee().
 * Used for display; actual fee is read from contract in useHandshake.
 */
export const VOUCH_FEE_DISPLAY: Record<number, { amount: string; symbol: string }> = {
  1: { amount: "0.0009", symbol: "ETH" },       // Ethereum
  42: { amount: "0.1", symbol: "LYX" },         // LUKSO mainnet
  8453: { amount: "0.0009", symbol: "ETH" },   // Base mainnet
  4201: { amount: "0.1", symbol: "LYX" },      // LUKSO testnet
  84532: { amount: "0.0009", symbol: "ETH" },  // Base Sepolia
};

export function getHandshakeAddress(chainId: number): string | null {
  const addr = HANDSHAKE_ADDRESSES[chainId];
  return addr && addr.length > 0 ? addr : null;
}

/**
 * ERC-8004 Trustless Agents registry addresses (per chain).
 * Used to resolve agent identity/reputation for Handshake-backed agents.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */
export const ERC8004_IDENTITY_REGISTRY: Record<number, string> = {
  1: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",     // Ethereum Mainnet
  8453: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",  // Base Mainnet
  84532: "0x8004A818BFB912233c491871b3d84c89A494BD9e", // Base Sepolia
};

export const ERC8004_REPUTATION_REGISTRY: Record<number, string> = {
  1: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",     // Ethereum Mainnet
  8453: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",  // Base Mainnet
  84532: "0x8004B663056A597Dffe9eCcC1965A193B7388713", // Base Sepolia
};

export function getERC8004IdentityAddress(chainId: number): string | null {
  const addr = ERC8004_IDENTITY_REGISTRY[chainId];
  return addr && addr.length > 0 ? addr : null;
}

export function getERC8004ReputationAddress(chainId: number): string | null {
  const addr = ERC8004_REPUTATION_REGISTRY[chainId];
  return addr && addr.length > 0 ? addr : null;
}
