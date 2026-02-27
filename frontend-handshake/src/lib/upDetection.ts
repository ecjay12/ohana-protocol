/**
 * Detect if an address is a Universal Profile (LSP0 ERC725Account) vs EOA.
 * Uses ERC165 interface detection and LSP3Profile key fallback.
 */

import { type Provider, Contract, getAddress, keccak256, toUtf8Bytes } from "ethers";

// ERC165 interface ID for LSP0 ERC725Account (from LUKSO LIPs)
const LSP0_INTERFACE_ID = "0x24871b3d";

// ERC165: supportsInterface(bytes4)
const ERC165_ABI = [
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
] as const;

// ERC725Y: getData(bytes32) - to check for LSP3Profile key
const ERC725Y_ABI = [
  "function getData(bytes32 dataKey) external view returns (bytes memory dataValue)",
] as const;

// LSP3Profile key: keccak256("LSP3Profile") - standard UP profile metadata key
const LSP3_PROFILE_KEY = keccak256(toUtf8Bytes("LSP3Profile"));

/**
 * Check if an address is a Universal Profile (contract with LSP0 interface).
 * @param provider Ethers provider
 * @param address Address to check
 * @returns true if address is a Universal Profile, false if EOA or other contract
 */
export async function isUniversalProfile(
  provider: Provider,
  address: string
): Promise<boolean> {
  try {
    const normalized = getAddress(address.trim());
    
    // Check if address has code (contract vs EOA)
    const code = await provider.getCode(normalized);
    if (code === "0x" || code === "0x0") {
      return false; // EOA
    }

    // Check ERC165 interface ID for LSP0 ERC725Account
    try {
      const contract = new Contract(normalized, ERC165_ABI, provider);
      const supportsLSP0 = await contract.supportsInterface(LSP0_INTERFACE_ID);
      if (supportsLSP0) return true;
    } catch {
      // Contract might not support ERC165, continue to next check
    }

    // Fallback: Check for LSP3Profile key existence (indicates UP)
    try {
      const up = new Contract(normalized, ERC725Y_ABI, provider);
      const lsp3Data = await up.getData(LSP3_PROFILE_KEY);
      if (lsp3Data && lsp3Data !== "0x" && lsp3Data.length > 2) {
        return true;
      }
    } catch {
      // Not a UP or doesn't support ERC725Y
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get Universal Profile information if available.
 * @param provider Ethers provider
 * @param address Address to check
 * @returns Object with isUP flag, or null if error
 */
export async function getUPInfo(
  provider: Provider,
  address: string
): Promise<{ isUP: boolean } | null> {
  try {
    const isUP = await isUniversalProfile(provider, address);
    return { isUP };
  } catch {
    return null;
  }
}
