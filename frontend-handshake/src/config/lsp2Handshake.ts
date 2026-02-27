import { keccak256, toUtf8Bytes } from "ethers";

/** LSP2-style data key for Ohana Handshake reference on a Universal Profile. */
export const OHANA_HANDSHAKE_KEY = keccak256(toUtf8Bytes("OhanaHandshake"));

/** LSP2-style data key for Ohana hidden vouches list on a Universal Profile. */
export const OHANA_HIDDEN_VOUCHES_KEY = keccak256(toUtf8Bytes("OhanaHiddenVouches"));

export interface HandshakeReferenceValue {
  chainId: number;
  handshakeAddress: string;
  acceptedCount: number;
}

/** Encode Handshake reference as ERC725Y value (UTF-8 bytes of JSON string). */
export function encodeHandshakeReference(value: HandshakeReferenceValue): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

/** Decode ERC725Y value to Handshake reference. Returns null if invalid. */
export function decodeHandshakeReference(hexValue: string): HandshakeReferenceValue | null {
  if (!hexValue || hexValue === "0x") return null;
  try {
    let stripped = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
    if (stripped.length % 2 !== 0) stripped = "0" + stripped;
    const bytes = new Uint8Array(stripped.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as HandshakeReferenceValue;
    if (
      typeof parsed.chainId !== "number" ||
      typeof parsed.handshakeAddress !== "string" ||
      typeof parsed.acceptedCount !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface HiddenVouchesValue {
  vouchers: string[];
}

/** Encode hidden vouches list as ERC725Y value (UTF-8 bytes of JSON string). */
export function encodeHiddenVouches(value: HiddenVouchesValue): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

/** Decode ERC725Y value to hidden vouches list. Returns null if invalid. */
export function decodeHiddenVouches(hexValue: string): HiddenVouchesValue | null {
  if (!hexValue || hexValue === "0x") return null;
  try {
    let stripped = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
    if (stripped.length % 2 !== 0) stripped = "0" + stripped;
    const bytes = new Uint8Array(stripped.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as HiddenVouchesValue;
    if (!Array.isArray(parsed.vouchers)) return null;
    // Validate all vouchers are strings (addresses)
    if (!parsed.vouchers.every((v) => typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
