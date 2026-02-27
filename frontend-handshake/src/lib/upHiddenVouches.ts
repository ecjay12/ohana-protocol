/**
 * Read and write Ohana hidden vouches list on a Universal Profile (ERC725Y).
 * Uses LSP2 key OhanaHiddenVouches; write via LSP6 Key Manager execute.
 */

import { Contract, type Provider, type Signer, getAddress } from "ethers";
import {
  OHANA_HIDDEN_VOUCHES_KEY,
  encodeHiddenVouches,
  decodeHiddenVouches,
  type HiddenVouchesValue,
} from "@/config/lsp2Handshake";

// ERC725Y: getData(bytes32) for single key; setData(bytes32[], bytes[])
const ERC725Y_ABI = [
  "function getData(bytes32 dataKey) external view returns (bytes memory dataValue)",
  "function setData(bytes32[] memory dataKeys, bytes[] memory dataValues) external payable",
  "function owner() external view returns (address)",
] as const;

// LSP6 Key Manager: execute(bytes payload)
const LSP6_ABI = [
  "function execute(bytes memory payload) external payable returns (bytes memory)",
] as const;

/**
 * Read hidden vouches list stored on a Universal Profile.
 * Returns empty array if not set or invalid.
 */
export async function getHiddenVouchesFromUP(
  provider: Provider,
  upAddress: string
): Promise<string[]> {
  try {
    const normalized = getAddress(upAddress.trim());
    const up = new Contract(normalized, ERC725Y_ABI, provider);
    const hexValue = await up.getData(OHANA_HIDDEN_VOUCHES_KEY);
    if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return [];
    const decoded = decodeHiddenVouches(hexValue);
    if (!decoded) return [];
    // Normalize addresses
    return decoded.vouchers.map((v) => getAddress(v.toLowerCase()));
  } catch {
    return [];
  }
}

/**
 * Write hidden vouches list to a Universal Profile.
 * Signer must be the EOA that has SETDATA permission (e.g. via Key Manager).
 * Gets Key Manager from UP.owner(), then calls KeyManager.execute(setDataCalldata).
 */
export async function setHiddenVouchesOnUP(
  signer: Signer,
  upAddress: string,
  vouchers: string[]
): Promise<void> {
  // Normalize and validate addresses
  const normalizedVouchers = vouchers.map((v) => getAddress(v.trim().toLowerCase()));
  const normalizedUP = getAddress(upAddress.trim());
  
  const payload: HiddenVouchesValue = { vouchers: normalizedVouchers };
  const encodedValue = encodeHiddenVouches(payload);
  
  const up = new Contract(normalizedUP, ERC725Y_ABI, signer);
  const keyManagerAddress = await up.owner();
  const setDataCalldata = up.interface.encodeFunctionData("setData", [
    [OHANA_HIDDEN_VOUCHES_KEY],
    [encodedValue],
  ]);
  const keyManager = new Contract(keyManagerAddress, LSP6_ABI, signer);
  await keyManager.execute(setDataCalldata);
}

/**
 * Add a voucher to the hidden list on UP.
 */
export async function addHiddenVoucherToUP(
  signer: Signer,
  upAddress: string,
  voucher: string
): Promise<void> {
  const provider = signer.provider;
  if (!provider) throw new Error("Signer must have provider");
  
  const current = await getHiddenVouchesFromUP(provider, upAddress);
  const normalizedVoucher = getAddress(voucher.trim().toLowerCase());
  
  // Avoid duplicates
  if (current.includes(normalizedVoucher)) return;
  
  await setHiddenVouchesOnUP(signer, upAddress, [...current, normalizedVoucher]);
}

/**
 * Remove a voucher from the hidden list on UP.
 */
export async function removeHiddenVoucherFromUP(
  signer: Signer,
  upAddress: string,
  voucher: string
): Promise<void> {
  const provider = signer.provider;
  if (!provider) throw new Error("Signer must have provider");
  
  const current = await getHiddenVouchesFromUP(provider, upAddress);
  const normalizedVoucher = getAddress(voucher.trim().toLowerCase());
  
  const filtered = current.filter((v) => v.toLowerCase() !== normalizedVoucher.toLowerCase());
  await setHiddenVouchesOnUP(signer, upAddress, filtered);
}
