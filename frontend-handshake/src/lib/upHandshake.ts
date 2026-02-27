/**
 * Read and write Ohana Handshake reference on a Universal Profile (ERC725Y).
 * Uses LSP2 key OhanaHandshake; write via LSP6 Key Manager execute.
 * Supports adding OhanaHandshake to the controller's AllowedERC725YDataKeys when missing.
 */

import { Contract, type Provider, type Signer } from "ethers";
import { getHandshakeAddress } from "@/config/contracts";
import {
  OHANA_HANDSHAKE_KEY,
  encodeHandshakeReference,
  decodeHandshakeReference,
  type HandshakeReferenceValue,
} from "@/config/lsp2Handshake";

// ERC725Y: getData(bytes32); setData(bytes32[], bytes[]) batch form used by LSP6 execute (matches upHiddenVouches)
const ERC725Y_ABI = [
  "function getData(bytes32 dataKey) external view returns (bytes memory dataValue)",
  "function setData(bytes32[] memory dataKeys, bytes[] memory dataValues) external payable",
  "function owner() external view returns (address)",
] as const;

// LSP6 Key Manager: execute(bytes payload)
const LSP6_ABI = [
  "function execute(bytes memory payload) external payable returns (bytes memory)",
] as const;

/** LSP6 data key prefix for AddressPermissions:AllowedERC725YDataKeys (10 bytes + 2 zero bytes = 12 bytes in hex). */
const LSP6_ALLOWED_ERC725Y_KEYS_PREFIX = "0x4b80742de2bf866c29110000";

/**
 * Build the LSP6 ERC725Y data key for AddressPermissions:AllowedERC725YDataKeys:<address>.
 * Key = prefix (12 bytes) + address (20 bytes) = 32 bytes.
 */
export function getLSP6AllowedERC725YDataKeysKey(controllerAddress: string): string {
  const addr = controllerAddress.slice(2).toLowerCase().padStart(40, "0");
  return (LSP6_ALLOWED_ERC725Y_KEYS_PREFIX + addr).toLowerCase();
}

/**
 * Decode LSP2 CompactBytesArray of bytes32 (each element: 2-byte length + data).
 * Returns array of hex strings (each 32 bytes = 64 hex chars).
 */
function decodeCompactBytesArrayOfBytes32(hexValue: string): string[] {
  if (!hexValue || hexValue === "0x" || hexValue.length < 4) return [];
  let hex = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  if (hex.length % 2 !== 0) hex = "0" + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const keys: string[] = [];
  let pointer = 0;
  while (pointer + 2 <= bytes.length) {
    const length = (bytes[pointer] << 8) | bytes[pointer + 1];
    pointer += 2;
    if (length === 0 || length > 32 || pointer + length > bytes.length) break;
    const keyBytes = bytes.slice(pointer, pointer + length);
    const keyHex =
      "0x" +
      Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .padEnd(64, "0")
        .slice(0, 64);
    keys.push(keyHex);
    pointer += length;
  }
  return keys;
}

/**
 * Encode an array of bytes32 keys into LSP2 CompactBytesArray (2-byte length + data per element).
 */
function encodeCompactBytesArrayOfBytes32(keys: string[]): string {
  const parts: Uint8Array[] = [];
  for (const k of keys) {
    let hex = k.startsWith("0x") ? k.slice(2) : k;
    if (hex.length < 64) hex = hex.padStart(64, "0");
    if (hex.length > 64) hex = hex.slice(0, 64);
    const len = 32;
    const lenBytes = new Uint8Array(2);
    lenBytes[0] = (len >> 8) & 0xff;
    lenBytes[1] = len & 0xff;
    const data = new Uint8Array(32);
    for (let i = 0; i < 32; i++) data[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    parts.push(lenBytes, data);
  }
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return "0x" + Array.from(out).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Read Handshake reference stored on a Universal Profile.
 */
export async function getHandshakeReference(
  provider: Provider,
  upAddress: string
): Promise<HandshakeReferenceValue | null> {
  const up = new Contract(upAddress, ERC725Y_ABI, provider);
  const hexValue = await up.getData(OHANA_HANDSHAKE_KEY);
  if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return null;
  return decodeHandshakeReference(hexValue);
}

/**
 * Add OhanaHandshake to the controller's AllowedERC725YDataKeys on the UP (if not already present).
 * Caller must have EDITPERMISSIONS (or ADMIN) on the UP. No-op if key is already allowed.
 * Returns true if the key was added (or already present), false if we could not add it.
 */
export async function ensureOhanaKeyAllowed(
  signer: Signer,
  upAddress: string
): Promise<{ added: boolean; error?: string }> {
  const controllerAddress = await signer.getAddress();
  const lsp6Key = getLSP6AllowedERC725YDataKeysKey(controllerAddress);
  const up = new Contract(upAddress, ERC725Y_ABI, signer);
  const keyManagerAddress = await up.owner();
  const currentValue = await up.getData(lsp6Key);

  const keys = decodeCompactBytesArrayOfBytes32(currentValue);
  const ohanaKeyNorm = OHANA_HANDSHAKE_KEY.toLowerCase().slice(0, 66);
  const alreadyPresent = keys.some(
    (k) => k.toLowerCase().slice(0, 66) === ohanaKeyNorm
  );
  if (alreadyPresent) return { added: true };

  const newKeys = [...keys.map((k) => (k.length === 66 ? k : "0x" + k.slice(2).padStart(64, "0"))), OHANA_HANDSHAKE_KEY];
  const newValue = encodeCompactBytesArrayOfBytes32(newKeys);
  const setDataCalldata = up.interface.encodeFunctionData("setData", [
    [lsp6Key],
    [newValue],
  ]);
  const keyManager = new Contract(keyManagerAddress, LSP6_ABI, signer);
  try {
    await keyManager.execute(setDataCalldata);
    return { added: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { added: false, error: msg };
  }
}

/**
 * Write Handshake reference to a Universal Profile.
 * Signer must be the EOA that has SETDATA permission and OhanaHandshake in AllowedERC725YDataKeys
 * (or SUPER_SETDATA). Use ensureOhanaKeyAllowed() first if the key is not yet allowed.
 * Uses single-key setData(bytes32, bytes) as expected by LSP6 execute.
 */
export async function setHandshakeReference(
  signer: Signer,
  upAddress: string,
  payload: HandshakeReferenceValue
): Promise<void> {
  const up = new Contract(upAddress, ERC725Y_ABI, signer);
  const keyManagerAddress = await up.owner();
  const encodedValue = encodeHandshakeReference(payload);
  const setDataCalldata = up.interface.encodeFunctionData("setData", [
    [OHANA_HANDSHAKE_KEY],
    [encodedValue],
  ]);
  const keyManager = new Contract(keyManagerAddress, LSP6_ABI, signer);
  await keyManager.execute(setDataCalldata);
}

/**
 * Build Handshake reference payload from chain and current accepted count.
 */
export function buildHandshakeReferencePayload(
  chainId: number,
  acceptedCount: number
): HandshakeReferenceValue | null {
  const handshakeAddress = getHandshakeAddress(chainId);
  if (!handshakeAddress) return null;
  return { chainId, handshakeAddress, acceptedCount };
}
