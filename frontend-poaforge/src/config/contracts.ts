/**
 * POAP Forge addresses per chain.
 */
export const POAPFORGE_ADDRESSES: Record<number, string> = {
  4201: "0xe771DaE7AEf858201d669950869bCae06f6b038c",   // LUKSO Testnet
  84532: "0x6b9E81Fe62619678362565e9DB6f7249af743d21",  // Base Sepolia
};

export function getPOAPForgeAddress(chainId: number): string | null {
  return POAPFORGE_ADDRESSES[chainId] ?? null;
}
